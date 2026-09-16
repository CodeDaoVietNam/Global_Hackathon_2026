"""Community service layer enforcing privacy checks, idempotency, and repository access."""

from __future__ import annotations

from typing import Any
from app.domain.community import ContributionDraft, PerspectiveDraft
from app.repositories.community import CommunityRepository
from app.services.privacy import scan_submission


class CommunityService:
    def __init__(self, repo: CommunityRepository):
        self.repo = repo

    def submit_contribution(
        self, contributor_id: str, payload: dict[str, Any], idempotency_key: str | None = None
    ) -> dict[str, Any]:
        if idempotency_key:
            existing = self.repo.get_idempotent_response("contribution", contributor_id, idempotency_key)
            if existing:
                return {"success": True, "data": existing}
        report = scan_submission(payload)
        if not report.safe:
            return {
                "success": False,
                "error": "privacy_violation",
                "flags": [
                    {"field": f.field, "code": f.code, "remediation": f.remediation}
                    for f in report.flags
                ],
            }

        draft = ContributionDraft(
            contributor_id=contributor_id,
            cue=payload.get("cue", ""),
            scenario=payload.get("scenario", ""),
            scenario_family=payload.get("scenario_family", ""),
            relationship=payload.get("relationship", ""),
            channel=payload.get("channel", ""),
            formality=payload.get("formality", ""),
            interpretation=payload.get("interpretation", ""),
            conditions=payload.get("conditions", ""),
            counterconditions=payload.get("counterconditions", ""),
            do_not_assume=payload.get("do_not_assume", ""),
            safe_action=payload.get("safe_action", ""),
            counterexample=payload.get("counterexample", ""),
            evidence_scope=payload.get("evidence_scope", ""),
            direct_experience=payload.get("direct_experience", True),
            consent_given=payload.get("consent_given", True),
        )
        receipt = self.repo.create_contribution(draft)
        if idempotency_key:
            receipt = self.repo.save_idempotent_response(
                "contribution", contributor_id, idempotency_key, receipt
            )
        return {"success": True, "data": receipt}

    def add_perspective(self, candidate_id: str, contributor_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        report = scan_submission(payload)
        if not report.safe:
            return {
                "success": False,
                "error": "privacy_violation",
                "flags": [
                    {"field": f.field, "code": f.code, "remediation": f.remediation}
                    for f in report.flags
                ],
            }

        draft = PerspectiveDraft(
            contributor_id=contributor_id,
            interpretation=payload.get("interpretation", ""),
            conditions=payload.get("conditions", ""),
            counterconditions=payload.get("counterconditions", ""),
        )
        res = self.repo.add_perspective(candidate_id, draft)
        return {"success": True, "data": res}
