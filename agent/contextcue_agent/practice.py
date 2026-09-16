from __future__ import annotations

from dataclasses import dataclass, field
from uuid import uuid4

from .schemas import CoachOutput, ContextMap, CriterionEvidence, PracticeTurn, Reflection, ResponseStrategy


GOAL_CRITERIA = {
    "clarify_before_inferring": ["asks_answerable_question", "separates_fact_from_assumption"],
    "make_commitments_explicit": ["names_action", "asks_for_confirmation"],
    "adapt_formality": ["matches_formality", "uses_respectful_wording"],
    "handle_humour_ambiguity": ["checks_intent", "acknowledges_impact"],
    "give_actionable_feedback": ["names_observation", "requests_action"],
    "receive_direct_feedback": ["checks_understanding", "confirms_next_step"],
    "set_respectful_boundaries": ["states_boundary", "requests_change"],
    "use_evidence_carefully": ["labels_uncertainty", "avoids_generalization"],
}


class PracticeConflict(ValueError):
    pass


def criteria_for(goal: str) -> list[str]:
    if goal not in GOAL_CRITERIA:
        raise ValueError("Unsupported practice goal")
    return GOAL_CRITERIA[goal]


def strategies_for(context_map: ContextMap, goal: str) -> list[ResponseStrategy]:
    preferred = {
        "clarify_before_inferring": "clarification",
        "make_commitments_explicit": "confirmation",
        "set_respectful_boundaries": "boundary",
        "adapt_formality": "formal",
    }.get(goal)
    ordered = sorted(context_map.response_strategies, key=lambda item: item.strategy_type != preferred)
    return ordered[:3]


def coach_turn(context_map: ContextMap, goal: str, response: str, history: list[PracticeTurn], model=None) -> CoachOutput:
    if model is None:
        lower = response.lower()
        evidence = []
        if "?" in response:
            evidence.append(CriterionEvidence(criterion_id="asks_answerable_question", response_span=response, demonstrated=True, explanation="You asked an answerable question."))
        terms = [word for word in ("slides", "draft", "submit", "deadline", "confirm", "which", "when", "what") if word in lower]
        if terms:
            term = terms[0]
            start = lower.index(term)
            evidence.append(CriterionEvidence(criterion_id="names_action", response_span=response[start:start + len(term)], demonstrated=True, explanation="You named information or an action to clarify."))
        return CoachOutput(
            simulated_partner_reply="Thanks for checking. Could you make the action you want me to confirm more specific?" if "?" not in response else "Thanks for asking. I meant that it seems possible, but we have not assigned the exact task yet.",
            simulation_assumptions=["The simulated partner is willing to clarify; this is a practice assumption, not a prediction."],
            coach_summary="Your response is evaluated only on the wording shown here.",
            strengths=[item.explanation for item in evidence],
            improvements=[] if evidence else ["Ask one answerable question or name the action that needs confirmation."],
            suggested_revision=response if evidence else "Could you clarify which action you are agreeing to?",
            evidence=evidence,
            another_turn_useful=len(history) < 1 or not evidence,
        )
    output = model.invoke(CoachOutput, "coach_practice_turn", {
        "context_map": context_map.model_dump(), "goal": goal,
        "criteria": criteria_for(goal), "learner_response": response,
        "previous_turns": [turn.model_dump() for turn in history],
    })
    output.evidence = [item for item in output.evidence if item.response_span and item.response_span in response]
    forbidden = [fact for fact in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "7 pm", "slides 3") if fact.lower() in output.simulated_partner_reply.lower() and fact.lower() not in " ".join(context_map.known_facts).lower()]
    if forbidden:
        output.simulated_partner_reply = "I can clarify, but the exact task and timing still need to be agreed."
        output.simulation_assumptions = ["No deadline or task owner is assumed in this simulation."]
    return output


@dataclass
class PracticeSession:
    practice_id: str
    context_map: ContextMap
    goal: str
    turns: list[PracticeTurn] = field(default_factory=list)
    reflection: Reflection | None = None
    model: object | None = None

    @classmethod
    def start(cls, practice_id: str | None, context_map: ContextMap, goal: str, model=None) -> "PracticeSession":
        criteria_for(goal)
        return cls(practice_id or str(uuid4()), context_map, goal, model=model)

    def respond(self, response: str, retry_of_turn: int | None = None) -> PracticeTurn:
        response = response.strip()
        submitted = [turn for turn in self.turns if turn.retry_of_turn is None]
        if len(submitted) >= 3 and retry_of_turn is None:
            raise PracticeConflict("This practice has reached the three-response limit. Continue to reflection.")
        turn_number = retry_of_turn or len(submitted) + 1
        coached = coach_turn(self.context_map, self.goal, response, self.turns, self.model)
        evidence = coached.evidence
        another = turn_number < 2 or (turn_number < 3 and coached.another_turn_useful)
        turn = PracticeTurn(
            turn_number=turn_number,
            learner_response=response,
            simulated_partner_reply=coached.simulated_partner_reply,
            simulation_assumptions=coached.simulation_assumptions,
            coach_summary=coached.coach_summary,
            strengths=coached.strengths,
            improvements=coached.improvements,
            suggested_revision=coached.suggested_revision,
            evidence=evidence,
            another_turn_useful=another,
            retry_of_turn=retry_of_turn,
        )
        self.turns.append(turn)
        return turn

    def retry_last(self, response: str) -> PracticeTurn:
        if not self.turns:
            raise PracticeConflict("There is no response to retry.")
        original = next((turn for turn in reversed(self.turns) if turn.retry_of_turn is None), self.turns[-1])
        return self.respond(response, retry_of_turn=original.turn_number)

    def reflect(self, initial_assumption: str, next_clarification: str) -> Reflection:
        if not initial_assumption.strip() or not next_clarification.strip():
            raise ValueError("Both reflection answers are required.")
        self.reflection = Reflection(initial_assumption=initial_assumption, next_clarification=next_clarification)
        return self.reflection

