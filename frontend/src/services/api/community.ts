import { getOrCreateContributorId } from "../storage/contributor";

export interface ContributionPayload {
  cue: string;
  scenario: string;
  scenario_family: string;
  relationship: string;
  channel: string;
  formality: string;
  interpretation: string;
  conditions?: string;
  counterconditions?: string;
  do_not_assume?: string;
  safe_action?: string;
  counterexample?: string;
  evidence_scope?: string;
  direct_experience?: boolean;
  consent_given?: boolean;
}

export interface PerspectivePayload {
  interpretation: string;
  conditions?: string;
  counterconditions?: string;
}

export interface CandidatePublic {
  candidate_id: string;
  cue: string;
  scenario: string;
  scenario_family: string;
  relationship: string;
  channel: string;
  formality: string;
  status: string;
  provenance: string;
  do_not_assume: string;
  safe_action: string;
  counterexample: string;
  evidence_scope: string;
  perspectives: Array<{
    perspective_index: number;
    interpretation: string;
    conditions: string;
    counterconditions: string;
  }>;
  readiness: {
    ready: boolean;
    missing_requirements: string[];
    perspective_count: number;
    distinct_contributors: number;
  };
}

export interface ContributionReceipt {
  contribution_id: string;
  candidate_id: string;
  status: string;
  provenance: string;
  readiness: {
    ready: boolean;
    missing_requirements: string[];
    perspective_count: number;
    distinct_contributors: number;
  };
  created_at: string;
}

export async function submitContribution(payload: ContributionPayload): Promise<ContributionReceipt> {
  const contributorId = getOrCreateContributorId();
  const res = await fetch("/api/v2/community/contributions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Contributor-ID": contributorId,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail?.error || errorData.detail || `Server error: ${res.status}`);
  }
  return res.json();
}

export async function listCandidates(status?: string): Promise<CandidatePublic[]> {
  const url = status ? `/api/v2/community/candidates?status=${encodeURIComponent(status)}` : "/api/v2/community/candidates";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch candidates");
  return res.json();
}

export async function findSimilarCandidates(cue: string, scenario_family = ""): Promise<CandidatePublic[]> {
  const params = new URLSearchParams({ cue, scenario_family });
  const res = await fetch(`/api/v2/community/candidates/similar?${params.toString()}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getCandidate(candidateId: string): Promise<CandidatePublic> {
  const res = await fetch(`/api/v2/community/candidates/${encodeURIComponent(candidateId)}`);
  if (!res.ok) throw new Error("Candidate not found");
  return res.json();
}

export async function addPerspective(candidateId: string, payload: PerspectivePayload): Promise<any> {
  const contributorId = getOrCreateContributorId();
  const res = await fetch(`/api/v2/community/candidates/${encodeURIComponent(candidateId)}/perspectives`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Contributor-ID": contributorId,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to add perspective");
  }
  return res.json();
}

export async function getContributionStatus(contributionId: string): Promise<any> {
  const res = await fetch(`/api/v2/community/contributions/${encodeURIComponent(contributionId)}/status`);
  if (!res.ok) throw new Error("Receipt not found");
  return res.json();
}
