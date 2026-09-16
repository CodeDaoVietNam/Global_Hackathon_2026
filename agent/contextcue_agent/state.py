from typing import Any, Literal, TypedDict


class ContextCueState(TypedDict, total=False):
    situation: str
    additional_context: str
    input_hash: str
    profile: dict[str, Any]
    scenario_family: str
    gaps: list[str]
    retrieval: dict[str, Any]
    interpretations: list[dict[str, Any]]
    grounding: dict[str, Any]
    artifact: dict[str, Any]
    status: Literal[
        "received", "extracting", "retrieving", "awaiting_context",
        "interpreting", "validating", "complete", "safe_result", "failed"
    ]
    repair_count: int
    recoverable_error: str | None

