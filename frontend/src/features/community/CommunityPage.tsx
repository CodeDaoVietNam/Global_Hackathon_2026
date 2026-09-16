import React, { useEffect, useState } from "react";
import {
  submitContribution,
  listCandidates,
  findSimilarCandidates,
  addPerspective,
  CandidatePublic,
  ContributionReceipt,
} from "../../services/api/community";
import { scanSubmissionClient, PrivacyFlag } from "./privacy";
import { ProvenanceBadge } from "../../components/provenance/ProvenanceBadge";
import { saveReceiptId, getSavedReceiptIds } from "../../services/storage/contributor";
import {
  Users,
  ShieldCheck,
  PlusCircle,
  Clock,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Search,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export const CommunityPage: React.FC = () => {
  const [candidates, setCandidates] = useState<CandidatePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"browse" | "contribute">("browse");

  // Contribution Form State
  const [cue, setCue] = useState("");
  const [scenario, setScenario] = useState("");
  const [family, setFamily] = useState("Teamwork");
  const [relationship, setRelationship] = useState("classmate");
  const [channel, setChannel] = useState("chat");
  const [formality, setFormality] = useState("casual");
  const [interpretation, setInterpretation] = useState("");
  const [doNotAssume, setDoNotAssume] = useState("");
  const [safeAction, setSafeAction] = useState("");
  const [counterexample, setCounterexample] = useState("");
  const [evidenceScope, setEvidenceScope] = useState("");

  const [privacyFlags, setPrivacyFlags] = useState<PrivacyFlag[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ContributionReceipt | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Similar candidates detection
  const [similar, setSimilar] = useState<CandidatePublic[]>([]);

  // Selected candidate for adding perspective
  const [selectedCandidate, setSelectedCandidate] = useState<CandidatePublic | null>(null);
  const [newPerspectiveText, setNewPerspectiveText] = useState("");
  const [perspectiveFlags, setPerspectiveFlags] = useState<PrivacyFlag[]>([]);
  const [perspectiveSubmitting, setPerspectiveSubmitting] = useState(false);
  const [perspectiveSuccess, setPerspectiveSuccess] = useState(false);

  const loadAllCandidates = async () => {
    setLoading(true);
    try {
      const data = await listCandidates();
      setCandidates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllCandidates();
  }, []);

  const handleCueBlur = async () => {
    if (cue.trim().length >= 2) {
      const sim = await findSimilarCandidates(cue.trim(), family);
      setSimilar(sim);
    }
  };

  const handleSubmitContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Client privacy preflight scan
    const fieldsToScan = {
      cue,
      scenario,
      interpretation,
      doNotAssume,
      safeAction,
      counterexample,
      evidenceScope,
    };
    const report = scanSubmissionClient(fieldsToScan);
    if (!report.safe) {
      setPrivacyFlags(report.flags);
      return;
    }
    setPrivacyFlags([]);
    setSubmitting(true);

    try {
      const res = await submitContribution({
        cue,
        scenario,
        scenario_family: family,
        relationship,
        channel,
        formality,
        interpretation,
        do_not_assume: doNotAssume,
        safe_action: safeAction,
        counterexample: counterexample,
        evidence_scope: evidenceScope,
      });

      setReceipt(res);
      saveReceiptId(res.contribution_id);
      loadAllCandidates();
      // Reset form
      setCue("");
      setScenario("");
      setInterpretation("");
      setDoNotAssume("");
      setSafeAction("");
      setCounterexample("");
      setEvidenceScope("");
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit contribution");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPerspective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate || !newPerspectiveText.trim()) return;

    const report = scanSubmissionClient({ perspective: newPerspectiveText });
    if (!report.safe) {
      setPerspectiveFlags(report.flags);
      return;
    }
    setPerspectiveFlags([]);
    setPerspectiveSubmitting(true);

    try {
      await addPerspective(selectedCandidate.candidate_id, {
        interpretation: newPerspectiveText.trim(),
      });
      setPerspectiveSuccess(true);
      setNewPerspectiveText("");
      loadAllCandidates();
    } catch (err: any) {
      alert(err.message || "Failed to add perspective");
    } finally {
      setPerspectiveSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Peer Knowledge Lifecycle
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Community Context & Perspectives
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "browse"
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Browse Candidates ({candidates.length})
          </button>
          <button
            onClick={() => setActiveTab("contribute")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "contribute"
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Contribute Context
          </button>
        </div>
      </div>

      {/* Lifecycle Transparency Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <Clock className="w-4 h-4 text-amber-600" />
            1. Pending Contribution
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Local cues are submitted anonymously. Submissions remain unindexed by retrieval while collecting independent perspectives.
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <Users className="w-4 h-4 text-sky-600" />
            2. Multi-Perspective Readiness
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Requires $\ge 2$ distinct contributors, counterexamples, safe actions, and do-not-assume guidance before entering review.
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            3. Human Review & Retrieval
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            A Singapore campus reviewer verifies privacy, neutral wording, and evidence limits. Only approved versions enter trusted AI retrieval.
          </p>
        </div>
      </div>

      {activeTab === "contribute" ? (
        /* Contribution Form View */
        <div className="max-w-2xl mx-auto space-y-6">
          {receipt && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-xs text-emerald-950 space-y-2">
              <h3 className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Contribution Submitted Successfully!
              </h3>
              <p>Receipt ID: <code className="bg-white px-2 py-0.5 rounded font-mono text-[11px]">{receipt.contribution_id}</code></p>
              <p>Current Status: <strong>{receipt.status}</strong> ({receipt.provenance})</p>
              <p className="text-slate-600">
                Your submission is currently collecting independent community perspectives before it can be reviewed.
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Contribute a Campus Cue or Interaction</h2>
              <p className="text-xs text-slate-500">
                Help fellow international students understand subtle Singapore communication patterns.
              </p>
            </div>

            {/* Privacy Violations Warning */}
            {privacyFlags.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-950 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-rose-900">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Please resolve privacy flags before submitting
                </div>
                <ul className="space-y-1">
                  {privacyFlags.map((flag, i) => (
                    <li key={i} className="leading-relaxed">
                      • <strong>{flag.field}:</strong> {flag.remediation}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {submitError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitContribution} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Unfamiliar Expression or Cue *
                  </label>
                  <input
                    type="text"
                    required
                    value={cue}
                    onBlur={handleCueBlur}
                    onChange={(e) => setCue(e.target.value)}
                    placeholder="e.g. can lah, bojio, chope..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Scenario Family
                  </label>
                  <select
                    value={family}
                    onChange={(e) => setFamily(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white"
                  >
                    <option value="Teamwork">Teamwork</option>
                    <option value="Humour">Humour</option>
                    <option value="Feedback">Feedback</option>
                    <option value="Campus Life">Campus Life</option>
                  </select>
                </div>
              </div>

              {/* Similar Candidates Warning */}
              {similar.length > 0 && (
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-950 space-y-1">
                  <span className="font-bold flex items-center gap-1 text-sky-900">
                    <AlertCircle className="w-3.5 h-3.5 text-sky-600" />
                    Similar candidates already exist
                  </span>
                  <p className="text-[11px] text-slate-600">
                    Consider adding your perspective to an existing candidate instead of creating a duplicate:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {similar.map((sc) => (
                      <button
                        key={sc.candidate_id}
                        type="button"
                        onClick={() => {
                          setSelectedCandidate(sc);
                          setActiveTab("browse");
                        }}
                        className="text-[11px] bg-white border border-sky-300 text-sky-800 px-2 py-0.5 rounded hover:bg-sky-100"
                      >
                        {sc.cue} ({sc.scenario_family})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Scenario Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="Describe where and how this occurred (e.g. in a tutorial group chat when discussing assignment tasks)..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Relationship</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white"
                  >
                    <option value="teammate">Teammate</option>
                    <option value="classmate">Classmate</option>
                    <option value="lecturer">Lecturer</option>
                    <option value="mentor">Mentor</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white"
                  >
                    <option value="group chat">Group Chat</option>
                    <option value="in person">In Person</option>
                    <option value="email">Email</option>
                    <option value="consultation">Consultation</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Formality</label>
                  <select
                    value={formality}
                    onChange={(e) => setFormality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white"
                  >
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Initial Perspective / Meaning *
                </label>
                <textarea
                  rows={2}
                  required
                  value={interpretation}
                  onChange={(e) => setInterpretation(e.target.value)}
                  placeholder="What did this mean in this context? (e.g. Expresses friendly reassurance that the task is manageable)..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Do Not Assume Guidance
                </label>
                <input
                  type="text"
                  value={doNotAssume}
                  onChange={(e) => setDoNotAssume(e.target.value)}
                  placeholder="e.g. Do not assume all deliverables or timelines are fully locked in..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Recommended Safe Action
                </label>
                <input
                  type="text"
                  value={safeAction}
                  onChange={(e) => setSafeAction(e.target.value)}
                  placeholder="e.g. Send a brief message confirming the exact time..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Counterexample / Alternative Context
                </label>
                <input
                  type="text"
                  value={counterexample}
                  onChange={(e) => setCounterexample(e.target.value)}
                  placeholder="e.g. If said with a hesitant tone, it may indicate reluctance..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Evidence Scope
                </label>
                <input
                  type="text"
                  value={evidenceScope}
                  onChange={(e) => setEvidenceScope(e.target.value)}
                  placeholder="e.g. Singapore undergraduate student group discussions."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {submitting ? "Checking privacy & submitting..." : "Submit Candidate Contribution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Candidates List View */
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-slate-200 p-5 h-44 animate-pulse" />
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No community candidates yet</h4>
              <p className="text-xs text-slate-500">
                Be the first to contribute a Singapore campus communication cue!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((cand) => (
                <div
                  key={cand.candidate_id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                          {cand.scenario_family}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">“{cand.cue}”</h3>
                      </div>
                      <ProvenanceBadge provenance={cand.provenance} size="sm" />
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {cand.scenario}
                    </p>

                    {/* Readiness progress pills */}
                    {cand.readiness && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                          <span>Readiness Status</span>
                          <span className={cand.readiness.ready ? "text-emerald-700" : "text-amber-700"}>
                            {cand.readiness.ready ? "Ready for review" : "Collecting perspectives"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{cand.readiness.distinct_contributors} of 2 distinct contributors</span>
                          <span>•</span>
                          <span>{cand.perspectives.length} perspective(s)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedCandidate(cand);
                        setPerspectiveSuccess(false);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add perspective
                    </button>
                    <span className="text-[11px] text-slate-400 capitalize">
                      {cand.channel} · {cand.relationship}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Perspective Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Add Perspective
                </span>
                <h3 className="text-base font-bold text-slate-900">“{selectedCandidate.cue}”</h3>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
              <span className="font-semibold text-slate-700">Scenario Context:</span>
              <p className="text-slate-600">{selectedCandidate.scenario}</p>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Existing Perspectives:</span>
              {selectedCandidate.perspectives.map((p, idx) => (
                <div key={idx} className="text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-700">
                  <strong>Perspective {p.perspective_index}:</strong> {p.interpretation}
                </div>
              ))}
            </div>

            {perspectiveSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 space-y-2">
                <p className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Your perspective was added!
                </p>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddPerspective} className="space-y-3">
                {perspectiveFlags.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-900">
                    {perspectiveFlags[0]?.remediation}
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Your Interpretation / Nuance *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newPerspectiveText}
                    onChange={(e) => setNewPerspectiveText(e.target.value)}
                    placeholder="How do you interpret this cue? Under what conditions does it apply?"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={perspectiveSubmitting || !newPerspectiveText.trim()}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                  >
                    {perspectiveSubmitting ? "Submitting..." : "Submit Perspective"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
