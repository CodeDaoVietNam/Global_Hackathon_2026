export interface ReviewerCandidate {
  candidate_id: string;
  version: number;
  cue: string;
  scenario: string;
  scenario_family: string;
  relationship: string;
  channel: string;
  formality: string;
  status: string;
  do_not_assume: string;
  safe_action: string;
  counterexample: string;
  evidence_scope: string;
  perspectives: Array<{
    interpretation: string;
    conditions: string;
    counterconditions: string;
    contributor_id_hash: string;
  }>;
  readiness: {
    ready: boolean;
    missing_requirements: string[];
    perspective_count: number;
    distinct_contributors: number;
  };
  reviews: any[];
}

export interface DecisionPayload {
  expected_candidate_version: number;
  decision: "approve" | "request_revision" | "reject";
  card_id?: string;
  title?: string;
  privacy_check?: boolean;
  stereotype_risk_check?: boolean;
  conditional_wording_check?: boolean;
  perspective_diversity_check?: boolean;
  counterexample_check?: boolean;
  safe_action_check?: boolean;
  evidence_scope_check?: boolean;
  editorial_notes?: string;
  decision_note?: string;
}

export async function reviewerLogin(token: string): Promise<{ status: string }> {
  const res = await fetch("/api/v2/reviewer/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Invalid reviewer token");
  return res.json();
}

export async function reviewerLogout(): Promise<{ status: string }> {
  const res = await fetch("/api/v2/reviewer/logout", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Logout failed");
  return res.json();
}

export async function checkReviewerSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/v2/reviewer/me", { credentials: "include" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getReviewQueue(status?: string): Promise<ReviewerCandidate[]> {
  const url = status ? `/api/v2/reviewer/queue?status=${encodeURIComponent(status)}` : "/api/v2/reviewer/queue";
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load review queue");
  return res.json();
}

export async function getReviewCandidateDetail(candidateId: string): Promise<ReviewerCandidate> {
  const res = await fetch(`/api/v2/reviewer/candidates/${encodeURIComponent(candidateId)}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load candidate detail");
  return res.json();
}

export async function applyReviewDecision(candidateId: string, payload: DecisionPayload): Promise<any> {
  const res = await fetch(`/api/v2/reviewer/candidates/${encodeURIComponent(candidateId)}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 409) {
      throw { isConflict: true, ...errorData.detail };
    }
    throw new Error(errorData.detail || `Decision failed: ${res.status}`);
  }
  return res.json();
}

export async function getCardVersions(cardId: string): Promise<any[]> {
  const res = await fetch(`/api/v2/reviewer/cards/${encodeURIComponent(cardId)}/versions`, { credentials: "include" });
  if (!res.ok) return [];
  return res.json();
}
