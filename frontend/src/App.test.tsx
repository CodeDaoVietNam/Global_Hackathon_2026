import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import { router } from './app/router';
import * as api from './services/api';

vi.mock('./services/api', async () => {
  const actual = await vi.importActual<typeof import('./services/api')>('./services/api');
  return {
    ...actual,
    getConfig: vi.fn(), getContextCards: vi.fn(), createThread: vi.fn(), analyzeContextStream: vi.fn(),
    switchContext: vi.fn(), startPractice: vi.fn(), respondToPractice: vi.fn(), submitReflection: vi.fn(),
    getLearningSummary: vi.fn(),
  };
});

const contextMap = {
  version: '2.0', known_facts: ['My teammate said “can lah” in a group chat.'],
  missing_context: ['Which slides are they agreeing to take?'],
  perspectives: [{ statement: 'They may agree that helping is possible.', plausibility_conditions: ['If the phrase refers to feasibility.'], supporting_signals: ['expression'], contradicting_signals: [], evidence_ids: ['sg-team-01'], support_status: 'contextual_hypothesis' as const }],
  assumption_risks: ['Do not assume a deadline was accepted.'], safest_next_action: 'Confirm the exact task and deadline.',
  response_strategies: [{ strategy_type: 'clarification' as const, communication_goal: 'Clarify the task', sample_wording: 'Could you clarify which slides you can take?', tone: 'neutral', formality: 'neutral', why_low_risk: 'It asks for observable information.', assumption_avoided: 'That agreement includes task ownership.', do_not_use_when: 'The task is already explicit.' }],
  evidence_trail: [{ card_id: 'sg-team-01', version: 'seed-v1', title: 'Agreement needs a referent', scenario_family: 'academic_teamwork', matched_fields: ['expression'], evidence_status: 'synthetic_unreviewed', lexical_rank: 1, semantic_rank: null, fusion_rank: 1, evidence_limit: 'Language background only.', source_ids: ['S1'], possible_interpretations: [], missing_context: [], do_not_assume: '' }],
  grounding_summary: 'Evidence references validated; interpretations remain conditional.', retrieval_mode: 'lexical',
};

beforeEach(async () => {
  await router.navigate('/context-lab');
  localStorage.clear();
  vi.mocked(api.getConfig).mockResolvedValue({ mode: 'gemini', external_ai: true });
  vi.mocked(api.getContextCards).mockResolvedValue([]);
  vi.mocked(api.createThread).mockResolvedValue({ thread_id: 'thread-1', status: 'received' });
  vi.mocked(api.analyzeContextStream).mockResolvedValue({ status: 'complete', questions: [], known_facts: contextMap.known_facts, context_map: contextMap });
  vi.mocked(api.startPractice).mockResolvedValue({ practice_id: 'practice-1', goal: 'clarify_before_inferring', criteria: ['asks_answerable_question'], strategies: contextMap.response_strategies, turns: [] });
  vi.mocked(api.respondToPractice).mockResolvedValue({ turn: { turn_number: 1, learner_response: 'Could you clarify which slides?', simulated_partner_reply: 'I meant slides 3 to 5.', simulation_assumptions: ['The partner is willing to clarify; this is a simulation.'], coach_summary: 'Clear question.', strengths: ['You asked a question.'], improvements: [], suggested_revision: 'Could you clarify which slides?', evidence: [], another_turn_useful: true, retry_of_turn: null } });
  vi.mocked(api.submitReflection).mockResolvedValue({ reflection: { initial_assumption: 'I assumed agreement.', next_clarification: 'I will clarify the task.' } });
  vi.mocked(api.getLearningSummary).mockResolvedValue({ progress_meaning: 'Counts of criteria demonstrated in practice.', skill_evidence: [], sessions: [], recommendation: { skill: 'adapt_formality', reason: 'Needs recent practice.' } });
});

describe('ContextCue V2 learning flow', () => {
  it('shows the landing page at the root route', async () => {
    await router.navigate('/');
    render(<App />);
    expect(await screen.findByRole('heading', { name: /interpret ambiguous communication/i })).toBeInTheDocument();
  });

  it('renders a grounded Context Map from the learner situation', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.type(screen.getByLabelText(/what happened/i), 'My teammate said can lah.');
    await user.click(screen.getByRole('button', { name: /build context map/i }));
    expect(await screen.findByRole('heading', { name: /context map/i })).toBeInTheDocument();
    expect(screen.getByText(/which slides are they agreeing/i)).toBeInTheDocument();
    expect(screen.getByText(/do not assume a deadline/i)).toBeInTheDocument();
    expect(screen.getByText(/synthetic unreviewed/i)).toBeInTheDocument();
  });

  it('runs practice and stores learner-authored reflection', async () => {
    const user = userEvent.setup(); render(<App />);
    await user.type(screen.getByLabelText(/what happened/i), 'My teammate said can lah.');
    await user.click(screen.getByRole('button', { name: /build context map/i }));
    await screen.findByRole('heading', { name: /context map/i });
    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.type(screen.getByLabelText(/your response/i), 'Could you clarify which slides?');
    await user.click(screen.getByRole('button', { name: /send response/i }));
    expect(await screen.findByText(/this is a simulation/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/what did you initially assume/i), 'I assumed agreement.');
    await user.type(screen.getByLabelText(/what would you clarify next time/i), 'I will clarify the task.');
    await user.click(screen.getByRole('button', { name: /save reflection/i }));
    expect(await screen.findByText(/reflection saved/i)).toBeInTheDocument();
  });
});
