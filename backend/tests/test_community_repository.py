import pytest
from app.database import Database
from app.domain.community import (
    CandidateStatus,
    ContributionDraft,
    PerspectiveDraft,
    ReviewDecisionType,
)
from app.repositories.community import (
    CommunityRepository,
    DuplicatePerspectiveError,
    StaleVersionConflictError,
)


@pytest.fixture
def repo(tmp_path):
    db_path = tmp_path / "test_community.db"
    db = Database(db_path)
    db.setup()
    return CommunityRepository(db)


def test_create_contribution_and_collect_perspectives(repo):
    draft = ContributionDraft(
        contributor_id="anon-user-1",
        cue="bojio",
        scenario="Teammate said bojio after lunch",
        scenario_family="humour",
        relationship="classmate",
        channel="in-person",
        formality="casual",
        interpretation="Friendly teasing about not inviting them.",
        do_not_assume="Do not assume they are genuinely offended.",
        safe_action="Warmly invite them along for the next coffee or meal.",
        counterexample="Could be actual disappointment if repeated often.",
        evidence_scope="Undergraduate project groups in Singapore.",
    )
    receipt = repo.create_contribution(draft)
    assert receipt["contribution_id"] is not None
    candidate_id = receipt["candidate_id"]
    assert receipt["status"] == "collecting_perspectives"
    assert receipt["readiness"]["ready"] is False
    assert "different_contributors" in receipt["readiness"]["missing_requirements"]

    # Add second perspective from a different contributor
    persp2 = PerspectiveDraft(
        contributor_id="anon-user-2",
        interpretation="Can also be used lightly to acknowledge you had food without them.",
    )
    res2 = repo.add_perspective(candidate_id, persp2)
    assert res2["status"] == "ready_for_review"
    assert res2["readiness"]["ready"] is True
    assert res2["readiness"]["distinct_contributors"] == 2


def test_reject_duplicate_perspective(repo):
    draft = ContributionDraft(
        contributor_id="anon-user-1",
        cue="can lah",
        scenario="Said when asked about timeline",
        scenario_family="teamwork",
        relationship="classmate",
        channel="chat",
        formality="casual",
        interpretation="Informal agreement or reassurance.",
        do_not_assume="Do not assume all details are finalized.",
        safe_action="Send an explicit breakdown of tasks.",
        counterexample="Drawn out tone may mean reluctance.",
        evidence_scope="Group assignments.",
    )
    receipt = repo.create_contribution(draft)
    candidate_id = receipt["candidate_id"]

    # Same interpretation normalized
    dup_draft = PerspectiveDraft(
        contributor_id="anon-user-2",
        interpretation="  informal agreement or reassurance. ",
    )
    with pytest.raises(DuplicatePerspectiveError):
        repo.add_perspective(candidate_id, dup_draft)


def test_decision_stale_version_conflict(repo):
    draft = ContributionDraft(
        contributor_id="anon-user-1",
        cue="can lah",
        scenario="Team chat",
        scenario_family="teamwork",
        relationship="classmate",
        channel="chat",
        formality="casual",
        interpretation="Reassurance",
        do_not_assume="Do not assume finalized",
        safe_action="Confirm deliverables",
        counterexample="Tone may indicate hesitation",
        evidence_scope="Singapore campus",
    )
    receipt = repo.create_contribution(draft)
    candidate_id = receipt["candidate_id"]
    repo.add_perspective(
        candidate_id,
        PerspectiveDraft(contributor_id="anon-user-2", interpretation="Reluctance to refuse directly"),
    )

    # Candidate is at version 1. Passing expected_version=99 must raise StaleVersionConflictError
    with pytest.raises(StaleVersionConflictError):
        repo.apply_decision(
            candidate_id=candidate_id,
            reviewer_session_id="rev-sess-1",
            expected_version=99,
            decision=ReviewDecisionType.APPROVE,
            decision_payload={
                "privacy_check": True,
                "stereotype_risk_check": True,
                "conditional_wording_check": True,
                "perspective_diversity_check": True,
                "counterexample_check": True,
                "safe_action_check": True,
                "evidence_scope_check": True,
            },
        )


def test_approval_creates_immutable_card_and_job(repo):
    draft = ContributionDraft(
        contributor_id="anon-user-1",
        cue="can lah",
        scenario="Team chat",
        scenario_family="teamwork",
        relationship="classmate",
        channel="chat",
        formality="casual",
        interpretation="Reassurance that it is doable",
        do_not_assume="Do not assume all details are finalized",
        safe_action="Confirm deliverables explicitly",
        counterexample="Tone may indicate hesitation",
        evidence_scope="Singapore campus",
    )
    receipt = repo.create_contribution(draft)
    candidate_id = receipt["candidate_id"]
    repo.add_perspective(
        candidate_id,
        PerspectiveDraft(contributor_id="anon-user-2", interpretation="Polite reluctance to say no"),
    )

    decision_result = repo.apply_decision(
        candidate_id=candidate_id,
        reviewer_session_id="rev-sess-1",
        expected_version=1,
        decision=ReviewDecisionType.APPROVE,
        decision_payload={
            "card_id": "sg-teamwork-01",
            "title": "Can lah in team discussions",
            "privacy_check": True,
            "stereotype_risk_check": True,
            "conditional_wording_check": True,
            "perspective_diversity_check": True,
            "counterexample_check": True,
            "safe_action_check": True,
            "evidence_scope_check": True,
            "editorial_notes": "Reviewed and verified format.",
        },
    )

    assert decision_result["status"] == "approved"
    assert decision_result["version"] == 2

    # Check versions list
    versions = repo.list_card_versions("sg-teamwork-01")
    assert len(versions) == 1
    assert versions[0]["version"] == 1
    assert versions[0]["provenance"] == "Community-reviewed"
    assert versions[0]["is_active"] == 1
