from __future__ import annotations

import json
import math
import re
from pathlib import Path

from .context import Embedder
from .repository import EvidenceRepositoryProtocol
from .schemas import ContextProfile, EvidenceItem, RetrievalResult


STOP_WORDS = set(
    "a an the i my me we our you your they their them he she it its is are was were be been "
    "do did does have has had to of for in on at and or but with without that this these those "
    "said says say reply replied after before about from as not no by can could would should what "
    "how when why who will just really very still already someone".split()
)
DISTINCTIVE = {"bojio", "makan", "meh", "shiok", "accent", "lah"}


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower())) - STOP_WORDS


def _cosine(left: list[float], right: list[float]) -> float:
    denom = math.sqrt(sum(x * x for x in left)) * math.sqrt(sum(x * x for x in right))
    return sum(a * b for a, b in zip(left, right)) / denom if denom else 0.0


def reciprocal_rank_fusion(rankings: list[list[str]], k: int = 60) -> list[str]:
    scores: dict[str, float] = {}
    best_rank: dict[str, int] = {}
    for ranking in rankings:
        for rank, item_id in enumerate(ranking, start=1):
            scores[item_id] = scores.get(item_id, 0.0) + 1 / (k + rank)
            best_rank[item_id] = min(best_rank.get(item_id, rank), rank)
    return sorted(scores, key=lambda item_id: (-scores[item_id], best_rank[item_id], item_id))


class CardRepository:
    def __init__(self, path: Path):
        self.path = Path(path)
        payload = json.loads(self.path.read_text(encoding="utf-8"))
        self.cards = payload["cards"]
        self.sources = {item["id"]: item for item in payload.get("sources", [])}

    def eligible_cards(self) -> list[dict]:
        eligible = []
        for card in self.cards:
            status = card.get("provenance", {}).get("review_status", "")
            if status == "synthetic_unreviewed" or card.get("provenance", {}).get("approved_for_verified_retrieval"):
                eligible.append(card)
        return eligible


class HybridRetriever:
    def __init__(self, repository: CardRepository | EvidenceRepositoryProtocol, embedder: Embedder | None = None):
        self.repository = repository
        self.embedder = embedder

    def search(self, query: str, profile: ContextProfile, limit: int = 3) -> RetrievalResult:
        cards = self.repository.eligible_cards()
        query_tokens = _tokens(query)
        raw = " ".join(re.findall(r"[a-z0-9]+", query.lower()))
        lexical: list[tuple[float, dict, list[str]]] = []
        for card in cards:
            fields = {
                "title": card.get("title", ""),
                "expression": card.get("expression_or_event", ""),
                "scenario": card.get("scenario", ""),
                "tags": " ".join(card.get("tags", [])),
            }
            overlaps = {name: query_tokens & _tokens(value) for name, value in fields.items()}
            overlap = set().union(*overlaps.values())
            phrase = " ".join(re.findall(r"[a-z0-9]+", fields["expression"].lower()))
            exact = bool(phrase and re.search(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", raw))
            distinctive = overlap & DISTINCTIVE
            if not exact and not distinctive and len(overlap) < 3:
                continue
            score = len(overlap) + 12 * exact + 8 * len(distinctive)
            matched = [name for name, values in overlaps.items() if values]
            lexical.append((score, card, matched))
        lexical.sort(key=lambda row: (-row[0], row[1]["id"]))
        lexical_ids = [row[1]["id"] for row in lexical]

        semantic_ids: list[str] = []
        fallback_reason = None
        if self.embedder and cards:
            try:
                query_vector = self.embedder.embed_query(query)
                texts = [" ".join([c.get("title", ""), c.get("expression_or_event", ""), " ".join(c.get("tags", []))]) for c in cards]
                vectors = self.embedder.embed_documents(texts)
                semantic_ids = [card["id"] for _, card in sorted(
                    ((_cosine(query_vector, vector), card) for card, vector in zip(cards, vectors)),
                    key=lambda row: (-row[0], row[1]["id"]),
                ) if _ > 0][: max(limit * 2, 6)]
            except Exception:
                fallback_reason = "semantic_retrieval_unavailable"

        if semantic_ids and lexical_ids:
            fused_ids = reciprocal_rank_fusion([lexical_ids, semantic_ids])
            mode = "hybrid"
        else:
            fused_ids = lexical_ids
            mode = "lexical_fallback" if fallback_reason else "lexical"

        by_id = {card["id"]: card for card in cards}
        matched_by_id = {row[1]["id"]: row[2] for row in lexical}
        items = []
        for card_id in fused_ids[:limit]:
            if card_id not in lexical_ids:
                continue
            card = by_id[card_id]
            provenance = card.get("provenance", {})
            items.append(EvidenceItem(
                card_id=card_id,
                version=provenance.get("version", "seed-v1"),
                title=card["title"],
                scenario_family=card["category"],
                matched_fields=matched_by_id.get(card_id, []),
                evidence_status=provenance.get("review_status", "unknown"),
                lexical_rank=lexical_ids.index(card_id) + 1 if card_id in lexical_ids else None,
                semantic_rank=semantic_ids.index(card_id) + 1 if card_id in semantic_ids else None,
                fusion_rank=len(items) + 1,
                evidence_limit=card.get("evidence_scope", ""),
                source_ids=card.get("source_ids", []),
                possible_interpretations=card.get("possible_interpretations", []),
                missing_context=card.get("missing_context", []),
                do_not_assume=card.get("do_not_assume", ""),
            ))
        return RetrievalResult(items=items, mode=mode, fallback_reason=fallback_reason)

