import { FormEvent, useState } from 'react';
import { ArrowRight, Bookmark, BookmarkCheck, CircleAlert, Compass, ExternalLink, LoaderCircle, MessageCircleQuestion, Send, Sparkles } from 'lucide-react';

import { reviewResponse } from '../services/api';
import type { AnalyzeResult, PracticeResult } from '../types';

interface Props {
  result: AnalyzeResult;
  saved: boolean;
  onToggleSave: () => void;
  onPractised: (cardId: string) => void;
  situation: string;
  context: string;
}

export function GuidanceCard({ result, saved, onToggleSave, onPractised, situation, context }: Props) {
  const [response, setResponse] = useState('');
  const [practice, setPractice] = useState<PracticeResult | null>(null);
  const [practiceError, setPracticeError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const primaryCard = result.cards[0];

  async function handlePractice(event: FormEvent) {
    event.preventDefault();
    if (!primaryCard || !response.trim()) return;
    setReviewing(true);
    setPracticeError('');
    try {
      const feedback = await reviewResponse({ situation, context, card_id: primaryCard.id, response: response.trim() });
      setPractice(feedback);
      onPractised(primaryCard.id);
    } catch (error) {
      setPracticeError(error instanceof Error ? error.message : 'Could not review this response.');
    } finally {
      setReviewing(false);
    }
  }

  return (
    <section className="space-y-5" aria-live="polite">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-40px_rgba(15,118,110,0.45)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-amber-50/60 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-700 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">{result.mode === 'gemini' ? 'AI-assisted context' : 'Reference guidance'}</span>
              {primaryCard && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">Synthetic, awaiting community review</span>}
            </div>
            <h2 className="text-xl font-bold leading-snug text-slate-950 sm:text-2xl">{result.summary}</h2>
          </div>
          {primaryCard && (
            <button type="button" onClick={onToggleSave} aria-label={saved ? 'Remove from My Learning' : 'Save to My Learning'} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{saved ? 'Saved' : 'Save'}
            </button>
          )}
        </div>

        <div className="grid gap-0 lg:grid-cols-2">
          <div className="space-y-6 p-6 lg:border-r lg:border-slate-100">
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-teal-800"><MessageCircleQuestion className="h-4 w-4" /> Possible meanings</h3>
              <div className="space-y-2">
                {result.possible_meanings.map((meaning, index) => (
                  <div key={meaning} className="flex gap-3 rounded-xl bg-slate-50 p-3.5 text-sm leading-6 text-slate-700"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-teal-700 shadow-sm">{index + 1}</span><p>{meaning}</p></div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-rose-800"><CircleAlert className="h-4 w-4" /> What not to assume</h3>
              <ul className="space-y-1.5 text-sm leading-6 text-rose-950">{result.do_not_assume.map((item) => <li key={item}>• {item}</li>)}</ul>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div><h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-teal-800"><Compass className="h-4 w-4" /> Safest next step</h3><p className="text-base font-semibold leading-7 text-slate-900">{result.next_action}</p></div>
            {result.clarifying_questions.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">You could ask</p><ul className="space-y-2 text-sm leading-6 text-slate-700">{result.clarifying_questions.map((question) => <li key={question} className="flex gap-2"><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-amber-600" />{question}</li>)}</ul></div>}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">{result.notice}</div>
          </div>
        </div>
      </div>

      {primaryCard ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-3"><div className="rounded-xl bg-amber-100 p-2.5 text-amber-700"><Sparkles className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Practise</p><h3 className="text-xl font-bold text-slate-950">Try your own response</h3><p className="mt-1 text-sm text-slate-600">{result.learning_prompt}</p></div></div>
          <form onSubmit={handlePractice} className="space-y-3">
            <label htmlFor="practice-response" className="block text-sm font-semibold text-slate-800">Your response</label>
            <textarea id="practice-response" value={response} onChange={(event) => setResponse(event.target.value)} rows={3} maxLength={4000} placeholder="Write what you would say or send…" className="w-full rounded-2xl border border-slate-300 bg-stone-50 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100" />
            <button type="submit" disabled={reviewing || !response.trim()} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">{reviewing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Review my response</button>
          </form>
          {practiceError && <p role="alert" className="mt-3 text-sm text-rose-700">{practiceError}</p>}
          {practice && (
            <div className="mt-5 grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 md:grid-cols-2">
              <div><h4 className="font-bold text-emerald-950">{practice.feedback}</h4><p className="mt-3 text-xs font-bold uppercase tracking-wider text-emerald-800">Strengths</p><ul className="mt-1 text-sm leading-6 text-emerald-950">{practice.strengths.map((item) => <li key={item}>• {item}</li>)}</ul><p className="mt-3 text-xs font-bold uppercase tracking-wider text-amber-800">Try improving</p><ul className="mt-1 text-sm leading-6 text-slate-700">{practice.improvements.map((item) => <li key={item}>• {item}</li>)}</ul></div>
              <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Suggested revision</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{practice.suggested_revision}</p></div>
            </div>
          )}
        </div>
      ) : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">This situation does not closely match a context card yet. Use the questions above to gather more context before interpreting intent.</div>}

      {result.sources.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer text-sm font-bold text-slate-800">Evidence and limits ({result.sources.length})</summary><div className="mt-4 space-y-4">{result.sources.map((source) => <div key={source.id} className="text-sm leading-6 text-slate-600"><a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline">{source.title}<ExternalLink className="h-3.5 w-3.5" /></a><p><strong>Supports:</strong> {source.supports}</p><p><strong>Limit:</strong> {source.limits}</p></div>)}</div></details>
      )}
    </section>
  );
}
