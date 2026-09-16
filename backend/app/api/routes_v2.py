from __future__ import annotations

import json
from typing import Annotated, Literal

from fastapi import APIRouter, Header, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from langgraph.types import Command
from pydantic import BaseModel, Field, StringConstraints

from contextcue_agent.practice import GOAL_CRITERIA, PracticeConflict, PracticeSession, strategies_for
from contextcue_agent.schemas import ContextMap, PracticeTurn


router = APIRouter(prefix="/api/v2")
LearnerId = Annotated[str, Header(alias="X-Learner-ID", min_length=3, max_length=100)]
IdempotencyKey = Annotated[str | None, Header(alias="Idempotency-Key", max_length=100)]
Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]
ContextText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=4000)]


class CreateThreadRequest(BaseModel):
    pass


class AnalyzeV2Request(BaseModel):
    situation: Text
    context: ContextText = ""


class ResumeContextRequest(BaseModel):
    answers: dict[str, Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]] = Field(min_length=1, max_length=3)


class SwitchContextRequest(BaseModel):
    overrides: dict[Literal["relationship", "channel", "formality", "deadline_status", "tone_status", "prior_agreement_status"], Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]] = Field(min_length=1, max_length=3)


class StartPracticeRequest(BaseModel):
    goal: Literal[
        "clarify_before_inferring", "make_commitments_explicit", "adapt_formality",
        "handle_humour_ambiguity", "give_actionable_feedback", "receive_direct_feedback",
        "set_respectful_boundaries", "use_evidence_carefully",
    ]


class PracticeResponseRequest(BaseModel):
    response: Text
    retry_of_turn: int | None = Field(default=None, ge=1, le=3)


class ReflectionRequest(BaseModel):
    initial_assumption: str = Field(min_length=1, max_length=2000)
    next_clarification: str = Field(min_length=1, max_length=2000)


def runtime(request: Request):
    return request.app.state.contextcue_v2


def owned_thread(rt, thread_id: str, learner_id: str) -> dict:
    thread = rt.database.get_thread(thread_id, learner_id)
    if not thread:
        raise HTTPException(404, "Thread not found.")
    return thread


def analysis_payload(result: dict) -> dict:
    interrupts = result.get("__interrupt__", [])
    if interrupts:
        value = interrupts[0].value
        return {"status": "awaiting_context", "questions": value["questions"], "known_facts": value["known_facts"], "context_map": None}
    return {"status": result["status"], "questions": [], "known_facts": result["artifact"]["known_facts"], "context_map": result["artifact"]}


async def run_analysis(rt, thread: dict, request: AnalyzeV2Request, idempotency_key: str | None):
    existing = rt.database.get_context_map(thread["thread_id"], thread["learner_id"])
    if existing and idempotency_key and thread.get("analysis_idempotency_key") == idempotency_key:
        return {"status": thread["status"], "questions": [], "known_facts": existing["known_facts"], "context_map": existing}
    rt.database.update_analysis(thread["thread_id"], thread["learner_id"], request.situation, request.context, "extracting", idempotency_key)
    result = await rt.invoke(
        {"situation": request.situation, "additional_context": request.context, "status": "received", "repair_count": 0},
        config={"configurable": {"thread_id": thread["thread_id"]}},
    )
    payload = analysis_payload(result)
    rt.database.update_status(thread["thread_id"], thread["learner_id"], payload["status"], result.get("additional_context", request.context))
    if payload["context_map"]:
        rt.database.save_context_map(thread["thread_id"], result["input_hash"], payload["context_map"])
    return payload


@router.post("/threads", status_code=status.HTTP_201_CREATED)
async def create_thread(_: CreateThreadRequest, request: Request, learner_id: LearnerId):
    return runtime(request).database.create_thread(learner_id)


@router.get("/threads/{thread_id}")
async def get_thread(thread_id: str, request: Request, learner_id: LearnerId):
    return owned_thread(runtime(request), thread_id, learner_id)


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(thread_id: str, request: Request, learner_id: LearnerId):
    rt = runtime(request)
    owned_thread(rt, thread_id, learner_id)
    rt.database.delete_thread(thread_id, learner_id)
    await rt.delete_checkpoints(thread_id)
    return Response(status_code=204)


