"""Unified evidence repository merging synthetic seed cards and active approved community cards."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.database import Database


class UnifiedEvidenceRepository:
    def __init__(self, seed_path: str | Path, db: Database):
        self.seed_path = Path(seed_path)
        self.db = db
        payload = json.loads(self.seed_path.read_text(encoding="utf-8"))
        self.seed_cards = payload.get("cards", [])
        self.sources = {item["id"]: item for item in payload.get("sources", [])}

    def eligible_cards(self) -> list[dict[str, Any]]:
        """Return synthetic seeds plus active approved community card versions."""
        cards = []

        # 1. Add eligible synthetic seeds
        for card in self.seed_cards:
            status = card.get("provenance", {}).get("review_status", "")
            if status == "synthetic_unreviewed" or card.get("provenance", {}).get("approved_for_verified_retrieval"):
                cards.append(card)

        # 2. Add active approved community card versions
        with self.db.connection() as conn:
            rows = conn.execute(
                    """
                    SELECT card_id, version, title, cue, scenario, scenario_family,
                           relationship, channel, formality, perspectives_json,
                           do_not_assume, safe_action, counterexample, evidence_scope,
                           editorial_notes, provenance, approved_at
                    FROM approved_card_versions
                    WHERE is_active = 1
                    ORDER BY approved_at DESC
                    """
            ).fetchall()
            for r in rows:
                perspectives = json.loads(r["perspectives_json"]) if r["perspectives_json"] else []
                interpretations = [p.get("interpretation", "") for p in perspectives if p.get("interpretation")]
                community_card = {
                        "id": r["card_id"],
                        "title": r["title"],
                        "expression_or_event": r["cue"],
                        "scenario": r["scenario"],
                        "category": r["scenario_family"],
                        "relationship": r["relationship"],
                        "channel": r["channel"],
                        "formality": r["formality"],
                        "tags": [r["scenario_family"], r["relationship"], r["channel"], r["formality"]],
                        "evidence_scope": r["evidence_scope"],
                        "do_not_assume": r["do_not_assume"],
                        "safe_action": r["safe_action"],
                        "counterexample": r["counterexample"],
                        "possible_interpretations": interpretations,
                        "missing_context": [],
                        "source_ids": [],
                        "provenance": {
                            "review_status": "approved",
                            "approved_for_verified_retrieval": True,
                            "version": f"v{r['version']}",
                            "label": "Community-reviewed",
                        },
                }
                cards.append(community_card)
        return cards
