import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { LearningTrail } from "../../components/progress/LearningTrail";
import { PracticeTurn } from "../../types";
import { getLearnerId } from "../../services/api";
import {
  Play,
  User,
  Bot,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Send,
  ArrowRight,
  HelpCircle,
  Layers,
} from "lucide-react";

export const PracticeStudioPage: React.FC = () => {
  const routeParams = useParams<{ threadId: string; practiceId: string }>();
  const [searchParams] = useSearchParams();

  const threadId = routeParams.threadId ?? searchParams.get("threadId");
  const practiceId = routeParams.practiceId ?? searchParams.get("practiceId");
  const initialDraft = searchParams.get("initialDraft") || "";

  const [turns, setTurns] = useState<PracticeTurn[]>([]);
  const [inputText, setInputText] = useState(initialDraft);
  const [busy, setBusy] = useState(false);
  const [goal, setGoal] = useState<string>("Practice communication");

  // Reflection state
  const [initialAssumption, setInitialAssumption] = useState("");
  const [nextClarification, setNextClarification] = useState("");
  const [reflectionSaved, setReflectionSaved] = useState(false);

  // Load existing turns
  useEffect(() => {
    if (!threadId || !practiceId) return;
    const learnerId = getLearnerId();

    fetch(`/api/v2/threads/${threadId}/practice/${practiceId}`, {
      headers: { "X-Learner-ID": learnerId },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.turns) setTurns(data.turns);
        if (data.goal) setGoal(data.goal);
      })
      .catch((err) => console.error(err));
  }, [threadId, practiceId]);

  const nonRetryTurns = turns.filter((t) => t.retry_of_turn == null).length;
  const turnsRemaining = Math.max(0, 3 - nonRetryTurns);

  const handleSendResponse = async (e: React.FormEvent, customText?: string, retryOf?: number) => {
    if (e) e.preventDefault();
    const text = (customText || inputText).trim();
    if (!text || !threadId || !practiceId) return;

    setBusy(true);
    const learnerId = getLearnerId();

    try {
      const res = await fetch(`/api/v2/threads/${threadId}/practice/${practiceId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Learner-ID": learnerId,
          "Idempotency-Key": `turn-${Date.now()}`,
        },
        body: JSON.stringify({
          response: text,
          retry_of_turn: retryOf,
        }),
      });

      const data = await res.json();
      if (data.turn) {
        setTurns((prev) => [...prev, data.turn]);
        setInputText("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialAssumption.trim() || !nextClarification.trim() || !threadId || !practiceId) return;

    setBusy(true);
    const learnerId = getLearnerId();

    try {
      const res = await fetch(`/api/v2/threads/${threadId}/practice/${practiceId}/reflection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Learner-ID": learnerId,
        },
        body: JSON.stringify({
          initial_assumption: initialAssumption.trim(),
          next_clarification: nextClarification.trim(),
        }),
      });

      if (res.ok) {
        setReflectionSaved(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  if (!threadId || !practiceId) {
    return (
      <div className="max-w-md mx-auto my-16 text-center bg-white p-8 rounded-2xl border border-slate-200 space-y-4">
        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">No active practice run found</h2>
        <p className="text-xs text-slate-500">Please launch a practice session from the Context Lab.</p>
        <Link
          to="/context-lab"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
        >
          Go to Context Lab
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LearningTrail currentStage={turns.length > 0 ? "practise" : "respond"} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6">
        {/* Header with Turn Indicator */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              Practice Studio
            </span>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-indigo-600 fill-indigo-600" />
              Role-play: {goal.replaceAll("_", " ")}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Turn {Math.min(nonRetryTurns + 1, 3)} of 3
            </span>
            <div className="flex gap-1">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    step <= nonRetryTurns
                      ? "bg-indigo-600"
                      : step === nonRetryTurns + 1
                      ? "bg-indigo-300 ring-2 ring-indigo-100"
                      : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Conversation Timeline */}
        <div className="space-y-6">
          {turns.map((turn, index) => (
            <div key={index} className="space-y-3">
              {/* Learner message */}
              <div className="flex items-start justify-end gap-2.5">
                <div className="max-w-xl bg-indigo-600 text-white rounded-2xl rounded-tr-xs p-4 shadow-xs text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-indigo-200 font-bold uppercase">
                    <span>You{turn.retry_of_turn ? ` · retry of turn ${turn.retry_of_turn}` : ""}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{turn.learner_response}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-4 h-4" />
                </div>
              </div>

              {/* Partner reply */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="max-w-xl bg-white rounded-2xl rounded-tl-xs p-4 shadow-xs border border-slate-200 text-xs space-y-1 text-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Simulated partner
                  </span>
                  <p className="leading-relaxed whitespace-pre-wrap">{turn.simulated_partner_reply}</p>
                </div>
              </div>

              {/* Simulation assumptions */}
              {turn.simulation_assumptions.map((assump, ai) => (
                <div key={ai} className="ml-10 max-w-xl bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 space-y-0.5">
                  <p><strong>Simulation assumption:</strong> {assump}</p>
                </div>
              ))}

              {/* Coach Evaluation Box */}
              <div className="ml-10 max-w-xl bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Coach: {turn.coach_summary}
                  </strong>
                </div>

                {turn.strengths.length > 0 && (
                  <div className="text-[11px] text-emerald-800 space-y-1">
                    {turn.strengths.map((s, si) => (
                      <p key={si} className="flex items-center gap-1">
                        ✓ {s}
                      </p>
                    ))}
                  </div>
                )}

                {turn.improvements.length > 0 && (
                  <div className="text-[11px] text-slate-600 space-y-1">
                    {turn.improvements.map((imp, ii) => (
                      <p key={ii} className="leading-relaxed">
                        Try: {imp}
                      </p>
                    ))}
                  </div>
                )}

                {turn.suggested_revision && turn.retry_of_turn == null && (
                  <div className="pt-2 border-t border-indigo-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 italic truncate">
                      Suggestion: “{turn.suggested_revision}”
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(e) => handleSendResponse(e, turn.suggested_revision, turn.turn_number)}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-indigo-300 text-indigo-800 text-[11px] font-semibold hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry suggested revision
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {busy && (
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                <Bot className="w-4 h-4" />
              </div>
              <div className="rounded-2xl rounded-tl-xs bg-white border border-slate-200 p-3 shadow-xs flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
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

        {/* Input Form for Next Turn */}
        {turnsRemaining > 0 && (
          <form onSubmit={handleSendResponse} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <label htmlFor="practice-v2-response" className="text-sm font-bold text-slate-800 block">
              Your response
            </label>

            <textarea
              id="practice-v2-response"
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type how you would respond in this scenario..."
              className="w-full p-3 rounded-xl border border-slate-200 bg-stone-50 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy || !inputText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-sm shadow-xs transition-colors cursor-pointer"
              >
                Send response
              </button>
            </div>
          </form>
        )}

        {/* Step 5: Reflection Section */}
        {turns.length > 0 && (
          <form onSubmit={handleSaveReflection} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-2">Reflection</h3>

            <div>
              <label htmlFor="initial-assumption" className="text-sm font-bold text-slate-800 block mb-1">
                What did you initially assume?
              </label>
              <textarea
                id="initial-assumption"
                rows={2}
                value={initialAssumption}
                onChange={(e) => setInitialAssumption(e.target.value)}
                required
                className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 font-normal"
              />
            </div>

            <div>
              <label htmlFor="next-clarification" className="text-sm font-bold text-slate-800 block mb-1">
                What would you clarify next time?
              </label>
              <textarea
                id="next-clarification"
                rows={2}
                value={nextClarification}
                onChange={(e) => setNextClarification(e.target.value)}
                required
                className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 font-normal"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="submit"
                disabled={busy || !initialAssumption.trim() || !nextClarification.trim()}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
              >
                Save reflection
              </button>

              {reflectionSaved && (
                <p role="status" className="font-bold text-emerald-700 text-xs">
                  Reflection saved. Your words were stored exactly as written.
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
