import pytest

from contextcue_agent.practice import PracticeConflict, PracticeSession
from contextcue_agent.schemas import ContextMap


def context_map() -> ContextMap:
    return ContextMap(
        version="2.0",
        known_facts=["A teammate replied in a group chat."],
        missing_context=["The exact task is unclear."],
        perspectives=[],
        assumption_risks=["Do not assume a deadline was accepted."],
        safest_next_action="Confirm the task and deadline.",
        response_strategies=[],
        evidence_trail=[],
        grounding_summary="Reference guidance with uncertainty.",
        retrieval_mode="lexical",
    )


def test_practice_feedback_uses_exact_learner_span():
    session = PracticeSession.start("p-1", context_map(), "clarify_before_inferring")
    turn = session.respond("Could you confirm which slides you can take?")

    assert turn.evidence
    assert all(item.response_span in turn.learner_response for item in turn.evidence)
    assert turn.turn_number == 1


def test_fourth_response_is_rejected_and_retry_preserves_history():
    session = PracticeSession.start("p-2", context_map(), "make_commitments_explicit")
    for response in ["Which slides?", "Could you take slides 3 to 5?", "Can you confirm by Friday?"]:
        session.respond(response)

    with pytest.raises(PracticeConflict):
        session.respond("One more response")

    retried = session.retry_last("Could you confirm slides 3 to 5?")
    assert len(session.turns) == 4
    assert retried.retry_of_turn == 3


def test_reflection_is_preserved_verbatim():
    session = PracticeSession.start("p-3", context_map(), "clarify_before_inferring")
    session.respond("What did you mean by okay?")
    reflection = session.reflect("  I assumed agreement.  ", "I will ask what is agreed.")
    assert reflection.initial_assumption == "  I assumed agreement.  "


def test_coach_drops_positive_evidence_that_is_not_in_the_response():
    from contextcue_agent.practice import coach_turn
    from contextcue_agent.schemas import CoachOutput, CriterionEvidence

    class FakeModel:
        def invoke(self, schema, task, payload):
            return CoachOutput(
                simulated_partner_reply="Could you be more specific?",
                coach_summary="Specific feedback",
                strengths=["Clear"], improvements=[], suggested_revision="Could you clarify?",
                evidence=[CriterionEvidence(
                    criterion_id="asks_answerable_question", response_span="words never submitted",
                    demonstrated=True, explanation="Claimed evidence",
                )], another_turn_useful=True,
            )

    output = coach_turn(context_map(), "clarify_before_inferring", "Could you clarify?", [], FakeModel())
    assert output.evidence == []
