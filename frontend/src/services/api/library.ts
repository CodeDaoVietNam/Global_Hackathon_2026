export interface LibraryCardItem {
  id: string;
  title: string;
  expression: string;
  scenario: string;
  scenario_family: string;
  relationship: string;
  channel: string;
  formality: string;
  provenance: string;
  do_not_assume: string;
  safe_action: string;
  evidence_scope: string;
  tags: string[];
}

export interface LibraryResponse {
  cards: LibraryCardItem[];
  total: number;
  cursor: number;
  limit: number;
  facets: {
    scenario_family: Record<string, number>;
    relationship: Record<string, number>;
    channel: Record<string, number>;
    formality: Record<string, number>;
    evidence_level: Record<string, number>;
  };
}

export interface LibraryFilters {
  scenario_family?: string;
  relationship?: string;
  channel?: string;
  formality?: string;
  evidence_level?: string;
  query?: string;
  limit?: number;
  cursor?: number;
}

export async function fetchLibraryCards(filters: LibraryFilters = {}): Promise<LibraryResponse> {
  const params = new URLSearchParams();
  if (filters.scenario_family) params.set("scenario_family", filters.scenario_family);
  if (filters.relationship) params.set("relationship", filters.relationship);
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.formality) params.set("formality", filters.formality);
  if (filters.evidence_level) params.set("evidence_level", filters.evidence_level);
  if (filters.query) params.set("query", filters.query);
  if (filters.limit) params.set("limit", filters.limit.toString());
  if (filters.cursor) params.set("cursor", filters.cursor.toString());

  const res = await fetch(`/api/v2/library/cards?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load scenario library");
  return res.json();
}
