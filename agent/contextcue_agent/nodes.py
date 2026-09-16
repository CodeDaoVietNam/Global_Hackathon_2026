from __future__ import annotations

import hashlib
import re

from .schemas import (
    ContextMap,
    ContextProfile,
    GroundingReport,
    Interpretation,
    ResponseStrategy,
    RetrievalResult,
    SourcedFact,
)


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def input_hash(situation: str, context: str) -> str:
    return hashlib.sha256(f"{normalize_text(situation)}\n{normalize_text(context)}".encode()).hexdigest()


def extract_context(situation: str, additional_context: str = "") -> ContextProfile:
    situation = normalize_text(situation)
    additional_context = normalize_text(additional_context)
    combined = f"{situation} {additional_context}".strip()
    lower = combined.lower()
    quotes = re.findall(r"[“\"]([^”\"]+)[”\"]", combined)
    if not quotes:
        known_phrases = [phrase for phrase in ("can lah", "bojio", "makan", "shiok", "meh") if phrase in lower]
        quotes = known_phrases
    relationship = next((name for marker, name in (
        ("lecturer", "lecturer"), ("professor", "lecturer"), ("supervisor", "supervisor"),
        ("project lead", "project_lead"), ("teammate", "teammate"), ("classmate", "classmate"),
        ("friend", "friend"),
    ) if marker in lower), "unknown")
    channel = next((name for marker, name in (
        ("group chat", "group_chat"), ("whatsapp", "chat"), ("telegram", "chat"),
        ("email", "email"), ("in person", "in_person"),
    ) if marker in lower), "unknown")
    formality = "formal" if relationship in {"lecturer", "supervisor"} or channel == "email" else "informal" if relationship in {"friend", "teammate", "classmate"} else "unknown"
    facts = [SourcedFact(text=situation, source_span=situation)]
    if additional_context:
        facts.append(SourcedFact(text=additional_context, source_span=additional_context))
    boundaries = [segment for segment in re.split(r"(?<=[.!?])\s+", combined) if any(word in segment.lower() for word in ("uncomfortable", "hurt", "stop", "boundary", "not joking"))]
    unresolved = []
    if relationship == "unknown": unresolved.append("Who is the other person in relation to you?")
    if channel == "unknown": unresolved.append("Was this in person, chat, or email?")
    if not any(word in lower for word in ("goal", "want", "need", "trying", "confirm", "understand")):
        unresolved.append("What outcome do you want from your next response?")
    return ContextProfile(
        relationship=relationship,
        channel=channel,
        formality=formality,
        explicit_facts=facts,
        quoted_language=quotes,
        boundary_signals=boundaries,
        unresolved_questions=unresolved,
    )


def classify_scenario(text: str, evidence: RetrievalResult | None = None) -> str:
    if evidence and evidence.items:
        return evidence.items[0].scenario_family
    lower = text.lower()
    if any(term in lower for term in ("joke", "joking", "funny", "accent", "bojio", "shiok")): return "humour"
    if any(term in lower for term in ("feedback", "draft", "claim", "improve", "supported")): return "feedback"
    if any(term in lower for term in ("team", "slides", "project", "deadline", "meeting")): return "academic_teamwork"
    return "campus_life"


def needs_context(profile: ContextProfile, retrieval: RetrievalResult, situation: str) -> bool:
    words = re.findall(r"[a-z0-9]+", situation.lower())
    vague = len(words) <= 4 or situation.lower().strip(" .!?") in {"they said okay", "they said yes", "it was weird"}
    return not retrieval.items and vague and len(profile.unresolved_questions) >= 2


def build_interpretations(profile: ContextProfile, retrieval: RetrievalResult) -> list[Interpretation]:
    results: list[Interpretation] = []
    for item in retrieval.items[:2]:
        for candidate in item.possible_interpretations[:1]:
            statement = candidate.get("interpretation", "A context-dependent interpretation may apply.")
            condition = candidate.get("when_plausible", "If the surrounding context matches the evidence card.")
            results.append(Interpretation(
                statement=statement,
                plausibility_conditions=[condition],
                supporting_signals=item.matched_fields,
                contradicting_signals=profile.unresolved_questions[:1],
                evidence_ids=[item.card_id],
                support_status="contextual_hypothesis",
            ))
    if not results:
        results.append(Interpretation(
            statement="The wording alone is not enough to determine the speaker's intent.",
            plausibility_conditions=["More information about the relationship, channel, and intended action is needed."],
            supporting_signals=[],
            contradicting_signals=profile.unresolved_questions,
            evidence_ids=[],
            support_status="insufficient_context",
        ))
    return results


