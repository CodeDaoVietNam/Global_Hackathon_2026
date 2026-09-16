import type {
  AnalyzeInput,
  AnalyzeResult,
  AppConfig,
  ContributedCardSubmission,
  ContributionResult,
  PracticeInput,
  PracticeResult,
  RetrievedCard,
  ContextAnalysisResult, ContextSwitchResult, LearningSummary, PracticeRun, PracticeTurn, ThreadResult,
} from '../types';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const STORAGE_KEY_SAVED = 'contextcue_saved_cards_v2';
const STORAGE_KEY_REFLECTIONS = 'contextcue_completed_reflections_v2';
const STORAGE_KEY_LEARNER = 'contextcue_anonymous_learner_v2';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_ROOT}/api/v1${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'ContextCue could not complete this request.');
  }
  return response.json() as Promise<T>;
}

async function requestV2<T>(path: string, learnerId: string, init: RequestInit = {}, idempotencyKey?: string): Promise<T> {
  const response = await fetch(`${API_ROOT}/api/v2${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json', 'X-Learner-ID': learnerId,
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}), ...init.headers,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'ContextCue could not complete this request.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getLearnerId(): string {
  const existing = localStorage.getItem(STORAGE_KEY_LEARNER);
  if (existing) return existing;
  const id = globalThis.crypto?.randomUUID?.() || `learner-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(STORAGE_KEY_LEARNER, id);
  return id;
}

export const createThread = (learnerId: string) =>
  requestV2<ThreadResult>('/threads', learnerId, { method: 'POST', body: '{}' });

export const analyzeContext = (threadId: string, learnerId: string, input: AnalyzeInput, key: string) =>
  requestV2<ContextAnalysisResult>(`/threads/${threadId}/analyze`, learnerId, { method: 'POST', body: JSON.stringify(input) }, key);

export type AnalysisStreamEvent = { type: string; data: Record<string, unknown> };

export async function analyzeContextStream(
  threadId: string,
  learnerId: string,
  input: AnalyzeInput,
  key: string,
  onEvent: (event: AnalysisStreamEvent) => void,
): Promise<ContextAnalysisResult> {
  const response = await fetch(`${API_ROOT}/api/v2/threads/${threadId}/analyze/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Learner-ID': learnerId,
      'Idempotency-Key': key,
    },
    body: JSON.stringify(input),
  });
  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'ContextCue could not start analysis.');
  }

  let buffer = '';
  let result: ContextAnalysisResult | undefined;
  const decoder = new TextDecoder();
  const handleFrame = (frame: string) => {
    const eventType = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim();
    const dataText = frame
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n');
    if (!eventType || !dataText) return;
    const data = JSON.parse(dataText) as Record<string, unknown>;
    onEvent({ type: eventType, data });
    if (eventType === 'analysis_completed' && data.result) {
      result = data.result as ContextAnalysisResult;
    }
  };
  const consumeFrames = () => {
    let boundary = buffer.indexOf('\n\n');
    while (boundary >= 0) {
      handleFrame(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');
    }
  };

  const reader = response.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    consumeFrames();
  }
  buffer += decoder.decode();
  consumeFrames();
  if (!result) throw new Error('ContextCue did not return a completed analysis.');
  return result;
}

export const resumeContext = (threadId: string, learnerId: string, answers: Record<string, string>) =>
  requestV2<ContextAnalysisResult>(`/threads/${threadId}/context`, learnerId, { method: 'POST', body: JSON.stringify({ answers }) });

export const switchContext = (threadId: string, learnerId: string, overrides: Record<string, string>) =>
  requestV2<ContextSwitchResult>(`/threads/${threadId}/switch-context`, learnerId, { method: 'POST', body: JSON.stringify({ overrides }) });

export const startPractice = (threadId: string, learnerId: string, goal: string) =>
  requestV2<PracticeRun>(`/threads/${threadId}/practice`, learnerId, { method: 'POST', body: JSON.stringify({ goal }) });

export const respondToPractice = (threadId: string, practiceId: string, learnerId: string, response: string, key: string, retryOfTurn?: number) =>
  requestV2<{ turn: PracticeTurn }>(`/threads/${threadId}/practice/${practiceId}/respond`, learnerId, { method: 'POST', body: JSON.stringify({ response, retry_of_turn: retryOfTurn }) }, key);

export const submitReflection = (threadId: string, practiceId: string, learnerId: string, initialAssumption: string, nextClarification: string) =>
  requestV2<{ reflection: { initial_assumption: string; next_clarification: string } }>(`/threads/${threadId}/practice/${practiceId}/reflection`, learnerId, { method: 'POST', body: JSON.stringify({ initial_assumption: initialAssumption, next_clarification: nextClarification }) });

export const getLearningSummary = (learnerId: string) =>
  requestV2<LearningSummary>(`/learning/${learnerId}`, learnerId);

export const deleteLearningSession = (learnerId: string, threadId: string) =>
  requestV2<void>(`/learning/${learnerId}/sessions/${threadId}`, learnerId, { method: 'DELETE' });

export const getConfig = () => request<AppConfig>('/config');

export async function getContextCards(): Promise<RetrievedCard[]> {
  const result = await request<{ cards: RetrievedCard[] }>('/cards');
  return result.cards;
}

export const analyzeSituation = (input: AnalyzeInput) =>
  request<AnalyzeResult>('/analyze', { method: 'POST', body: JSON.stringify(input) });

export const reviewResponse = (input: PracticeInput) =>
  request<PracticeResult>('/practice', { method: 'POST', body: JSON.stringify(input) });

export const submitPeerContribution = (input: ContributedCardSubmission) =>
  request<ContributionResult>('/contributions', { method: 'POST', body: JSON.stringify(input) });

export function getSavedCardIds(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED) || '[]'); }
  catch { return []; }
}

export function toggleSaveCardId(id: string): string[] {
  const current = getSavedCardIds();
  const updated = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(updated));
  return updated;
}

export function getCompletedReflections(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_REFLECTIONS) || '{}'); }
  catch { return {}; }
}

export function recordReflection(cardId: string): Record<string, boolean> {
  const updated = { ...getCompletedReflections(), [cardId]: true };
  localStorage.setItem(STORAGE_KEY_REFLECTIONS, JSON.stringify(updated));
  return updated;
}
