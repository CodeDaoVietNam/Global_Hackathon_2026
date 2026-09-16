from __future__ import annotations

from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from .nodes import (
    build_interpretations,
    build_reference_artifact,
    classify_scenario,
    extract_context,
    input_hash,
    needs_context,
    normalize_text,
    validate_grounding,
)
from .retrieval import HybridRetriever
from .schemas import ContextProfile, GroundingReport, Interpretation, InterpretationBatch, RetrievalResult
from .state import ContextCueState


def build_context_graph(retriever: HybridRetriever, checkpointer, model=None):
    def normalize(state: ContextCueState):
        situation = normalize_text(state["situation"])
        context = normalize_text(state.get("additional_context", ""))
        return {"situation": situation, "additional_context": context, "input_hash": input_hash(situation, context), "status": "extracting"}

    def extract(state: ContextCueState):
        profile = extract_context(state["situation"], state.get("additional_context", ""))
        return {"profile": profile.model_dump(), "status": "retrieving"}

    def retrieve(state: ContextCueState):
        profile = ContextProfile.model_validate(state["profile"])
        result = retriever.search(f'{state["situation"]} {state.get("additional_context", "")}', profile)
        family = classify_scenario(state["situation"], result)
        return {"retrieval": result.model_dump(), "scenario_family": family}

    def gap(state: ContextCueState):
        profile = ContextProfile.model_validate(state["profile"])
        retrieval = RetrievalResult.model_validate(state["retrieval"])
        if needs_context(profile, retrieval, state["situation"]):
            answer = interrupt({"questions": profile.unresolved_questions[:3], "known_facts": [f.text for f in profile.explicit_facts]})
            appended = " ".join(str(value) for value in answer.values()) if isinstance(answer, dict) else str(answer)
            updated = extract_context(state["situation"], f'{state.get("additional_context", "")} {appended}')
            return {"profile": updated.model_dump(), "additional_context": normalize_text(f'{state.get("additional_context", "")} {appended}'), "gaps": updated.unresolved_questions, "status": "interpreting"}
        return {"gaps": profile.unresolved_questions, "status": "interpreting"}

    def interpret(state: ContextCueState):
        profile = ContextProfile.model_validate(state["profile"])
        retrieval = RetrievalResult.model_validate(state["retrieval"])
        if model:
            batch = model.invoke(InterpretationBatch, "interpret_context", {
                "profile": profile.model_dump(),
                "evidence": [{
                    "card_id": item.card_id, "title": item.title,
                    "scenario_family": item.scenario_family,
                    "matched_fields": item.matched_fields,
                    "evidence_limit": item.evidence_limit,
                    "possible_interpretations": item.possible_interpretations,
                } for item in retrieval.items],
            })
            values = batch.interpretations
        else:
            values = build_interpretations(profile, retrieval)
        return {"interpretations": [item.model_dump() for item in values], "status": "validating"}

    def validate(state: ContextCueState):
        interpretations = [Interpretation.model_validate(item) for item in state["interpretations"]]
        retrieval = RetrievalResult.model_validate(state["retrieval"])
        known = " ".join(fact["text"] for fact in state["profile"]["explicit_facts"])
        report = validate_grounding(interpretations, retrieval.items, known, state.get("repair_count", 0))
        if model and not report.repair_required:
            critic = model.invoke(GroundingReport, "validate_grounding", {
                "known_facts": [fact["text"] for fact in state["profile"]["explicit_facts"]],
                "interpretations": [item.model_dump() for item in interpretations],
                "valid_evidence_ids": [item.card_id for item in retrieval.items],
            })
            critic.repair_count = state.get("repair_count", 0)
            report = critic
        if report.repair_required:
            repaired = [item for item in interpretations if not set(item.evidence_ids) - {e.card_id for e in retrieval.items} and item.statement not in report.unsupported_claims and item.statement not in report.stereotype_risks]
            if not repaired:
                repaired = [Interpretation(statement="The available evidence is not enough to determine intent.", plausibility_conditions=["Ask the person for clarification."], support_status="insufficient_context")]
            report = validate_grounding(repaired, retrieval.items, known, state.get("repair_count", 0) + 1)
            return {"interpretations": [item.model_dump() for item in repaired], "grounding": report.model_dump(), "repair_count": state.get("repair_count", 0) + 1}
        return {"grounding": report.model_dump()}

    def artifact(state: ContextCueState):
        profile = ContextProfile.model_validate(state["profile"])
        retrieval = RetrievalResult.model_validate(state["retrieval"])
        interpretations = [Interpretation.model_validate(item) for item in state["interpretations"]]
        grounding = GroundingReport.model_validate(state["grounding"])
        context_map = build_reference_artifact(profile, state["scenario_family"], retrieval, grounding, interpretations)
        safe = grounding.repair_required
        return {"artifact": context_map.model_dump(), "status": "safe_result" if safe else "complete"}

    builder = StateGraph(ContextCueState)
    builder.add_node("normalize", normalize)
    builder.add_node("extract", extract)
    builder.add_node("retrieve", retrieve)
    builder.add_node("gap", gap)
    builder.add_node("interpret", interpret)
    builder.add_node("validate", validate)
    builder.add_node("artifact", artifact)
    builder.add_edge(START, "normalize")
    builder.add_edge("normalize", "extract")
    builder.add_edge("extract", "retrieve")
    builder.add_edge("retrieve", "gap")
    builder.add_edge("gap", "interpret")
    builder.add_edge("interpret", "validate")
    builder.add_edge("validate", "artifact")
    builder.add_edge("artifact", END)
    return builder.compile(checkpointer=checkpointer)
