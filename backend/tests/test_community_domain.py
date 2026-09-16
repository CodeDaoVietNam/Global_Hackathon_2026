import pytest
from app.domain.community import (
    CandidateStatus,
    CandidateView,
    PerspectiveDraft,
    InvalidCandidateTransition,
    assert_transition,
    evaluate_candidate,
)


def test_approved_candidate_cannot_return_to_pending():
    with pytest.raises(InvalidCandidateTransition):
        assert_transition(CandidateStatus.APPROVED, CandidateStatus.PENDING)


def test_valid_transitions():
    assert_transition(CandidateStatus.PENDING, CandidateStatus.COLLECTING_PERSPECTIVES)
    assert_transition(CandidateStatus.COLLECTING_PERSPECTIVES, CandidateStatus.READY_FOR_REVIEW)
    assert_transition(CandidateStatus.READY_FOR_REVIEW, CandidateStatus.APPROVED)
    assert_transition(CandidateStatus.APPROVED, CandidateStatus.SUPERSEDED)
    assert_transition(CandidateStatus.NEEDS_REVISION, CandidateStatus.READY_FOR_REVIEW)


def test_readiness_requires_distinct_contributors():
    candidate = CandidateView(
        candidate_id="cand-1",
        status=CandidateStatus.COLLECTING_PERSPECTIVES,
        cue="bojio",
        scenario="Said after lunch",
        scenario_family="humour",
        relationship="classmate",
        channel="in-person",
        formality="casual",
        do_not_assume="Do not assume exclusion.",
        safe_action="Ask if they want to join next time.",
        counterexample="When said neutrally, could just be acknowledging.",
        evidence_scope="Singapore campus peers.",
        perspectives=[
            PerspectiveDraft(contributor_id="anon-a", interpretation="Playful teasing about missing out."),
            PerspectiveDraft(contributor_id="anon-a", interpretation="Different wording from same person."),
        ],
    )
    report = evaluate_candidate(candidate)
    assert report.ready is False
    assert "different_contributors" in report.missing_requirements


def test_readiness_requires_non_duplicate_perspectives():
    candidate = CandidateView(
        candidate_id="cand-2",
        status=CandidateStatus.COLLECTING_PERSPECTIVES,
        cue="can lah",
        scenario="Teammate replying to deadline query",
        scenario_family="teamwork",
        relationship="classmate",
        channel="chat",
        formality="casual",
        do_not_assume="Do not assume agreement means all details are locked in.",
        safe_action="Confirm deliverables explicitly.",
        counterexample="Could mean tentative reassurance.",
        evidence_scope="Singapore undergraduate group work.",
        perspectives=[
            PerspectiveDraft(contributor_id="anon-a", interpretation="It means yes, no problem."),
            PerspectiveDraft(contributor_id="anon-b", interpretation="  it means yes, no problem.  "),
        ],
    )
    report = evaluate_candidate(candidate)
    assert report.ready is False
    assert "distinct_perspectives" in report.missing_requirements


def test_readiness_passes_when_all_criteria_met():
    candidate = CandidateView(
        candidate_id="cand-3",
        status=CandidateStatus.COLLECTING_PERSPECTIVES,
        cue="can lah",
        scenario="Teammate replying to deadline query",
        scenario_family="teamwork",
        relationship="classmate",
        channel="chat",
        formality="casual",
        do_not_assume="Do not assume complete agreement on details.",
        safe_action="Clarify specific timeline.",
        counterexample="Can express hesitation if said with drawn-out tone.",
        evidence_scope="Singapore undergraduate group work.",
        perspectives=[
            PerspectiveDraft(contributor_id="anon-1", interpretation="Informal reassurance that it is feasible."),
            PerspectiveDraft(contributor_id="anon-2", interpretation="Reluctance to refuse directly in a group."),
        ],
    )
    report = evaluate_candidate(candidate)
    assert report.ready is True
    assert len(report.missing_requirements) == 0
