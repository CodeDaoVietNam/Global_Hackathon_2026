import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LearningSummary } from "../../types";
import { getLearnerId } from "../../services/api";
import {
  User,
  Sparkles,
  Award,
  BookOpen,
  Trash2,
  ArrowRight,
  Clock,
  Compass,
  CheckCircle2,
  Info,
} from "lucide-react";

export const LearningPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<LearningSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const learnerId = getLearnerId();

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v2/learning/${learnerId}`);
      if (!res.ok) throw new Error("Failed to load learning summary");
      const data = await res.json();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || "Failed to load summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [learnerId]);

  const handleDeleteSession = async (threadId: string) => {
    if (!confirm("Are you sure you want to delete this learning session?")) return;
    try {
      await fetch(`/api/v2/threads/${threadId}`, {
        method: "DELETE",
        headers: { "X-Learner-ID": learnerId },
      });
      loadSummary();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Learning Portfolio
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Learning & Demonstrated Evidence
          </h1>
        </div>

        <Link
          to="/context-lab"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Compass className="w-3.5 h-3.5" />
          Start New Practice
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 p-6 h-36 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs">
          {error}
        </div>
      ) : !summary ? null : (
        <>
          {/* Portfolio Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Practiced Sessions</span>
              <p className="text-2xl font-black text-slate-900">{summary.sessions.length}</p>
              <p className="text-[11px] text-slate-500">Total scenario simulations</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mastered Criteria</span>
              <p className="text-2xl font-black text-indigo-600">{summary.skill_evidence.length}</p>
              <p className="text-[11px] text-slate-500">Communication behaviors proven</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Milestone</span>
              <p className="text-2xl font-black text-amber-600">
                {summary.skill_evidence.length >= 3 ? "Bridge Builder" : summary.sessions.length >= 1 ? "Campus Explorer" : "Orientation"}
              </p>
              <p className="text-[11px] text-slate-500">Singapore cultural readiness</p>
            </div>
          </div>

          {/* Recommended Next Step Callout */}
          <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white p-6 sm:p-7 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-400/20 text-indigo-200 text-[11px] font-bold uppercase tracking-wide border border-indigo-400/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Recommended Next Skill Focus
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {summary.recommendation.skill.replaceAll("_", " ")}
              </h2>
              {summary.recommendation.title && (
                <p className="text-xs font-semibold text-indigo-200">
                  Target Scenario: {summary.recommendation.title}
                </p>
              )}
              <p className="text-xs text-slate-200/90 leading-relaxed">
                {summary.recommendation.reason}
              </p>
            </div>

            <Link
              to="/explore"
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Explore Recommendations
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Demonstrated Criteria Grid */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                Demonstrated Communication Criteria
              </h3>
              <span className="text-xs text-slate-500">
                {summary.skill_evidence.length} criteria recorded
              </span>
            </div>

            {summary.skill_evidence.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 space-y-2">
                <Info className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700">No skill evidence recorded yet</p>
                <p>Complete a role-play practice and save your reflection to demonstrate criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {summary.skill_evidence.map((item) => (
                  <div
                    key={item.criterion_id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {item.criterion_id.replaceAll("_", " ")}
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-indigo-600">{item.count}</span>
                        <span className="text-[11px] text-slate-500">demonstrations</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, item.count * 33)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Session History */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Practice Session History ({summary.sessions.length})
            </h3>

            {summary.sessions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                No past sessions. Your analyzed situations will appear here.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                {summary.sessions.map((session) => (
                  <div
                    key={session.thread_id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1 max-w-xl">
                      <p className="text-xs font-semibold text-slate-900 leading-snug">
                        {session.situation || "Direct scenario analysis"}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-100 font-medium">
                          {session.status}
                        </span>
                        <span>{new Date(session.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDeleteSession(session.thread_id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Progress Meaning Educational Card */}
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-5 text-xs text-indigo-950 space-y-2">
            <h4 className="font-bold flex items-center gap-1.5 text-indigo-900">
              <Info className="w-4 h-4 text-indigo-600" />
              What this progress evidence means
            </h4>
            <p className="text-slate-600 leading-relaxed">
              {summary.progress_meaning ||
                "Progress records observable criteria demonstrated during ContextCue interactive simulations. It does not claim to evaluate your general personality or overall cultural competence."}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
