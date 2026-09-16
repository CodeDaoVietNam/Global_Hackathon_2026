from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SourcedFact(StrictModel):
    text: str
    source_span: str


class ContextProfile(StrictModel):
    relationship: str = "unknown"
    setting: str = "Singapore campus"
    channel: str = "unknown"
    formality: str = "unknown"
    user_goal: str = "understand and respond safely"
    explicit_facts: list[SourcedFact] = Field(default_factory=list)
    quoted_language: list[str] = Field(default_factory=list)
    boundary_signals: list[str] = Field(default_factory=list)
    unresolved_questions: list[str] = Field(default_factory=list)


class EvidenceItem(StrictModel):
    card_id: str
    version: str
    title: str
    scenario_family: str
    matched_fields: list[str] = Field(default_factory=list)
    evidence_status: str
    lexical_rank: int | None = None
    semantic_rank: int | None = None
    fusion_rank: int | None = None
    evidence_limit: str = ""
    source_ids: list[str] = Field(default_factory=list)
    possible_interpretations: list[dict] = Field(default_factory=list)
    missing_context: list[str] = Field(default_factory=list)
    do_not_assume: str = ""


class RetrievalResult(StrictModel):
    items: list[EvidenceItem] = Field(default_factory=list, max_length=3)
    mode: Literal["lexical", "hybrid", "lexical_fallback"] = "lexical"
    fallback_reason: str | None = None


SupportStatus = Literal["evidence_supported", "contextual_hypothesis", "insufficient_context"]


class Interpretation(StrictModel):
    statement: str
    plausibility_conditions: list[str] = Field(default_factory=list)
    supporting_signals: list[str] = Field(default_factory=list)
    contradicting_signals: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    support_status: SupportStatus


class InterpretationBatch(StrictModel):
    interpretations: list[Interpretation] = Field(min_length=1, max_length=3)


class GroundingReport(StrictModel):
    valid_evidence_ids: list[str] = Field(default_factory=list)
    invalid_evidence_ids: list[str] = Field(default_factory=list)
    unsupported_claims: list[str] = Field(default_factory=list)
    copied_fictional_details: list[str] = Field(default_factory=list)
    stereotype_risks: list[str] = Field(default_factory=list)
    repair_required: bool = False
    repair_count: int = 0


class ResponseStrategy(StrictModel):
    strategy_type: Literal["clarification", "confirmation", "boundary", "formal"]
    communication_goal: str
    sample_wording: str
    tone: str
    formality: str
    why_low_risk: str
    assumption_avoided: str
    do_not_use_when: str


class ContextMap(StrictModel):
    version: str = "2.0"
    known_facts: list[str]
    missing_context: list[str]
    perspectives: list[Interpretation]
    assumption_risks: list[str]
    safest_next_action: str
    response_strategies: list[ResponseStrategy]
    evidence_trail: list[EvidenceItem]
    grounding_summary: str
    retrieval_mode: str


class ContextSwitchComparison(StrictModel):
    override: dict[str, str]
    changed: dict[str, dict[str, str]]
    unchanged_facts: list[str]
    context_map: ContextMap


class GraphEvent(StrictModel):
    event: str
    metadata: dict = Field(default_factory=dict)


class CriterionEvidence(StrictModel):
    criterion_id: str
    response_span: str
    demonstrated: bool
    explanation: str


class PracticeTurn(StrictModel):
    turn_number: int
    learner_response: str
    simulated_partner_reply: str
    simulation_assumptions: list[str] = Field(default_factory=list)
    coach_summary: str
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    suggested_revision: str
    evidence: list[CriterionEvidence] = Field(default_factory=list)
    another_turn_useful: bool
    retry_of_turn: int | None = None


class CoachOutput(StrictModel):
    simulated_partner_reply: str
    simulation_assumptions: list[str] = Field(default_factory=list, max_length=3)
    coach_summary: str
    strengths: list[str] = Field(default_factory=list, max_length=3)
    improvements: list[str] = Field(default_factory=list, max_length=3)
    suggested_revision: str
    evidence: list[CriterionEvidence] = Field(default_factory=list)
    another_turn_useful: bool


class Reflection(StrictModel):
    initial_assumption: str
    next_clarification: str
