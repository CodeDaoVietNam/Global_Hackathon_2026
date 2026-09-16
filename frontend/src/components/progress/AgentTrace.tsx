import React from "react";
import { Activity, CheckCircle2, Loader2, Sparkles } from "lucide-react";

export interface TraceEvent {
  stage: string;
  label: string;
  status: "pending" | "running" | "completed" | "interrupted";
  detail?: string;
}

interface Props {
  events: TraceEvent[];
  retrievalMode?: string;
}

export const AgentTrace: React.FC<Props> = ({ events, retrievalMode }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-teal-700" />
          Graph Execution Trace
        </h4>
        {retrievalMode && (
          <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-teal-50 text-teal-800 border border-teal-100 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-600" />
            {retrievalMode}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {events.map((ev, index) => {
          const isDone = ev.status === "completed";
          const isRunning = ev.status === "running";

          return (
            <div
              key={ev.stage || index}
              className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-100"
            >
              <span className="font-medium text-slate-700 flex items-center gap-2">
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin shrink-0" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-300 ml-1 mr-0.5" />
                )}
                {ev.label}
              </span>

              {ev.detail && (
                <span className="text-[11px] text-slate-500 font-mono">
                  {ev.detail}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