@router.post("/threads/{thread_id}/analyze")
async def analyze(thread_id: str, body: AnalyzeV2Request, request: Request, learner_id: LearnerId, idempotency_key: IdempotencyKey = None):
    rt = runtime(request)
    thread = owned_thread(rt, thread_id, learner_id)
    return await run_analysis(rt, thread, body, idempotency_key)


@router.post("/threads/{thread_id}/analyze/stream")
async def analyze_stream(thread_id: str, body: AnalyzeV2Request, request: Request, learner_id: LearnerId, idempotency_key: IdempotencyKey = None):
    rt = runtime(request)
    thread = owned_thread(rt, thread_id, learner_id)

    def event(name: str, data: dict) -> str:
        return f"event: {name}\ndata: {json.dumps(data)}\n\n"

    def business_event(node: str, update: dict) -> tuple[str, dict] | None:
        if node == "extract":
            return "context_extracted", {"status": update.get("status", "retrieving")}
        if node == "retrieve":
            retrieval = update.get("retrieval", {})
            return "retrieval_completed", {
                "card_count": len(retrieval.get("items", [])),
                "retrieval_mode": retrieval.get("mode"),
            }
        if node == "validate":
            return "grounding_checked", {"repair_count": update.get("repair_count", 0)}
        if node == "artifact":
            artifact = update.get("artifact", {})
            return "context_map_ready", {"retrieval_mode": artifact.get("retrieval_mode")}
        return None

    async def stream():
        yield event("analysis_started", {"thread_id": thread_id})
        rt.database.update_analysis(thread_id, learner_id, body.situation, body.context, "extracting", idempotency_key)
        config = {"configurable": {"thread_id": thread_id}}
        graph_input = {
            "situation": body.situation,
            "additional_context": body.context,
            "status": "received",
            "repair_count": 0,
        }

        if rt.asynchronous:
            async for updates in rt.graph.astream(graph_input, config=config, stream_mode="updates"):
                for node, update in updates.items():
                    mapped = business_event(node, update)
                    if mapped:
                        yield event(*mapped)
            graph_state = await rt.graph.aget_state(config)
        else:
            for updates in rt.graph.stream(graph_input, config=config, stream_mode="updates"):
                for node, update in updates.items():
                    mapped = business_event(node, update)
                    if mapped:
                        yield event(*mapped)
            graph_state = rt.graph.get_state(config)

        result = graph_state.values
        payload = analysis_payload(result)
        rt.database.update_status(thread_id, learner_id, payload["status"], result.get("additional_context", body.context))
        if payload["context_map"]:
            rt.database.save_context_map(thread_id, result["input_hash"], payload["context_map"])
        if payload["status"] == "awaiting_context":
            yield event("context_gap_found", {"question_count": len(payload["questions"])})
        yield event("analysis_completed", {"status": payload["status"], "result": payload})
    return StreamingResponse(stream(), media_type="text/event-stream")


@router.post("/threads/{thread_id}/context")
async def resume_context(thread_id: str, body: ResumeContextRequest, request: Request, learner_id: LearnerId):
    rt = runtime(request)
    thread = owned_thread(rt, thread_id, learner_id)
    if thread["status"] != "awaiting_context":
        raise HTTPException(409, "This thread is not waiting for context.")
    result = await rt.invoke(Command(resume=body.answers), config={"configurable": {"thread_id": thread_id}})
    payload = analysis_payload(result)
    rt.database.update_status(thread_id, learner_id, payload["status"], result.get("additional_context"))
    if payload["context_map"]:
        rt.database.save_context_map(thread_id, result["input_hash"], payload["context_map"])
    return payload


@router.post("/threads/{thread_id}/context/evidence-only")
async def resume_context_evidence_only(thread_id: str, request: Request, learner_id: LearnerId):
    rt = runtime(request)
    thread = owned_thread(rt, thread_id, learner_id)
    if thread["status"] != "awaiting_context":
        raise HTTPException(409, "This thread is not waiting for context.")
    result = await rt.invoke(
        Command(resume={"evidence_only": "Proceed with available evidence only."}),
        config={"configurable": {"thread_id": thread_id}},
    )
    payload = analysis_payload(result)
    rt.database.update_status(thread_id, learner_id, payload["status"], result.get("additional_context"))
    if payload["context_map"]:
        rt.database.save_context_map(thread_id, result["input_hash"], payload["context_map"])
    return payload


