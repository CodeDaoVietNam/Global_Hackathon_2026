import React, { useEffect, useState } from "react";
import {
  reviewerLogin,
  reviewerLogout,
  checkReviewerSession,
  getReviewQueue,
  getReviewCandidateDetail,
  applyReviewDecision,
  getCardVersions,
  ReviewerCandidate,
} from "../../services/api/reviewer";
import { ProvenanceBadge } from "../../components/provenance/ProvenanceBadge";
import {
  Shield,
  Lock,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  History,
  ArrowRight,
  Eye,
  CheckSquare,
  Square,
} from "lucide-react";

export const ReviewWorkspace: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Queue state
  const [queue, setQueue] = useState<ReviewerCandidate[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ready_for_review");
  const [selectedCandidate, setSelectedCandidate] = useState<ReviewerCandidate | null>(null);

  // Decision form state
  const [cardId, setCardId] = useState("");
  const [title, setTitle] = useState("");
  const [editorialNotes, setEditorialNotes] = useState("");
  const [decisionNote, setDecisionNote] = useState("");

  const [checks, setChecks] = useState({
    privacy_check: false,
    stereotype_risk_check: false,
    conditional_wording_check: false,
    perspective_diversity_check: false,
    counterexample_check: false,
    safe_action_check: false,
    evidence_scope_check: false,
  });

  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [versionHistory, setVersionHistory] = useState<any[] | null>(null);

  useEffect(() => {
    checkReviewerSession().then((auth) => {
      setIsAuthenticated(auth);
      if (auth) loadQueue(statusFilter);
    });
  }, []);

  const loadQueue = async (st = statusFilter) => {
    setLoading(true);
    try {
      const data = await getReviewQueue(st === "all" ? undefined : st);
      setQueue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      await reviewerLogin(tokenInput.trim());
      setIsAuthenticated(true);
      setTokenInput("");
      loadQueue();
    } catch (err: any) {
      setLoginError(err.message || "Invalid reviewer token");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await reviewerLogout();
    setIsAuthenticated(false);
    setSelectedCandidate(null);
  };

  const handleSelectCandidate = (cand: ReviewerCandidate) => {
    setSelectedCandidate(cand);
    setCardId(`sg-${cand.scenario_family.toLowerCase()}-${cand.candidate_id.slice(0, 6)}`);
    setTitle(`${cand.cue} in ${cand.scenario_family}`);
    setEditorialNotes("");
    setDecisionNote("");
    setConflictNotice(null);
    setChecks({
      privacy_check: true,
      stereotype_risk_check: true,
      conditional_wording_check: true,
      perspective_diversity_check: cand.readiness.distinct_contributors >= 2,
      counterexample_check: Boolean(cand.counterexample),
      safe_action_check: Boolean(cand.safe_action),
      evidence_scope_check: Boolean(cand.evidence_scope),
    });
  };

  const handleApplyDecision = async (decisionType: "approve" | "request_revision" | "reject") => {
    if (!selectedCandidate) return;
    setLoading(true);
    setConflictNotice(null);

    try {
      await applyReviewDecision(selectedCandidate.candidate_id, {
        expected_candidate_version: selectedCandidate.version,
        decision: decisionType,
        card_id: cardId,
        title,
        ...checks,
        editorial_notes: editorialNotes,
        decision_note: decisionNote,
      });

      alert(`Candidate ${decisionType}d successfully!`);
      setSelectedCandidate(null);
      loadQueue();
    } catch (err: any) {
      if (err.isConflict) {
        setConflictNotice(
          `Version Conflict: Expected version ${err.expected_version}, but the candidate was updated to version ${err.current_version}. The latest version has been reloaded.`
        );
        if (err.latest_candidate) setSelectedCandidate(err.latest_candidate);
      } else {
        alert(err.message || "Decision submission failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewVersions = async (cid: string) => {
    const versions = await getCardVersions(cid);
    setVersionHistory(versions);
  };

  if (isAuthenticated === false) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Reviewer Authentication</h1>
          <p className="text-xs text-slate-500">
            Enter the reviewer token to access the moderation queue. Session is stored in an HttpOnly cookie.
          </p>
        </div>

        {loginError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Reviewer Token</label>
            <input
              type="password"
              required
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="e.g. reviewer-secret-token"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !tokenInput.trim()}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            {loading ? "Authenticating..." : "Sign In to Workspace"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Human-in-the-Loop Moderation
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Reviewer Workspace
          </h1>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>

      {/* Main Review Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Queue List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Moderation Queue ({queue.length})
              </h2>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  loadQueue(e.target.value);
                }}
                className="text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50"
              >
                <option value="ready_for_review">Ready for review</option>
                <option value="collecting_perspectives">Collecting perspectives</option>
                <option value="approved">Approved</option>
                <option value="needs_revision">Needs revision</option>
                <option value="all">All statuses</option>
              </select>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-20 bg-slate-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : queue.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No candidates match this filter.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                {queue.map((cand) => (
                  <div
                    key={cand.candidate_id}
                    onClick={() => handleSelectCandidate(cand)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedCandidate?.candidate_id === cand.candidate_id
                        ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-sm">“{cand.cue}”</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {cand.status.replace("_", " ")}
                      </span>
                    </div>

                    <p className="text-slate-600 line-clamp-2 mb-2">{cand.scenario}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{cand.perspectives.length} perspective(s)</span>
                      <span>v{cand.version}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Candidate Detail & Review Decision (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedCandidate ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400 text-xs space-y-2">
              <Shield className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700">Select a candidate from the queue</p>
              <p>Review submitted perspectives, verify checklist items, and record moderation decision.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              {conflictNotice && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs">
                  {conflictNotice}
                </div>
              )}

              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase">
                    {selectedCandidate.scenario_family} · v{selectedCandidate.version}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">“{selectedCandidate.cue}”</h2>
                </div>
                <button
                  onClick={() => handleViewVersions(cardId)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  <History className="w-3.5 h-3.5" />
                  Version history
                </button>
              </div>

              {/* Scenario */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-xs space-y-1">
                <span className="font-semibold text-slate-700">Submitted Scenario:</span>
                <p className="text-slate-800 leading-relaxed">{selectedCandidate.scenario}</p>
                <div className="flex gap-2 text-[11px] text-slate-500 pt-1">
                  <span>Relationship: {selectedCandidate.relationship}</span>
                  <span>•</span>
                  <span>Channel: {selectedCandidate.channel}</span>
                  <span>•</span>
                  <span>Formality: {selectedCandidate.formality}</span>
                </div>
              </div>

              {/* Perspectives */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Perspectives ({selectedCandidate.perspectives.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedCandidate.perspectives.map((p, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-1 shadow-2xs">
                      <span className="font-bold text-indigo-700 text-[11px]">Perspective {idx + 1}</span>
                      <p className="text-slate-800 leading-relaxed">{p.interpretation}</p>
                      {p.conditions && <p className="text-[11px] text-slate-500">Conditions: {p.conditions}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Required 7 Approval Checks */}
              <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Mandatory Review Checklist
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(checks).map(([key, val]) => (
                    <label
                      key={key}
                      onClick={() => setChecks({ ...checks, [key]: !val })}
                      className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 select-none"
                    >
                      {val ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="capitalize">{key.replaceAll("_", " ")}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Card Meta for Approval */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Approved Card ID</label>
                  <input
                    type="text"
                    value={cardId}
                    onChange={(e) => setCardId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Public Card Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Decision Note</label>
                <input
                  type="text"
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder="Rationale for decision (required for revision or reject)"
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>

              {/* Decision Actions */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleApplyDecision("reject")}
                  className="px-4 py-2 rounded-xl border border-rose-300 text-rose-700 text-xs font-semibold hover:bg-rose-50 transition-colors"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleApplyDecision("request_revision")}
                  className="px-4 py-2 rounded-xl border border-amber-300 text-amber-800 text-xs font-semibold hover:bg-amber-50 transition-colors"
                >
                  Request Revision
                </button>
                <button
                  type="button"
                  disabled={loading || !Object.values(checks).every(Boolean)}
                  onClick={() => handleApplyDecision("approve")}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Approve as Community-Reviewed
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Version History Modal */}
      {versionHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Approved Version History</h3>
              <button onClick={() => setVersionHistory(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {versionHistory.length === 0 ? (
              <p className="text-xs text-slate-500">No previous approved versions recorded for this card ID.</p>
            ) : (
              <div className="space-y-2">
                {versionHistory.map((v) => (
                  <div key={v.version} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Version {v.version}</span>
                      <span className={v.is_active ? "text-emerald-700" : "text-slate-400"}>
                        {v.is_active ? "Active" : "Superseded"}
                      </span>
                    </div>
                    <p className="text-slate-600">Approved at: {new Date(v.approved_at).toLocaleString()}</p>
                    {v.editorial_notes && <p className="text-slate-500 italic">Notes: {v.editorial_notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
