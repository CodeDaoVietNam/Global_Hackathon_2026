"""Community knowledge domain models, lifecycle state machine, and readiness rules."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
import re
from typing import Sequence


class CandidateStatus(str, Enum):
    PENDING = "pending"
    COLLECTING_PERSPECTIVES = "collecting_perspectives"
    READY_FOR_REVIEW = "ready_for_review"
    APPROVED = "approved"
    NEEDS_REVISION = "needs_revision"
    REJECTED = "rejected"
    SUPERSEDED = "superseded"
    ARCHIVED = "archived"


class ReviewDecisionType(str, Enum):
    APPROVE = "approve"
    REQUEST_REVISION = "request_revision"
    REJECT = "reject"


class InvalidCandidateTransition(Exception):
    """Raised when an illegal status transition is requested."""

    def __init__(self, current: CandidateStatus, target: CandidateStatus):
        super().__init__(f"Cannot transition candidate from {current.value} to {target.value}")
        self.current = current
        self.target = target


ALLOWED_TRANSITIONS: dict[CandidateStatus, set[CandidateStatus]] = {
    CandidateStatus.PENDING: {
        CandidateStatus.COLLECTING_PERSPECTIVES,
        CandidateStatus.READY_FOR_REVIEW,
        CandidateStatus.REJECTED,
    },
    CandidateStatus.COLLECTING_PERSPECTIVES: {
        CandidateStatus.READY_FOR_REVIEW,
        CandidateStatus.REJECTED,
    },
    CandidateStatus.READY_FOR_REVIEW: {
        CandidateStatus.APPROVED,
        CandidateStatus.NEEDS_REVISION,
        CandidateStatus.REJECTED,
    },
    CandidateStatus.NEEDS_REVISION: {
        CandidateStatus.READY_FOR_REVIEW,
        CandidateStatus.REJECTED,
    },
    CandidateStatus.APPROVED: {
        CandidateStatus.SUPERSEDED,
        CandidateStatus.ARCHIVED,
    },
    CandidateStatus.SUPERSEDED: {
        CandidateStatus.ARCHIVED,
    },
    CandidateStatus.REJECTED: set(),
    CandidateStatus.ARCHIVED: set(),
}


def assert_transition(current: CandidateStatus, target: CandidateStatus) -> None:
    """Assert that a candidate state transition is allowed."""
    if current == target:
        return
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise InvalidCandidateTransition(current, target)


def normalize_text(text: str) -> str:
    """Normalize text for duplicate detection."""
    lowered = text.strip().lower()
    return re.sub(r"\s+", " ", lowered)


@dataclass(frozen=True)
class PerspectiveDraft:
    contributor_id: str
    interpretation: str
    conditions: str = ""
    counterconditions: str = ""


@dataclass(frozen=True)
class ContributionDraft:
    contributor_id: str
    cue: str
    scenario: str
    scenario_family: str
    relationship: str
    channel: str
    formality: str
    interpretation: str
    conditions: str = ""
    counterconditions: str = ""
    do_not_assume: str = ""
    safe_action: str = ""
    counterexample: str = ""
    evidence_scope: str = ""
    direct_experience: bool = True
    consent_given: bool = True


@dataclass(frozen=True)
class CandidateView:
    candidate_id: str
    status: CandidateStatus
    cue: str
    scenario: str
    scenario_family: str
    relationship: str
    channel: str
    formality: str
    do_not_assume: str = ""
    safe_action: str = ""
    counterexample: str = ""
    evidence_scope: str = ""
    perspectives: Sequence[PerspectiveDraft] = field(default_factory=list)
    has_unresolved_flags: bool = False
    version: int = 1


@dataclass(frozen=True)
class ReadinessReport:
    ready: bool
    missing_requirements: list[str] = field(default_factory=list)
    perspective_count: int = 0
    distinct_contributors: int = 0


def evaluate_candidate(candidate: CandidateView) -> ReadinessReport:
    """Evaluate whether a candidate meets all criteria for ready_for_review."""
    missing: list[str] = []

    # 1. Perspective check: distinct contributors and non-duplicates
    unique_contributors = {p.contributor_id.strip() for p in candidate.perspectives if p.contributor_id.strip()}
    distinct_count = len(unique_contributors)

    normalized_perspectives = [normalize_text(p.interpretation) for p in candidate.perspectives if normalize_text(p.interpretation)]
    unique_perspectives = set(normalized_perspectives)

    if distinct_count < 2:
        missing.append("different_contributors")
    if len(unique_perspectives) < 2:
        missing.append("distinct_perspectives")

    # 2. Required fields
    if not candidate.do_not_assume or not candidate.do_not_assume.strip():
        missing.append("do_not_assume")

    if not candidate.counterexample or not candidate.counterexample.strip():
        missing.append("counterexample")

    if not candidate.safe_action or not candidate.safe_action.strip():
        missing.append("safe_action")

    if not candidate.evidence_scope or not candidate.evidence_scope.strip():
        missing.append("evidence_scope")

    if candidate.has_unresolved_flags:
        missing.append("unresolved_privacy_flags")

    return ReadinessReport(
        ready=len(missing) == 0,
        missing_requirements=missing,
        perspective_count=len(candidate.perspectives),
        distinct_contributors=distinct_count,
    )
