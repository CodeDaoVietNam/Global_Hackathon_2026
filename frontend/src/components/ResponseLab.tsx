import type { ResponseStrategy } from '../types';

export function ResponseLab({ strategies, values, onChange, onStart }: { strategies: ResponseStrategy[]; values: string[]; onChange: (index: number, value: string) => void; onStart: () => void }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-6">
    <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-700">Response Lab</p><h2 className="mt-1 text-2xl font-black">Choose and edit a low-risk response</h2>
    <div className="mt-5 grid gap-4 lg:grid-cols-3">{strategies.map((strategy, index) => <article key={`${strategy.strategy_type}-${index}`} className="rounded-2xl border border-slate-200 p-4"><span className="text-xs font-bold uppercase text-teal-700">{strategy.strategy_type}</span><h3 className="mt-2 font-bold">{strategy.communication_goal}</h3><textarea aria-label={`${strategy.strategy_type} response`} value={values[index] || ''} onChange={event => onChange(index, event.target.value)} rows={4} className="mt-3 w-full rounded-xl border border-slate-300 bg-stone-50 p-3 text-sm"/><p className="mt-3 text-xs leading-5 text-slate-600"><strong>Why safer:</strong> {strategy.why_low_risk}</p><p className="mt-2 text-xs leading-5 text-slate-600"><strong>Avoids assuming:</strong> {strategy.assumption_avoided}</p></article>)}</div>
    <button type="button" onClick={onStart} className="mt-5 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white">Start practice</button>
  </section>;
}
