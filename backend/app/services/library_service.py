"""Library service for browsing and filtering scenario cards."""

from __future__ import annotations

from typing import Any
from app.repositories.evidence import UnifiedEvidenceRepository


class LibraryService:
    def __init__(self, evidence_repo: UnifiedEvidenceRepository):
        self.evidence_repo = evidence_repo

    def list_cards(
        self,
        scenario_family: str | None = None,
        relationship: str | None = None,
        channel: str | None = None,
        formality: str | None = None,
        evidence_level: str | None = None,
        query: str | None = None,
        limit: int = 20,
        cursor: int = 0,
    ) -> dict[str, Any]:
        all_cards = self.evidence_repo.eligible_cards()

        # Compute facets on all eligible cards
        facets: dict[str, dict[str, int]] = {
            "scenario_family": {},
            "relationship": {},
            "channel": {},
            "formality": {},
            "evidence_level": {},
        }
        for card in all_cards:
            cat = card.get("category", "")
            rel = card.get("relationship", "")
            chn = card.get("channel", "")
            frm = card.get("formality", "")
            prov_label = card.get("provenance", {}).get("label") or card.get("provenance", {}).get("review_status", "")
            if prov_label == "synthetic_unreviewed":
                prov_label = "Synthetic seed"
            elif prov_label == "approved":
                prov_label = "Community-reviewed"

            if cat:
                facets["scenario_family"][cat] = facets["scenario_family"].get(cat, 0) + 1
            if rel:
                facets["relationship"][rel] = facets["relationship"].get(rel, 0) + 1
            if chn:
                facets["channel"][chn] = facets["channel"].get(chn, 0) + 1
            if frm:
                facets["formality"][frm] = facets["formality"].get(frm, 0) + 1
            if prov_label:
                facets["evidence_level"][prov_label] = facets["evidence_level"].get(prov_label, 0) + 1

        # Apply filters
        filtered = []
        q_lower = query.strip().lower() if query else ""
        for card in all_cards:
            cat = card.get("category", "")
            rel = card.get("relationship", "")
            chn = card.get("channel", "")
            frm = card.get("formality", "")
            prov_label = card.get("provenance", {}).get("label") or card.get("provenance", {}).get("review_status", "")
            if prov_label == "synthetic_unreviewed":
                prov_label = "Synthetic seed"
            elif prov_label == "approved":
                prov_label = "Community-reviewed"

            if scenario_family and cat.lower() != scenario_family.strip().lower():
                continue
            if relationship and rel.lower() != relationship.strip().lower():
                continue
            if channel and chn.lower() != channel.strip().lower():
                continue
            if formality and frm.lower() != formality.strip().lower():
                continue
            if evidence_level and prov_label.lower() != evidence_level.strip().lower():
                continue
            if q_lower:
                text_corpus = f"{card.get('title', '')} {card.get('expression_or_event', '')} {card.get('scenario', '')} {' '.join(card.get('tags', []))}".lower()
                if q_lower not in text_corpus:
                    continue

            filtered.append({
                "id": card.get("id"),
                "title": card.get("title"),
                "expression": card.get("expression_or_event", ""),
                "scenario": card.get("scenario", ""),
                "scenario_family": cat,
                "relationship": rel,
                "channel": chn,
                "formality": frm,
                "provenance": prov_label,
                "do_not_assume": card.get("do_not_assume", ""),
                "safe_action": card.get("safe_action", ""),
                "evidence_scope": card.get("evidence_scope", ""),
                "tags": card.get("tags", []),
            })

        total = len(filtered)
        paginated = filtered[cursor : cursor + limit]
        return {
            "cards": paginated,
            "total": total,
            "cursor": cursor,
            "limit": limit,
            "facets": facets,
        }