@router.get("/threads/{thread_id}/context-map")
async def get_context_map(thread_id: str, request: Request, learner_id: LearnerId):
    rt = runtime(request)
    owned_thread(rt, thread_id, learner_id)
    artifact = rt.database.get_context_map(thread_id, learner_id)
    if not artifact:
        raise HTTPException(409, "Context Map is not ready.")
    return artifact


@router.post("/threads/{thread_id}/switch-context")
async def switch_context(thread_id: str, body: SwitchContextRequest, request: Request, learner_id: LearnerId):
    rt = runtime(request)
    thread = owned_thread(rt, thread_id, learner_id)
    artifact = rt.database.get_context_map(thread_id, learner_id)
    if not artifact:
        raise HTTPException(409, "Complete analysis before switching context.")
    before_values = {"relationship": "unknown", "channel": "unknown", "formality": "unknown", "deadline_status": "unknown", "tone_status": "unknown", "prior_agreement_status": "unknown"}
    lowered = f'{thread["situation"]} {thread["additional_context"]}'.lower()
    for value in ("teammate", "lecturer", "supervisor", "friend", "classmate"):
        if value in lowered: before_values["relationship"] = value
    for marker, value in (("group chat", "group_chat"), ("email", "email"), ("in person", "in_person")):
        if marker in lowered: before_values["channel"] = value
    if before_values["relationship"] in {"lecturer", "supervisor"} or before_values["channel"] == "email": before_values["formality"] = "formal"
    changed = {key: {"before": before_values[key], "after": value} for key, value in body.overrides.items() if before_values.get(key) != value}
    switched = json.loads(json.dumps(artifact))
    changed_strategies = []
    if body.overrides.get("formality") == "formal" or body.overrides.get("relationship") in {"lecturer", "supervisor"}:
        for strategy in switched.get("response_strategies", []):
            strategy["formality"] = "formal"
            if strategy.get("strategy_type") == "clarification":
                strategy["sample_wording"] = "Could you please clarify what you mean in this situation?"
                changed_strategies.append(strategy)
    reasons = []
    if "relationship" in body.overrides:
        reasons.append(f"Relationship shifted to {body.overrides['relationship']}, altering expected social distance.")
    if "channel" in body.overrides:
        reasons.append(f"Channel shifted to {body.overrides['channel']}, altering immediacy and documentation trail.")
    if "formality" in body.overrides:
        reasons.append(f"Formality adjusted to {body.overrides['formality']}, shifting tone requirements.")

    return {
        "override": body.overrides,
        "changed": changed,
        "unchanged_facts": artifact.get("known_facts", []),
        "changed_facts": [],
        "changed_interpretations": switched.get("possible_perspectives", []),
        "changed_strategies": changed_strategies,
        "changed_evidence": artifact.get("evidence_trail", []),
        "reasons": reasons,
        "context_map": switched,
    }


def owned_practice(rt, thread_id: str, practice_id: str, learner_id: str) -> dict:
    owned_thread(rt, thread_id, learner_id)
    practice = rt.database.get_practice(practice_id, thread_id, learner_id)
    if not practice:
        raise HTTPException(404, "Practice run not found.")
    return practice


@router.post("/threads/{thread_id}/practice", status_code=status.HTTP_201_CREATED)
async def start_practice(thread_id: str, body: StartPracticeRequest, request: Request, learner_id: LearnerId):
    rt = runtime(request)
    owned_thread(rt, thread_id, learner_id)
    artifact = rt.database.get_context_map(thread_id, learner_id)
    if not artifact:
        raise HTTPException(409, "Complete a Context Map before practice.")
    practice = rt.database.create_practice(thread_id, learner_id, body.goal)
    context_map = ContextMap.model_validate(artifact)
    return {**practice, "criteria": GOAL_CRITERIA[body.goal], "strategies": [item.model_dump() for item in strategies_for(context_map, body.goal)], "turns": []}


