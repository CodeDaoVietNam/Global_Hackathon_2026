from contextcue_agent.nodes import (
    build_reference_artifact,
    extract_context,
    validate_grounding,
)
from contextcue_agent.schemas import EvidenceItem, Interpretation


def test_extraction_preserves_quoted_language_and_explicit_deadline():
    profile = extract_context(
        'My teammate said “can lah” in our group chat.',
        'We agreed that slides 3 to 5 are due Friday.',
    )

    assert "can lah" in profile.quoted_language
    assert any("Friday" in fact.text for fact in profile.explicit_facts)
    assert profile.relationship == "teammate"
    assert profile.channel == "group_chat"


def test_grounding_rejects_unknown_evidence_and_invented_deadline():
    evidence = [EvidenceItem(card_id="card-1", version="seed-v1", title="Card", scenario_family="teamwork", evidence_status="synthetic_unreviewed")]
    interpretations = [Interpretation(
        statement="They agreed to submit the report on Monday.",
        plausibility_conditions=["If they accepted the deadline"],
        evidence_ids=["missing-card"],
        support_status="contextual_hypothesis",
    )]

    report = validate_grounding(interpretations, evidence, known_text="No deadline was agreed.")

    assert report.repair_required is True
    assert "missing-card" in report.invalid_evidence_ids
    assert report.unsupported_claims


def test_reference_artifact_labels_uncertainty(cards_path):
    from contextcue_agent.retrieval import CardRepository, HybridRetriever
    profile = extract_context("My teammate said can lah.", "No task or deadline was agreed.")
    evidence = HybridRetriever(CardRepository(cards_path)).search("My teammate said can lah.", profile)

    artifact = build_reference_artifact(profile, "academic_teamwork", evidence)

    assert artifact.known_facts
    assert artifact.perspectives
    assert all(item.support_status != "fact" for item in artifact.perspectives)
    assert artifact.retrieval_mode == "lexical"
    assert artifact.response_strategies
