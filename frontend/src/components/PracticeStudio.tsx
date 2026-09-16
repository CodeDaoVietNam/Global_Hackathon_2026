import { FormEvent, useState, KeyboardEvent } from 'react';
import type { PracticeRun, PracticeTurn } from '../types';
import {
  MessageSquare,
  Sparkles,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  UserCheck
} from 'lucide-react';

interface Props {
  practice: PracticeRun;
  onRespond: (response: string, retryOf?: number) => Promise<PracticeTurn>;
  onReflect: (initial: string, next: string) => Promise<void>;
}

export function PracticeStudio({ practice, onRespond, onReflect }: Props) {
  const [turns, setTurns] = useState<PracticeTurn[]>(practice.turns);
  const [response, setResponse] = useState(practice.strategies[0]?.sample_wording || '');
  const [initial, setInitial] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const submitted = turns.filter(turn => turn.retry_of_turn == null).length;

  async function send(event?: FormEvent) {
    if (event) event.preventDefault();
    if (!response.trim() || busy) return;
    setBusy(true);
    try {
      const turn = await onRespond(response.trim());
      setTurns(current => [...current, turn]);
      setResponse('');
    } finally {
      setBusy(false);
    }
  }

  async function retry(turn: PracticeTurn) {
    setBusy(true);
    try {
      const revised = await onRespond(turn.suggested_revision, turn.turn_number);
      setTurns(current => [...current, revised]);
    } finally {
      setBusy(false);
    }
  }

  async function reflect(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onReflect(initial, next);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <section className="rounded-3xl border border-slate-900/[0.08] bg-white shadow-sm overflow-hidden space-y-0">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-indigo-900/5 via-slate-50 to-indigo-900/5 border-b border-slate-200/80 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-indigo-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Practice Studio
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Role-play: {practice.goal.replaceAll('_', ' ')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Turn {Math.min(submitted + 1, 3)} of 3
          </span>
        </div>
      </div>

      {/* Chat Simulation Conversation Canvas */}
      <div className="p-5 sm:p-6 bg-slate-50/50 space-y-6">
        {turns.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500 space-y-1 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="font-semibold text-slate-700">Practice dialogue ready</p>
            <p>Review the communication goal and send your opening response below.</p>
          </div>
        )}

        <div className="space-y-6">
          {turns.map((turn, index) => (
            <div key={`${turn.turn_number}-${index}`} className="space-y-4">
              {/* Learner message (Right side bubble) */}
              <div className="flex justify-end">
                <div className="max-w-2xl rounded-2xl rounded-tr-xs bg-indigo-600 p-4 text-sm text-white shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-3 border-b border-indigo-500/50 pb-1 text-[11px] text-indigo-100">
                    <strong className="uppercase tracking-wider">
                      You{turn.retry_of_turn ? ` · retry of turn ${turn.retry_of_turn}` : ''}
                    </strong>
                    <span className="text-[10px] text-indigo-200">✓✓ Sent</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{turn.learner_response}</p>
                </div>
              </div>

              {/* Simulated partner reply (Left side bubble) */}
              <div className="flex justify-start">
                <div className="max-w-2xl rounded-2xl rounded-tl-xs bg-white border border-slate-200 p-4 text-sm text-slate-800 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1 text-[11px] text-slate-500">
                    <strong className="uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      Simulated partner
                    </strong>
                    <span className="text-[10px] text-slate-400">Classmate response</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{turn.simulated_partner_reply}</p>
                </div>
              </div>

              {/* Simulation assumptions */}
              {turn.simulation_assumptions.map(item => (
                <div key={item} className="max-w-2xl rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Simulation assumption:</strong> {item}
                  </p>
                </div>
              ))}

              {/* Coach review card */}
              <div className="max-w-2xl rounded-2xl border border-indigo-200/80 bg-indigo-50/60 p-4.5 text-sm shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <strong className="text-indigo-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-indigo-600" />
                    Coach: {turn.coach_summary}
                  </strong>
                </div>

                <div className="space-y-1.5 text-xs">
                  {turn.strengths.map(item => (
                    <p key={item} className="text-indigo-900 font-medium flex items-start gap-1.5 leading-relaxed">
                      <span className="text-emerald-600 font-bold">✓</span> {item}
                    </p>
                  ))}
                  {turn.improvements.map(item => (
                    <p key={item} className="text-slate-700 flex items-start gap-1.5 leading-relaxed">
                      <span className="text-indigo-600 font-bold">Try:</span> {item}
                    </p>
                  ))}
                </div>

                {!turn.retry_of_turn && (
                  <div className="pt-2 border-t border-indigo-100">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => retry(turn)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry suggested revision
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator while waiting for reply */}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-xs bg-white border border-slate-200 p-3.5 shadow-xs flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span className="font-semibold text-slate-600">Simulated partner is typing</span>
                <div className="flex items-center gap-1 pl-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-typing-dot-1" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-typing-dot-2" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-typing-dot-3" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reply input form */}
        {submitted < 3 && (
          <form onSubmit={send} className="mt-6 pt-4 border-t border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="practice-v2-response" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Your response
              </label>
              <span className="text-[11px] text-slate-400 hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
            </div>

            <div className="relative">
              <textarea
                id="practice-v2-response"
                value={response}
                onChange={e => setResponse(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                placeholder="Type your polite clarification, acknowledgment, or question..."
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs transition-all leading-relaxed"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy || !response.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                Send response
              </button>
            </div>
          </form>
        )}

        {/* Reflection Form */}
        {turns.length > 0 && (
          <form onSubmit={reflect} className="mt-8 grid gap-4 border-t border-slate-200 pt-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Transfer the Learning</span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Reflection</h3>
              <p className="text-xs text-slate-500">Document your mental model shift for future situations.</p>
            </div>

            <label className="text-xs font-bold text-slate-700 space-y-1 block">
              <span>What did you initially assume?</span>
              <textarea
                value={initial}
                onChange={e => setInitial(e.target.value)}
                required
                placeholder="e.g. I initially assumed they were upset or deliberately delaying the task..."
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-normal text-slate-800 placeholder-slate-400 focus:border-indigo-500"
              />
            </label>

            <label className="text-xs font-bold text-slate-700 space-y-1 block">
              <span>What would you clarify next time?</span>
              <textarea
                value={next}
                onChange={e => setNext(e.target.value)}
                required
                placeholder="e.g. Next time I will propose a concrete checkpoint time rather than asking open-endedly..."
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-normal text-slate-800 placeholder-slate-400 focus:border-indigo-500"
              />
            </label>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={busy || !initial.trim() || !next.trim()}
                className="w-fit rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
              >
                Save reflection
              </button>
            </div>

            {saved && (
              <div role="status" className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Reflection saved. Your words were stored exactly as written.</span>
              </div>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
