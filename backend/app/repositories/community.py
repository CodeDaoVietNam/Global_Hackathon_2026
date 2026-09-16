"""Community Knowledge repository managing contributions, candidates, perspectives, reviews, and approved card versions."""

from __future__ import annotations

import hashlib
import json
import sqlite3
from uuid import uuid4
from typing import Any

from app.database import Database, now_iso
from app.domain.community import (
    CandidateStatus,
    CandidateView,
    ContributionDraft,
    InvalidCandidateTransition,
    PerspectiveDraft,
    ReadinessReport,
    ReviewDecisionType,
    assert_transition,
    evaluate_candidate,
    normalize_text,
)


class StaleVersionConflictError(Exception):
    """Raised when expected_candidate_version does not match current version in DB."""

    def __init__(self, candidate_id: str, expected_version: int, current_version: int):
        super().__init__(
            f"Candidate {candidate_id} version conflict: expected {expected_version}, but current is {current_version}"
        )
        self.candidate_id = candidate_id
        self.expected_version = expected_version
        self.current_version = current_version


class DuplicatePerspectiveError(Exception):
    """Raised when a candidate already has an identical or normalized duplicate perspective."""
    pass


def hash_identifier(raw_id: str, salt: str = "contextcue-pepper-2026") -> str:
    """Deterministic hash of contributor ID or reviewer token so raw identifiers are never stored."""
    return hashlib.sha256(f"{salt}:{raw_id.strip()}".encode("utf-8")).hexdigest()


def hash_content(text: str) -> str:
    """Hash normalized content for duplicate perspective detection."""
    return hashlib.sha256(normalize_text(text).encode("utf-8")).hexdigest()


