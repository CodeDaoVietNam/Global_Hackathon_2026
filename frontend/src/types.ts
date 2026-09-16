export type ScenarioType = 'teamwork' | 'feedback' | 'singlish-idioms' | 'campus-life';

export type RelationshipType = 'peer-teammate' | 'project-lead' | 'new-acquaintance' | 'senior-mentor';

export interface ContributedCardSubmission {
  phrase: string;
  contextScenario: string;
  scenarioType: ScenarioType;
  relationship: RelationshipType;
  literalMeaning: string;
  perspective1: string;
  perspective2: string;
  whatNotToAssume: string;
  suggestedReply: string;
  contributorFaculty: string;
}

export interface AppConfig {
  mode: 'reference' | 'gemini';
  external_ai: boolean;
}

export interface SourceRecord {
  id: string;
  title: string;
  url: string;
  supports: string;
  limits: string;
}

export interface RetrievedCard {
  id: string;
  category: string;
  title: string;
  setting: string;
  expression_or_event: string;
  scenario: string;
  user_goal: string;
  possible_interpretations: Array<{ interpretation: string; when_plausible: string }>;
  missing_context: string[];
  do_not_assume: string;
  suggested_response: string;
  learning_check: { prompt: string; success_criteria: string[] };
  source_ids: string[];
  evidence_scope: string;
  provenance: { review_status: string; approved_for_verified_retrieval: boolean };
}

export interface AnalyzeInput {
  situation: string;
  context: string;
}

export interface AnalyzeResult {
  mode: 'reference' | 'gemini';
  notice: string;
  summary: string;
  possible_meanings: string[];
  do_not_assume: string[];
  clarifying_questions: string[];
  next_action: string;
  learning_prompt: string;
  card_ids: string[];
  cards: RetrievedCard[];
  sources: SourceRecord[];
  request_id: string;
}

export interface PracticeInput extends AnalyzeInput {
  card_id: string;
  response: string;
}

export interface PracticeResult {
  mode: 'self_check' | 'gemini';
  notice: string;
  criteria: string[];
  feedback: string;
  strengths: string[];
  improvements: string[];
  suggested_revision: string;
  request_id: string;
}

export interface ContributionResult {
  id: string;
  status: 'pending_review';
  message: string;
}

export interface SourcedInterpretation {
  statement: string;
  plausibility_conditions: string[];
  supporting_signals: string[];
  contradicting_signals: string[];
  evidence_ids: string[];
  support_status: 'evidence_supported' | 'contextual_hypothesis' | 'insufficient_context';
}

export interface EvidenceItem {
  card_id: string; version: string; title: string; scenario_family: string;
  matched_fields: string[]; evidence_status: string; lexical_rank: number | null;
  semantic_rank: number | null; fusion_rank: number | null; evidence_limit: string;
  source_ids: string[]; possible_interpretations: Array<Record<string, string>>;
  missing_context: string[]; do_not_assume: string;
}

export interface ResponseStrategy {
  strategy_type: 'clarification' | 'confirmation' | 'boundary' | 'formal';
  communication_goal: string; sample_wording: string; tone: string; formality: string;
  why_low_risk: string; assumption_avoided: string; do_not_use_when: string;
}

export interface ContextMap {
  version: string; known_facts: string[]; missing_context: string[];
  perspectives: SourcedInterpretation[]; assumption_risks: string[];
  safest_next_action: string; response_strategies: ResponseStrategy[];
  evidence_trail: EvidenceItem[]; grounding_summary: string; retrieval_mode: string;
}

export interface ThreadResult { thread_id: string; status: string; }
export interface ContextAnalysisResult {
  status: 'awaiting_context' | 'complete' | 'safe_result';
  questions: string[]; known_facts: string[]; context_map: ContextMap | null;
}
export interface ContextSwitchResult {
  override: Record<string, string>; changed: Record<string, { before: string; after: string }>;
  unchanged_facts: string[]; context_map: ContextMap;
}
export interface CriterionEvidence { criterion_id: string; response_span: string; demonstrated: boolean; explanation: string; }
export interface PracticeTurn {
  turn_number: number; learner_response: string; simulated_partner_reply: string;
  simulation_assumptions: string[]; coach_summary: string; strengths: string[];
  improvements: string[]; suggested_revision: string; evidence: CriterionEvidence[];
  another_turn_useful: boolean; retry_of_turn: number | null;
}
export interface PracticeRun {
  practice_id: string; goal: string; criteria: string[]; strategies: ResponseStrategy[]; turns: PracticeTurn[];
}
export interface LearningSummary {
  progress_meaning: string;
  skill_evidence: Array<{ criterion_id: string; count: number; last_demonstrated: string }>;
  sessions: Array<{ thread_id: string; status: string; situation: string; updated_at: string }>;
  recommendation: { skill: string; reason: string; scenario_family?: string | null; card_id?: string | null; title?: string | null };
}
