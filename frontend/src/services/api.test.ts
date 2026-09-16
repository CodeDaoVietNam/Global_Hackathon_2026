import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeContext, analyzeContextStream, analyzeSituation, createThread, getConfig, respondToPractice } from './api';

afterEach(() => vi.restoreAllMocks());

describe('ContextCue API client', () => {
  it('loads backend mode without exposing credentials', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ mode: 'gemini', external_ai: true }), { status: 200 }),
    );

    await expect(getConfig()).resolves.toEqual({ mode: 'gemini', external_ai: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/config', expect.any(Object));
  });

  it('sends situation and added context to the backend', async () => {
    const result = { mode: 'gemini', card_ids: ['sg-team-01'], cards: [], sources: [] };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(result), { status: 200 }),
    );

    await analyzeSituation({ situation: 'My teammate said can lah.', context: 'No deadline yet.' });

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/analyze', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ situation: 'My teammate said can lah.', context: 'No deadline yet.' }),
    }));
  });

  it('surfaces the backend message for recoverable errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Gemini could not return a valid answer.' }), { status: 503 }),
    );

    await expect(analyzeSituation({ situation: 'A real situation', context: '' }))
      .rejects.toThrow('Gemini could not return a valid answer.');
  });

  it('sends learner ownership and idempotency headers to API v2', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ thread_id: 'thread-1' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'complete', context_map: {} }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ turn: { turn_number: 1 } }), { status: 200 }));

    await createThread('learner-1');
    await analyzeContext('thread-1', 'learner-1', { situation: 'My teammate said can lah.', context: '' }, 'analysis-1');
    await respondToPractice('thread-1', 'practice-1', 'learner-1', 'Could you clarify?', 'turn-1');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v2/threads', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ 'X-Learner-ID': 'learner-1' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v2/threads/thread-1/analyze', expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': 'analysis-1' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/v2/threads/thread-1/practice/practice-1/respond', expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': 'turn-1' }),
    }));
  });

  it('parses SSE analysis progress and returns the final Context Map result', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        'event: analysis_started\ndata: {"thread_id":"thread-1"}\n\n' +
          'event: analysis_completed\ndata: {"status":"complete","result":{"status":"complete","questions":[],"known_facts":["Known"],"context_map":{}}}\n\n',
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
      ),
    );
    const events: string[] = [];

    const result = await analyzeContextStream(
      'thread-1', 'learner-1', { situation: 'My teammate said can lah.', context: '' }, 'analysis-1',
      (event) => events.push(event.type),
    );

    expect(events).toEqual(['analysis_started', 'analysis_completed']);
    expect(result.known_facts).toEqual(['Known']);
  });
});