@router.get("/threads/{thread_id}/practice/{practice_id}")
async def get_practice(thread_id: str, practice_id: str, request: Request, learner_id: LearnerId):
    rt = runtime(request)
    practice = owned_practice(rt, thread_id, practice_id, learner_id)
    return {**practice, "turns": rt.database.list_turns(practice_id)}


@router.post("/threads/{thread_id}/practice/{practice_id}/respond")
async def respond(thread_id: str, practice_id: str, body: PracticeResponseRequest, request: Request, learner_id: LearnerId, idempotency_key: IdempotencyKey = None):
    if not idempotency_key:
        raise HTTPException(422, "Idempotency-Key is required for practice responses.")
    rt = runtime(request)
    practice = owned_practice(rt, thread_id, practice_id, learner_id)
    existing = rt.database.get_turn_by_key(practice_id, idempotency_key)
    if existing:
        return {"turn": existing}
    context_map = ContextMap.model_validate(rt.database.get_context_map(thread_id, learner_id))
    session = PracticeSession.start(practice_id, context_map, practice["goal"], rt.model)
    session.turns = [PracticeTurn.model_validate(item) for item in rt.database.list_turns(practice_id)]
    try:
        turn = session.respond(body.response, body.retry_of_turn)
    except PracticeConflict as exc:
        raise HTTPException(409, str(exc)) from exc
    rt.database.save_turn(practice_id, idempotency_key, turn.model_dump())
    return {"turn": turn.model_dump()}


@router.post("/threads/{thread_id}/practice/{practice_id}/reflection")
async def reflect(thread_id: str, practice_id: str, body: ReflectionRequest, request: Request, learner_id: LearnerId):
    rt = runtime(request)
    practice = owned_practice(rt, thread_id, practice_id, learner_id)
    reflection = rt.database.save_reflection(practice, body.initial_assumption, body.next_clarification)
    return {"reflection": reflection}


@router.get("/learning/{learner_id}")
async def learning(learner_id: str, request: Request, header_learner_id: LearnerId):
    if learner_id != header_learner_id:
        raise HTTPException(404, "Learning profile not found.")
    rt = runtime(request)
    summary = rt.database.learning_summary(learner_id)
    counts = {item["criterion_id"]: item["count"] for item in summary["skill_evidence"]}
    next_goal = min(GOAL_CRITERIA, key=lambda goal: (sum(counts.get(criterion, 0) for criterion in GOAL_CRITERIA[goal]), list(GOAL_CRITERIA).index(goal)))
    last_map = rt.database.get_context_map(summary["sessions"][0]["thread_id"], learner_id) if summary["sessions"] else None
    last_family = last_map["evidence_trail"][0]["scenario_family"] if last_map and last_map["evidence_trail"] else None
    last_card = last_map["evidence_trail"][0]["card_id"] if last_map and last_map["evidence_trail"] else None
    candidates = [card for card in rt.retriever.repository.eligible_cards() if card["category"] != last_family and card["id"] != last_card]
    recommended_card = candidates[0] if candidates else None
    return {
        "progress_meaning": "Counts of criteria demonstrated in ContextCue practice; this is not a cultural-intelligence score.",
        **summary,
        "recommendation": {
            "skill": next_goal,
            "scenario_family": recommended_card["category"] if recommended_card else None,
            "card_id": recommended_card["id"] if recommended_card else None,
            "title": recommended_card["title"] if recommended_card else None,
            "reason": "This skill has the least demonstrated practice evidence; the suggested card changes scenario family when an alternative exists.",
        },
    }


@router.get("/learning/{learner_id}/sessions")
async def learning_sessions(learner_id: str, request: Request, header_learner_id: LearnerId):
    if learner_id != header_learner_id:
        raise HTTPException(404, "Learning profile not found.")
    return {"sessions": runtime(request).database.learning_summary(learner_id)["sessions"]}


@router.delete("/learning/{learner_id}/sessions/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_learning_session(learner_id: str, thread_id: str, request: Request, header_learner_id: LearnerId):
    if learner_id != header_learner_id:
        raise HTTPException(404, "Learning profile not found.")
    return await delete_thread(thread_id, request, header_learner_id)