class CommunityRepository:
    def __init__(self, db: Database):
        self.db = db

    def create_contribution(self, draft: ContributionDraft) -> dict[str, Any]:
        """Create a new contribution, attach or create a candidate, and evaluate readiness."""
        contribution_id = str(uuid4())
        candidate_id = str(uuid4())
        contributor_hash = hash_identifier(draft.contributor_id)
        interp_hash = hash_content(draft.interpretation)
        timestamp = now_iso()

        with self.db.connection() as conn:
            # 1. Insert candidate
            conn.execute(
                """
                INSERT INTO card_candidates (
                    candidate_id, cue, scenario, scenario_family, relationship, channel, formality,
                    status, do_not_assume, safe_action, counterexample, evidence_scope, version,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                """,
                (
                    candidate_id,
                    draft.cue.strip(),
                    draft.scenario.strip(),
                    draft.scenario_family.strip(),
                    draft.relationship.strip(),
                    draft.channel.strip(),
                    draft.formality.strip(),
                    CandidateStatus.PENDING.value,
                    draft.do_not_assume.strip(),
                    draft.safe_action.strip(),
                    draft.counterexample.strip(),
                    draft.evidence_scope.strip(),
                    timestamp,
                    timestamp,
                ),
            )

            # 2. Insert contribution
            conn.execute(
                """
                INSERT INTO contributions (
                    contribution_id, contributor_id_hash, cue, scenario, scenario_family,
                    relationship, channel, formality, interpretation, conditions,
                    counterconditions, do_not_assume, safe_action, counterexample,
                    evidence_scope, direct_experience, consent_given, status,
                    candidate_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    contribution_id,
                    contributor_hash,
                    draft.cue.strip(),
                    draft.scenario.strip(),
                    draft.scenario_family.strip(),
                    draft.relationship.strip(),
                    draft.channel.strip(),
                    draft.formality.strip(),
                    draft.interpretation.strip(),
                    draft.conditions.strip(),
                    draft.counterconditions.strip(),
                    draft.do_not_assume.strip(),
                    draft.safe_action.strip(),
                    draft.counterexample.strip(),
                    draft.evidence_scope.strip(),
                    1 if draft.direct_experience else 0,
                    1 if draft.consent_given else 0,
                    CandidateStatus.PENDING.value,
                    candidate_id,
                    timestamp,
                    timestamp,
                ),
            )

            # 3. Insert perspective
            persp_id = str(uuid4())
            conn.execute(
                """
                INSERT INTO perspectives (
                    perspective_id, candidate_id, contribution_id, contributor_id_hash,
                    interpretation, interpretation_hash, conditions, counterconditions, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    persp_id,
                    candidate_id,
                    contribution_id,
                    contributor_hash,
                    draft.interpretation.strip(),
                    interp_hash,
                    draft.conditions.strip(),
                    draft.counterconditions.strip(),
                    timestamp,
                ),
            )

        # 4. Evaluate candidate readiness
        candidate_view = self._load_candidate_view(candidate_id)
        report = evaluate_candidate(candidate_view)
        new_status = CandidateStatus.READY_FOR_REVIEW if report.ready else CandidateStatus.COLLECTING_PERSPECTIVES
        self._update_candidate_status(candidate_id, new_status)

        return {
            "contribution_id": contribution_id,
            "candidate_id": candidate_id,
            "status": new_status.value,
            "provenance": "Pending contribution",
            "readiness": {
                "ready": report.ready,
                "missing_requirements": report.missing_requirements,
                "perspective_count": report.perspective_count,
                "distinct_contributors": report.distinct_contributors,
            },
            "created_at": timestamp,
        }

    def get_idempotent_response(self, operation: str, contributor_id: str, idempotency_key: str) -> dict[str, Any] | None:
        """Return a previously stored public response for one contributor operation."""
        with self.db.connection() as conn:
            row = conn.execute(
                """SELECT response_json FROM community_idempotency
                   WHERE operation = ? AND contributor_id_hash = ? AND idempotency_key = ?""",
                (operation, hash_identifier(contributor_id), idempotency_key),
            ).fetchone()
        return json.loads(row["response_json"]) if row else None

    def save_idempotent_response(self, operation: str, contributor_id: str, idempotency_key: str, response: dict[str, Any]) -> dict[str, Any]:
        """Persist the public result once and return the canonical result after a concurrent replay."""
        with self.db.connection() as conn:
            try:
                conn.execute(
                    """INSERT INTO community_idempotency
                       (operation, contributor_id_hash, idempotency_key, response_json, created_at)
                       VALUES (?, ?, ?, ?, ?)""",
                    (
                        operation,
                        hash_identifier(contributor_id),
                        idempotency_key,
                        json.dumps(response, ensure_ascii=False),
                        now_iso(),
                    ),
                )
                return response
            except sqlite3.IntegrityError:
                row = conn.execute(
                    """SELECT response_json FROM community_idempotency
                       WHERE operation = ? AND contributor_id_hash = ? AND idempotency_key = ?""",
                    (operation, hash_identifier(contributor_id), idempotency_key),
                ).fetchone()
                if not row:
                    raise
                return json.loads(row["response_json"])

    def add_perspective(self, candidate_id: str, draft: PerspectiveDraft) -> dict[str, Any]:
        """Add a perspective to an existing candidate."""
        contributor_hash = hash_identifier(draft.contributor_id)
        interp_hash = hash_content(draft.interpretation)
        timestamp = now_iso()

        with self.db.connection() as conn:
            cand = conn.execute("SELECT status, version FROM card_candidates WHERE candidate_id = ?", (candidate_id,)).fetchone()
            if not cand:
                raise ValueError(f"Candidate {candidate_id} not found")

            status = CandidateStatus(cand["status"])
            if status in {CandidateStatus.APPROVED, CandidateStatus.SUPERSEDED, CandidateStatus.ARCHIVED, CandidateStatus.REJECTED}:
                raise ValueError(f"Cannot add perspective to candidate in status {status.value}")

            # Check for duplicate normalized perspective on this candidate
            dup = conn.execute(
                "SELECT perspective_id FROM perspectives WHERE candidate_id = ? AND interpretation_hash = ?",
                (candidate_id, interp_hash),
            ).fetchone()
            if dup:
                raise DuplicatePerspectiveError("An identical or equivalent perspective has already been submitted for this candidate.")

            persp_id = str(uuid4())
            conn.execute(
                """
                INSERT INTO perspectives (
                    perspective_id, candidate_id, contribution_id, contributor_id_hash,
                    interpretation, interpretation_hash, conditions, counterconditions, created_at
                ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)
                """,
                (
                    persp_id,
                    candidate_id,
                    contributor_hash,
                    draft.interpretation.strip(),
                    interp_hash,
                    draft.conditions.strip(),
                    draft.counterconditions.strip(),
                    timestamp,
                ),
            )
            conn.execute("UPDATE card_candidates SET updated_at = ? WHERE candidate_id = ?", (timestamp, candidate_id))

        # Re-evaluate candidate readiness
        candidate_view = self._load_candidate_view(candidate_id)
        report = evaluate_candidate(candidate_view)
        target_status = CandidateStatus.READY_FOR_REVIEW if report.ready else CandidateStatus.COLLECTING_PERSPECTIVES
        if candidate_view.status != target_status:
            self._update_candidate_status(candidate_id, target_status)

        return {
            "perspective_id": persp_id,
            "candidate_id": candidate_id,
            "status": target_status.value,
            "readiness": {
                "ready": report.ready,
                "missing_requirements": report.missing_requirements,
                "perspective_count": report.perspective_count,
                "distinct_contributors": report.distinct_contributors,
            },
        }

    def _load_candidate_view(self, candidate_id: str) -> CandidateView:
        with self.db.connection() as conn:
            cand = conn.execute("SELECT * FROM card_candidates WHERE candidate_id = ?", (candidate_id,)).fetchone()
            if not cand:
                raise ValueError(f"Candidate {candidate_id} not found")
            persps = conn.execute("SELECT * FROM perspectives WHERE candidate_id = ?", (candidate_id,)).fetchall()

        perspective_drafts = [
            PerspectiveDraft(
                contributor_id=row["contributor_id_hash"],
                interpretation=row["interpretation"],
                conditions=row["conditions"] or "",
                counterconditions=row["counterconditions"] or "",
            )
            for row in persps
        ]

        return CandidateView(
            candidate_id=cand["candidate_id"],
            status=CandidateStatus(cand["status"]),
            cue=cand["cue"],
            scenario=cand["scenario"],
            scenario_family=cand["scenario_family"],
            relationship=cand["relationship"],
            channel=cand["channel"],
            formality=cand["formality"],
            do_not_assume=cand["do_not_assume"] or "",
            safe_action=cand["safe_action"] or "",
            counterexample=cand["counterexample"] or "",
            evidence_scope=cand["evidence_scope"] or "",
            perspectives=perspective_drafts,
            version=cand["version"],
        )

    def _update_candidate_status(self, candidate_id: str, new_status: CandidateStatus) -> None:
        with self.db.connection() as conn:
            conn.execute(
                "UPDATE card_candidates SET status = ?, updated_at = ? WHERE candidate_id = ?",
                (new_status.value, now_iso(), candidate_id),
            )

    def get_public_candidate(self, candidate_id: str) -> dict[str, Any] | None:
        """Get sanitized public representation of a candidate."""
        try:
            view = self._load_candidate_view(candidate_id)
        except ValueError:
            return None

        report = evaluate_candidate(view)
        # Provenance label mapping
        if view.status == CandidateStatus.APPROVED:
            provenance = "Community-reviewed"
        elif view.status == CandidateStatus.READY_FOR_REVIEW:
            provenance = "Awaiting community review"
        else:
            provenance = "Pending contribution"

        # Sanitize perspectives: map contributor hashes to anonymous indexes ("Perspective 1", "Perspective 2")
        sanitized_perspectives = [
            {
                "perspective_index": i + 1,
                "interpretation": p.interpretation,
                "conditions": p.conditions,
                "counterconditions": p.counterconditions,
            }
            for i, p in enumerate(view.perspectives)
        ]

        return {
            "candidate_id": view.candidate_id,
            "cue": view.cue,
            "scenario": view.scenario,
            "scenario_family": view.scenario_family,
            "relationship": view.relationship,
            "channel": view.channel,
            "formality": view.formality,
            "status": view.status.value,
            "provenance": provenance,
            "do_not_assume": view.do_not_assume,
            "safe_action": view.safe_action,
            "counterexample": view.counterexample,
            "evidence_scope": view.evidence_scope,
            "perspectives": sanitized_perspectives,
            "readiness": {
                "ready": report.ready,
                "missing_requirements": report.missing_requirements,
                "perspective_count": report.perspective_count,
                "distinct_contributors": report.distinct_contributors,
            },
        }

    def list_public_candidates(self, status: str | None = None, limit: int = 20, cursor: int = 0) -> list[dict[str, Any]]:
        with self.db.connection() as conn:
            if status:
                rows = conn.execute(
                    "SELECT candidate_id FROM card_candidates WHERE status = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?",
                    (status, limit, cursor),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT candidate_id FROM card_candidates WHERE status NOT IN ('archived', 'rejected') ORDER BY updated_at DESC LIMIT ? OFFSET ?",
                    (limit, cursor),
                ).fetchall()

        results = []
        for row in rows:
            pub = self.get_public_candidate(row["candidate_id"])
            if pub:
                results.append(pub)
        return results

    def find_similar_candidates(self, cue: str, scenario_family: str, limit: int = 5) -> list[dict[str, Any]]:
        with self.db.connection() as conn:
            rows = conn.execute(
                """
                SELECT candidate_id FROM card_candidates
                WHERE (cue LIKE ? OR scenario_family = ?) AND status NOT IN ('archived', 'rejected')
                ORDER BY updated_at DESC LIMIT ?
                """,
                (f"%{cue.strip()}%", scenario_family.strip(), limit),
            ).fetchall()

        results = []
        for row in rows:
            pub = self.get_public_candidate(row["candidate_id"])
            if pub:
                results.append(pub)
        return results

    def get_status_receipt(self, contribution_id: str) -> dict[str, Any] | None:
        with self.db.connection() as conn:
            row = conn.execute(
                "SELECT contribution_id, candidate_id, status, cue, scenario, created_at FROM contributions WHERE contribution_id = ?",
                (contribution_id,),
            ).fetchone()
            if not row:
                return None

        pub_cand = self.get_public_candidate(row["candidate_id"]) if row["candidate_id"] else None
        return {
            "contribution_id": row["contribution_id"],
            "candidate_id": row["candidate_id"],
            "cue": row["cue"],
            "status": row["status"],
            "provenance": "Pending contribution",
            "created_at": row["created_at"],
            "candidate_summary": pub_cand,
        }

    def list_review_queue(self, status: str | None = None) -> list[dict[str, Any]]:
        with self.db.connection() as conn:
            if status:
                rows = conn.execute(
                    "SELECT candidate_id, version FROM card_candidates WHERE status = ? ORDER BY updated_at DESC",
                    (status,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT candidate_id, version FROM card_candidates ORDER BY updated_at DESC"
                ).fetchall()

        results = []
        for row in rows:
            cand = self.get_reviewer_candidate(row["candidate_id"])
            if cand:
                results.append(cand)
        return results

    def get_reviewer_candidate(self, candidate_id: str) -> dict[str, Any] | None:
        try:
            view = self._load_candidate_view(candidate_id)
        except ValueError:
            return None

        report = evaluate_candidate(view)
        with self.db.connection() as conn:
            reviews = conn.execute(
                "SELECT * FROM reviews WHERE candidate_id = ? ORDER BY created_at DESC",
                (candidate_id,),
            ).fetchall()

        return {
            "candidate_id": view.candidate_id,
            "version": view.version,
            "cue": view.cue,
            "scenario": view.scenario,
            "scenario_family": view.scenario_family,
            "relationship": view.relationship,
            "channel": view.channel,
            "formality": view.formality,
            "status": view.status.value,
            "do_not_assume": view.do_not_assume,
            "safe_action": view.safe_action,
            "counterexample": view.counterexample,
            "evidence_scope": view.evidence_scope,
            "perspectives": [
                {
                    "interpretation": p.interpretation,
                    "conditions": p.conditions,
                    "counterconditions": p.counterconditions,
                    "contributor_id_hash": p.contributor_id,
                }
                for p in view.perspectives
            ],
            "readiness": {
                "ready": report.ready,
                "missing_requirements": report.missing_requirements,
                "perspective_count": report.perspective_count,
                "distinct_contributors": report.distinct_contributors,
            },
            "reviews": [dict(r) for r in reviews],
        }

    def apply_decision(
        self,
        candidate_id: str,
        reviewer_session_id: str,
        expected_version: int,
        decision: ReviewDecisionType,
        decision_payload: dict[str, Any],
    ) -> dict[str, Any]:
        """Apply a moderation decision with optimistic locking and immutable versioning."""
        timestamp = now_iso()
        with self.db.connection() as conn:
            cand = conn.execute("SELECT * FROM card_candidates WHERE candidate_id = ?", (candidate_id,)).fetchone()
            if not cand:
                raise ValueError(f"Candidate {candidate_id} not found")

            current_version = cand["version"]
            if current_version != expected_version:
                raise StaleVersionConflictError(candidate_id, expected_version, current_version)

            current_status = CandidateStatus(cand["status"])

            if decision == ReviewDecisionType.APPROVE:
                assert_transition(current_status, CandidateStatus.APPROVED)
                # Verify all approval checklist items
                checks = [
                    "privacy_check",
                    "stereotype_risk_check",
                    "conditional_wording_check",
                    "perspective_diversity_check",
                    "counterexample_check",
                    "safe_action_check",
                    "evidence_scope_check",
                ]
                for check in checks:
                    if not decision_payload.get(check, False):
                        raise ValueError(f"Approval checklist item {check} must be checked and True")

                card_id = decision_payload.get("card_id") or f"community-{candidate_id[:8]}"
                title = decision_payload.get("title") or f"{cand['cue']} in {cand['scenario_family']}"
                editorial_notes = decision_payload.get("editorial_notes", "")

                # Fetch perspectives
                persp_rows = conn.execute("SELECT * FROM perspectives WHERE candidate_id = ?", (candidate_id,)).fetchall()
                perspectives_json = json.dumps(
                    [
                        {
                            "interpretation": r["interpretation"],
                            "conditions": r["conditions"] or "",
                            "counterconditions": r["counterconditions"] or "",
                        }
                        for r in persp_rows
                    ],
                    ensure_ascii=False,
                )

                # Get latest approved version number for card_id
                latest = conn.execute(
                    "SELECT MAX(version) as max_v FROM approved_card_versions WHERE card_id = ?",
                    (card_id,),
                ).fetchone()
                new_card_version = (latest["max_v"] or 0) + 1

                # Deactivate old versions
                conn.execute("UPDATE approved_card_versions SET is_active = 0 WHERE card_id = ?", (card_id,))

                # Insert immutable approved card version
                conn.execute(
                    """
                    INSERT INTO approved_card_versions (
                        card_id, version, candidate_id, title, cue, scenario, scenario_family,
                        relationship, channel, formality, perspectives_json, do_not_assume,
                        safe_action, counterexample, evidence_scope, editorial_notes,
                        provenance, is_active, approved_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Community-reviewed', 1, ?)
                    """,
                    (
                        card_id,
                        new_card_version,
                        candidate_id,
                        title,
                        cand["cue"],
                        cand["scenario"],
                        cand["scenario_family"],
                        cand["relationship"],
                        cand["channel"],
                        cand["formality"],
                        perspectives_json,
                        cand["do_not_assume"],
                        cand["safe_action"],
                        cand["counterexample"],
                        cand["evidence_scope"],
                        editorial_notes,
                        timestamp,
                    ),
                )

                # Queue embedding job
                conn.execute(
                    """
                    INSERT INTO card_embedding_jobs (job_id, card_id, version, status, created_at, updated_at)
                    VALUES (?, ?, ?, 'pending', ?, ?)
                    """,
                    (str(uuid4()), card_id, new_card_version, timestamp, timestamp),
                )

                new_cand_status = CandidateStatus.APPROVED

            elif decision == ReviewDecisionType.REQUEST_REVISION:
                assert_transition(current_status, CandidateStatus.NEEDS_REVISION)
                new_cand_status = CandidateStatus.NEEDS_REVISION
            elif decision == ReviewDecisionType.REJECT:
                assert_transition(current_status, CandidateStatus.REJECTED)
                new_cand_status = CandidateStatus.REJECTED
            else:
                raise ValueError(f"Unknown decision type: {decision}")

            # Record review
            conn.execute(
                """
                INSERT INTO reviews (
                    review_id, candidate_id, reviewer_session_id, privacy_check,
                    stereotype_risk_check, conditional_wording_check, perspective_diversity_check,
                    counterexample_check, safe_action_check, evidence_scope_check,
                    decision, decision_note, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid4()),
                    candidate_id,
                    reviewer_session_id,
                    1 if decision_payload.get("privacy_check") else 0,
                    1 if decision_payload.get("stereotype_risk_check") else 0,
                    1 if decision_payload.get("conditional_wording_check") else 0,
                    1 if decision_payload.get("perspective_diversity_check") else 0,
                    1 if decision_payload.get("counterexample_check") else 0,
                    1 if decision_payload.get("safe_action_check") else 0,
                    1 if decision_payload.get("evidence_scope_check") else 0,
                    decision.value,
                    decision_payload.get("decision_note", ""),
                    timestamp,
                ),
            )

            # Bump version and update candidate status
            new_version = current_version + 1
            conn.execute(
                "UPDATE card_candidates SET status = ?, version = ?, updated_at = ? WHERE candidate_id = ?",
                (new_cand_status.value, new_version, timestamp, candidate_id),
            )

        return {
            "candidate_id": candidate_id,
            "status": new_cand_status.value,
            "version": new_version,
            "decision": decision.value,
            "updated_at": timestamp,
        }

    def list_card_versions(self, card_id: str) -> list[dict[str, Any]]:
        with self.db.connection() as conn:
            rows = conn.execute(
                "SELECT * FROM approved_card_versions WHERE card_id = ? ORDER BY version DESC",
                (card_id,),
            ).fetchall()
        return [dict(r) for r in rows]
