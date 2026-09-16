import { ReactNode, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, FlaskConical, GitCompareArrows, Search, Sparkles } from 'lucide-react';
import type { ContextMap, ContextSwitchResult } from '../types';

interface Props {
  contextMap: ContextMap;
  onSwitch: (overrides: Record<string, string>) => Promise<ContextSwitchResult>;
}

export function ContextLab({ contextMap, onSwitch }: Props) {
  const [relationship, setRelationship] = useState('lecturer');
  const [channel, setChannel] = useState('email');
  const [comparison, setComparison] = useState<ContextSwitchResult | null>(null);
  const [switching, setSwitching] = useState(false);
  const shown = comparison?.context_map || contextMap;

  async function compare() {
    setSwitching(true);
    try {
      setComparison(await onSwitch({
        relationship,
        channel,
        formality: relationship === 'lecturer' || channel === 'email' ? 'formal' : 'informal'
      }));
    } finally {
      setSwitching(false);
    }
  }

  return (
    <section className="space-y-5" aria-live="polite">
      {/* Context Map Card */}
      <div className="rounded-3xl border border-slate-900/[0.08] bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6 bg-gradient-to-r from-indigo-900/5 via-slate-50 to-indigo-900/5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-indigo-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Context Intelligence Graph
            </p>
            <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Context Map</h2>
          </div>
          <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700">
            {shown.retrieval_mode.replaceAll('_', ' ')}
          </span>
        </div>

        <div className="grid lg:grid-cols-2">
          {/* Left: Known facts, still unknown, do not assume */}
          <div className="space-y-4 p-5 sm:p-6 lg:border-r lg:border-slate-100">
            <Panel title="Known facts" icon={<CheckCircle2 className="h-4 w-4" />} items={shown.known_facts} tone="indigo" />
            <Panel title="Still unknown" icon={<Search className="h-4 w-4" />} items={shown.missing_context} tone="amber" />
            <Panel title="Do not assume" icon={<CircleAlert className="h-4 w-4" />} items={shown.assumption_risks} tone="rose" />
          </div>

          {/* Right: Conditional perspectives & Safest next action */}
          <div className="space-y-4 p-5 sm:p-6 bg-slate-50/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Conditional perspectives</h3>
            {shown.perspectives.map((item, index) => (
              <article key={`${item.statement}-${index}`} className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-indigo-700">Perspective {index + 1}</span>
                  <span className="rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                    {item.support_status.replaceAll('_', ' ')}
                  </span>
                </div>
                <p className="font-semibold text-xs sm:text-sm text-slate-800 leading-relaxed">{item.statement}</p>
                {item.plausibility_conditions.map(condition => (
                  <p key={condition} className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-700">If:</span> {condition}
                  </p>
                ))}
              </article>
            ))}

            <div className="rounded-2xl bg-gradient-to-br from-indigo-900 to-indigo-800 p-5 text-white shadow-xs space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                Safest next action
              </p>
              <p className="font-medium text-xs sm:text-sm text-slate-100 leading-relaxed">{shown.safest_next_action}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Context Switcher Tool */}
      <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-indigo-50/30 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <GitCompareArrows className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Context Switcher</h3>
            <p className="text-xs text-slate-600">
              Change one condition and inspect what changes while your original facts stay fixed.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
            <span>Relationship</span>
            <select
              aria-label="Switch relationship"
              value={relationship}
              onChange={e => setRelationship(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium focus:bg-white"
            >
              <option value="lecturer">Lecturer</option>
              <option value="teammate">Teammate</option>
              <option value="friend">Friend</option>
            </select>
          </label>

          <label className="text-xs font-bold text-slate-700 flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
            <span>Channel</span>
            <select
              aria-label="Switch channel"
              value={channel}
              onChange={e => setChannel(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium focus:bg-white"
            >
              <option value="email">Email</option>
              <option value="group_chat">Group chat</option>
              <option value="in_person">In person</option>
            </select>
          </label>

          <button
            type="button"
            onClick={compare}
            disabled={switching}
            className="rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-200 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
          >
            {switching ? 'Comparing…' : 'Compare context'}
          </button>
        </div>

        {comparison && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 pt-2 border-t border-indigo-100">
            <div className="rounded-2xl bg-white p-4 border border-indigo-100 shadow-2xs space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Changed Attributes</p>
              {Object.entries(comparison.changed).map(([key, value]: [string, { before: string; after: string }]) => (
                <div key={key} className="text-xs flex items-center gap-2 bg-indigo-50/50 p-2 rounded-lg">
                  <strong className="capitalize text-slate-700">{key}:</strong>
                  <span className="text-slate-500 line-through">{value.before}</span>
                  <ArrowRight className="inline h-3 w-3 text-indigo-600" />
                  <span className="font-bold text-indigo-900">{value.after}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-white p-4 border border-indigo-100 shadow-2xs space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Unchanged facts</p>
              <ul className="space-y-1">
                {comparison.unchanged_facts.map(fact => (
                  <li key={fact} className="text-xs text-slate-700 flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Evidence Trail */}
      <div className="rounded-3xl border border-slate-900/[0.08] bg-white p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-base">Evidence trail</h3>
        </div>
        <p className="text-xs text-slate-600">{shown.grounding_summary}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {shown.evidence_trail.map(item => (
            <article key={item.card_id} className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <strong className="text-xs sm:text-sm text-slate-800">{item.title}</strong>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                  {item.evidence_status.replaceAll('_', ' ')}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">{item.evidence_limit}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Panel({ title, icon, items, tone }: { title: string; icon: ReactNode; items: string[]; tone: 'indigo' | 'amber' | 'rose' }) {
  const styles = {
    indigo: 'bg-indigo-50/80 border-indigo-200/80 text-indigo-950',
    amber: 'bg-amber-50/80 border-amber-200/70 text-amber-950',
    rose: 'bg-rose-50/80 border-rose-200/70 text-rose-950',
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-2xs space-y-2 ${styles[tone]}`}>
      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">{icon}{title}</h3>
      <ul className="space-y-1.5 text-xs leading-relaxed">
        {items.map(item => (
          <li key={item} className="flex items-start gap-1.5">
            <span className="opacity-60">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