def validate_grounding(interpretations: list[Interpretation], evidence: list, known_text: str, repair_count: int = 0) -> GroundingReport:
    valid_ids = {item.card_id for item in evidence}
    cited = {evidence_id for item in interpretations for evidence_id in item.evidence_ids}
    invalid = sorted(cited - valid_ids)
    lower_known = known_text.lower()
    unsupported = []
    fictional = []
    for item in interpretations:
        lower = item.statement.lower()
        for marker in ("monday", "tuesday", "wednesday", "thursday", "friday", "slides 3", "7 pm", "submitted"):
            if marker in lower and marker not in lower_known:
                unsupported.append(item.statement)
                fictional.append(marker)
                break
    stereotype_terms = ("all singaporeans", "singaporeans always", "asians always", "because of their nationality")
    stereotypes = [item.statement for item in interpretations if any(term in item.statement.lower() for term in stereotype_terms)]
    repair = bool(invalid or unsupported or stereotypes)
    return GroundingReport(
        valid_evidence_ids=sorted(cited & valid_ids),
        invalid_evidence_ids=invalid,
        unsupported_claims=unsupported,
        copied_fictional_details=fictional,
        stereotype_risks=stereotypes,
        repair_required=repair,
        repair_count=repair_count,
    )


def response_strategies(profile: ContextProfile) -> list[ResponseStrategy]:
    formal = profile.formality == "formal"
    return [
        ResponseStrategy(
            strategy_type="clarification", communication_goal="Clarify meaning without assigning intent",
            sample_wording="Could you clarify what you mean in this situation?",
            tone="curious and neutral", formality="formal" if formal else "neutral",
            why_low_risk="It asks for observable information.", assumption_avoided="That the wording proves intent.",
            do_not_use_when="The person has already given an explicit answer.",
        ),
        ResponseStrategy(
            strategy_type="confirmation", communication_goal="Make the next action explicit",
            sample_wording="Just to confirm, what should each of us do next, and by when?",
            tone="clear and collaborative", formality="formal" if formal else "neutral",
            why_low_risk="It separates agreement from task ownership.", assumption_avoided="That a general yes is a complete commitment.",
            do_not_use_when="No action or commitment is needed.",
        ),
        ResponseStrategy(
            strategy_type="boundary", communication_goal="State a respectful limit",
            sample_wording="I am not comfortable with that. Please do not repeat it.",
            tone="calm and direct", formality="neutral",
            why_low_risk="It describes your boundary without diagnosing the other person.", assumption_avoided="That humour removes impact.",
            do_not_use_when="You only need factual clarification and no boundary was crossed.",
        ),
    ]


def build_reference_artifact(
    profile: ContextProfile,
    scenario_family: str,
    retrieval: RetrievalResult,
    grounding: GroundingReport | None = None,
    perspectives: list[Interpretation] | None = None,
) -> ContextMap:
    perspectives = perspectives if perspectives is not None else build_interpretations(profile, retrieval)
    grounding = grounding or validate_grounding(perspectives, retrieval.items, " ".join(f.text for f in profile.explicit_facts))
    risks = [item.do_not_assume for item in retrieval.items if item.do_not_assume]
    if not risks: risks = ["Do not infer personality, nationality, or intent from one ambiguous interaction."]
    missing = list(dict.fromkeys(profile.unresolved_questions + [gap for item in retrieval.items for gap in item.missing_context]))[:5]
    return ContextMap(
        known_facts=[fact.text for fact in profile.explicit_facts],
        missing_context=missing,
        perspectives=perspectives,
        assumption_risks=risks[:4],
        safest_next_action="Ask one answerable question, then confirm the action or boundary that matters.",
        response_strategies=response_strategies(profile),
        evidence_trail=retrieval.items,
        grounding_summary=("Evidence references validated; interpretations remain conditional." if not grounding.repair_required else "Unsupported details were removed; use the clarification path."),
        retrieval_mode=retrieval.mode,
    )
