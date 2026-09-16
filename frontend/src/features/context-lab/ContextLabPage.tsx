import React, { useState, useEffect, FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { LearningTrail, TrailStage } from "../../components/progress/LearningTrail";
import { ContextLab } from "../../components/ContextLab";
import { ResponseLab } from "../../components/ResponseLab";
import { PracticeStudio } from "../../components/PracticeStudio";
import { AgentTrace, TraceEvent } from "../../components/progress/AgentTrace";
import {
  analyzeContextStream,
  createThread,
  getLearnerId,
  resumeContext,
  startPractice,
  respondToPractice,
  submitReflection,
  switchContext,
} from "../../services/api";
import type {
  ContextAnalysisResult,
  ContextSwitchResult,
  PracticeRun,
  PracticeTurn,
} from "../../types";
import {
  Compass,
  Sparkles,
  HelpCircle,
  RefreshCw,
} from "lucide-react";

export const ContextLabPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [learnerId] = useState(() => getLearnerId());

  const [situation, setSituation] = useState(searchParams.get("prefill") || "");
  const [context, setContext] = useState("");
  const [threadId, setThreadId] = useState("");
  const [analysis, setAnalysis] = useState<ContextAnalysisResult | null>(null);
  const [gapAnswers, setGapAnswers] = useState<Record<string, string>>({});
  const [practice, setPractice] = useState<PracticeRun | null>(null);
  const [strategyValues, setStrategyValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([
    { stage: "init", label: "Ready to analyze situation", status: "pending" },
  ]);

  const currentStage: TrailStage = practice
    ? "practise"
    : analysis?.status === "awaiting_context"
    ? "clarify"
    : analysis?.context_map
    ? "respond"
    : "understand";

  async function buildMap(event: FormEvent) {
    event.preventDefault();
    if (!situation.trim()) return;
    setLoading(true);
    setError("");
    setAnalysis(null);
    setPractice(null);

    setTraceEvents([
      { stage: "extract", label: "Extracting explicit facts", status: "running" },
      { stage: "retrieve", label: "Hybrid retrieval & ranking", status: "pending" },
      { stage: "ground", label: "Grounding critic check", status: "pending" },
    ]);

    try {
      const thread = await createThread(learnerId);
      setThreadId(thread.thread_id);
      const key = globalThis.crypto?.randomUUID?.() || `idemp-${Date.now()}`;
      const result = await analyzeContextStream(
        thread.thread_id,
        learnerId,
        { situation: situation.trim(), context: context.trim() },
        key,
        (event) => {
          const labels: Record<string, string> = {
            analysis_started: "Analysis started",
            context_extracted: "Explicit facts identified",
            retrieval_completed: "Evidence retrieval completed",
            grounding_checked: "Grounding check completed",
            context_gap_found: "Context gap found",
            context_map_ready: "Context Map constructed",
            analysis_completed: "Analysis completed",
          };
          setTraceEvents((current) => [
            ...current.filter((item) => item.stage !== event.type),
            {
              stage: event.type,
              label: labels[event.type] || event.type,
              status: event.type === "context_gap_found" ? "interrupted" : "completed",
            },
          ]);
        },
      );

      setAnalysis(result);
      if (result.context_map) {
        setStrategyValues(result.context_map.response_strategies.map((item) => item.sample_wording));
        setTraceEvents([
          { stage: "extract", label: "Explicit facts identified", status: "completed" },
          { stage: "retrieve", label: "Hybrid retrieval completed", status: "completed" },
          { stage: "ground", label: "Context Map constructed", status: "completed", detail: result.context_map.retrieval_mode },
        ]);
      } else if (result.status === "awaiting_context") {
        setTraceEvents([
          { stage: "extract", label: "Explicit facts identified", status: "completed" },
          { stage: "gap", label: "Context gap found", status: "interrupted", detail: "Waiting for clarification" },
        ]);
      }
    } catch (caught: any) {
      setError(caught.message || "ContextCue could not complete this request.");
    } finally {
      setLoading(false);
    }
  }

  async function resolveGaps(event: FormEvent) {
    event.preventDefault();
    if (!threadId) return;
    setLoading(true);
    setError("");
    try {
      const result = await resumeContext(threadId, learnerId, gapAnswers);
      setAnalysis(result);
      if (result.context_map) {
        setStrategyValues(result.context_map.response_strategies.map((item) => item.sample_wording));
      }
    } catch (caught: any) {
      setError(caught.message || "Failed to resume context");
    } finally {
      setLoading(false);
    }
  }

  async function resolveEvidenceOnly() {
    if (!threadId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v2/threads/${threadId}/context/evidence-only`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Learner-ID": learnerId },
      });
      const result = await res.json();
      setAnalysis(result);
      if (result.context_map) {
        setStrategyValues(result.context_map.response_strategies.map((item: any) => item.sample_wording));
      }
    } catch (caught: any) {
      setError(caught.message || "Failed to resume with evidence only");
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitch(overrides: Record<string, string>): Promise<ContextSwitchResult> {
    if (!threadId) throw new Error("No active thread to switch");
    return switchContext(threadId, learnerId, overrides);
  }

  async function beginPractice() {
    if (!threadId || !analysis?.context_map) return;
    setLoading(true);
    setError("");
    try {
      const goal = analysis.context_map.response_strategies[0]?.communication_goal || "clarify_before_inferring";
      const run = await startPractice(threadId, learnerId, goal);
      setPractice(run);
    } catch (caught: any) {
      setError(caught.message || "Failed to start practice");
    } finally {
      setLoading(false);
    }
  }

  async function sendPracticeTurn(response: string, retryOf?: number): Promise<PracticeTurn> {
    if (!threadId || !practice) throw new Error("No active practice session");
    const key = globalThis.crypto?.randomUUID?.() || `turn-${Date.now()}`;
    const result: any = await respondToPractice(threadId, practice.practice_id, learnerId, response, key, retryOf);
    return (result?.turn ?? result) as PracticeTurn;
  }

  async function recordReflection(initial: string, next: string): Promise<void> {
    if (!threadId || !practice) throw new Error("No active practice session");
    await submitReflection(threadId, practice.practice_id, learnerId, initial, next);
  }

  const [collapsedComposer, setCollapsedComposer] = useState(false);

  return (
    <div className="space-y-6">
      <LearningTrail currentStage={currentStage} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Situation Composer & Interrupts */}
          <div className={`${collapsedComposer && analysis?.context_map ? "lg:col-span-3" : "lg:col-span-4"} space-y-4 transition-all duration-300`}>
            <div className="bg-white rounded-3xl border border-slate-900/[0.08] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-600" />
                  Situation Input
                </h3>
                <div className="flex items-center gap-2">
                  {analysis?.context_map && (
                    <button
                      type="button"
                      onClick={() => setCollapsedComposer(!collapsedComposer)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 px-2 py-0.5 rounded cursor-pointer"
                      title={collapsedComposer ? "Expand input form" : "Collapse to Focus Mode"}
                    >
                      {collapsedComposer ? "Expand" : "Focus"}
                    </button>
                  )}
                  {analysis?.context_map && (
                    <button
                      onClick={() => {
                        setAnalysis(null);
                        setPractice(null);
                        setCollapsedComposer(false);
                      }}
                      className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      New
                    </button>
                  )}
                </div>
              </div>

              {collapsedComposer && analysis?.context_map ? (
                <div className="text-xs text-slate-600 space-y-2">
                  <p className="line-clamp-3 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-serif">
                    “{situation}”
                  </p>
                  <button
                    type="button"
                    onClick={() => setCollapsedComposer(false)}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline"
                  >
                    Edit situation text
                  </button>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs">
                      {error}
                    </div>
                  )}

              <form onSubmit={buildMap} className="space-y-3">
                <div>
                  <label htmlFor="situation-input" className="text-xs font-semibold text-slate-700 block mb-1">
                    What happened or was said?
                  </label>
                  <textarea
                    id="situation-input"
                    rows={4}
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    placeholder="e.g. My teammate said “can lah” in our group chat, but we did not assign the slides..."
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="context-input" className="text-xs font-semibold text-slate-700 block mb-1">
                    Additional Context (Optional)
                  </label>
                  <input
                    id="context-input"
                    type="text"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="e.g. We met last week, communicating in Telegram group chat"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !situation.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {loading ? "Analyzing in LangGraph..." : "Build Context Map"}
                </button>
              </form>
              </>
              )}
            </div>

            {/* Gap Questions Interrupt */}
            {analysis?.status === "awaiting_context" && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <HelpCircle className="w-4 h-4 text-amber-700" />
                  Context Clarification Needed
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  The model paused on missing details instead of assuming:
                </p>

                <form onSubmit={resolveGaps} className="space-y-3">
                  {analysis.questions?.map((question, index) => (
                    <div key={index}>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">{question}</label>
                      <input
                        type="text"
                        value={gapAnswers[`question_${index}`] || ""}
                        onChange={(e) => setGapAnswers({ ...gapAnswers, [`question_${index}`]: e.target.value })}
                        className="w-full p-2 text-xs rounded-lg border border-amber-200 bg-white text-slate-800"
                        placeholder="Your answer..."
                      />
                    </div>
                  ))}

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      Resume with answers
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={resolveEvidenceOnly}
                      className="py-2 px-3 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Proceed with evidence only
                    </button>
                  </div>
                </form>
              </div>
            )}

            <AgentTrace events={traceEvents} retrievalMode={analysis?.context_map?.retrieval_mode} />
          </div>

          {/* Right Column: Context Map / Response Lab / Practice Studio */}
          <div className={`${collapsedComposer && analysis?.context_map ? "lg:col-span-9" : "lg:col-span-8"} space-y-6 transition-all duration-300`}>
            {!analysis?.context_map ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400 text-xs space-y-2">
                <Compass className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700 text-sm">No Context Map yet</p>
                <p>Submit a situation on the left to observe facts and compare interpretations.</p>
              </div>
            ) : (
              <>
                <ContextLab contextMap={analysis.context_map} onSwitch={handleSwitch} />

                {!practice && (
                  <ResponseLab
                    strategies={analysis.context_map.response_strategies}
                    values={strategyValues}
                    onChange={(index, value) => {
                      const next = [...strategyValues];
                      next[index] = value;
                      setStrategyValues(next);
                    }}
                    onStart={beginPractice}
                  />
                )}

                {practice && (
                  <PracticeStudio
                    practice={practice}
                    onRespond={sendPracticeTurn}
                    onReflect={recordReflection}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
