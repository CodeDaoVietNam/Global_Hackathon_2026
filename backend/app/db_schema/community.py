"""SQLite schema DDL for ContextCue Phase C Community Knowledge."""

COMMUNITY_SCHEMA_DDL = """
CREATE TABLE IF NOT EXISTS contributions (
    contribution_id TEXT PRIMARY KEY,
    contributor_id_hash TEXT NOT NULL,
    cue TEXT NOT NULL,
    scenario TEXT NOT NULL,
    scenario_family TEXT NOT NULL,
    relationship TEXT NOT NULL,
    channel TEXT NOT NULL,
    formality TEXT NOT NULL,
    interpretation TEXT NOT NULL,
    conditions TEXT DEFAULT '',
    counterconditions TEXT DEFAULT '',
    do_not_assume TEXT DEFAULT '',
    safe_action TEXT DEFAULT '',
    counterexample TEXT DEFAULT '',
    evidence_scope TEXT DEFAULT '',
    direct_experience INTEGER DEFAULT 1,
    consent_given INTEGER DEFAULT 1,
    status TEXT NOT NULL,
    candidate_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS card_candidates (
    candidate_id TEXT PRIMARY KEY,
    cue TEXT NOT NULL,
    scenario TEXT NOT NULL,
    scenario_family TEXT NOT NULL,
    relationship TEXT NOT NULL,
    channel TEXT NOT NULL,
    formality TEXT NOT NULL,
    status TEXT NOT NULL,
    do_not_assume TEXT DEFAULT '',
    safe_action TEXT DEFAULT '',
    counterexample TEXT DEFAULT '',
    evidence_scope TEXT DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS perspectives (
    perspective_id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    contribution_id TEXT,
    contributor_id_hash TEXT NOT NULL,
    interpretation TEXT NOT NULL,
    interpretation_hash TEXT NOT NULL,
    conditions TEXT DEFAULT '',
    counterconditions TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY(candidate_id) REFERENCES card_candidates(candidate_id)
);

CREATE TABLE IF NOT EXISTS reviews (
    review_id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    reviewer_session_id TEXT NOT NULL,
    privacy_check INTEGER NOT NULL DEFAULT 1,
    stereotype_risk_check INTEGER NOT NULL DEFAULT 1,
    conditional_wording_check INTEGER NOT NULL DEFAULT 1,
    perspective_diversity_check INTEGER NOT NULL DEFAULT 1,
    counterexample_check INTEGER NOT NULL DEFAULT 1,
    safe_action_check INTEGER NOT NULL DEFAULT 1,
    evidence_scope_check INTEGER NOT NULL DEFAULT 1,
    decision TEXT NOT NULL,
    decision_note TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY(candidate_id) REFERENCES card_candidates(candidate_id)
);

CREATE TABLE IF NOT EXISTS approved_card_versions (
    card_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    candidate_id TEXT NOT NULL,
    title TEXT NOT NULL,
    cue TEXT NOT NULL,
    scenario TEXT NOT NULL,
    scenario_family TEXT NOT NULL,
    relationship TEXT NOT NULL,
    channel TEXT NOT NULL,
    formality TEXT NOT NULL,
    perspectives_json TEXT NOT NULL,
    do_not_assume TEXT NOT NULL,
    safe_action TEXT NOT NULL,
    counterexample TEXT NOT NULL,
    evidence_scope TEXT NOT NULL,
    editorial_notes TEXT DEFAULT '',
    provenance TEXT NOT NULL DEFAULT 'Community-reviewed',
    is_active INTEGER NOT NULL DEFAULT 1,
    approved_at TEXT NOT NULL,
    PRIMARY KEY (card_id, version)
);

CREATE TABLE IF NOT EXISTS card_embedding_jobs (
    job_id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviewer_sessions (
    session_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS community_idempotency (
    operation TEXT NOT NULL,
    contributor_id_hash TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (operation, contributor_id_hash, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_candidates_status ON card_candidates(status);
CREATE INDEX IF NOT EXISTS idx_perspectives_candidate ON perspectives(candidate_id);
CREATE INDEX IF NOT EXISTS idx_approved_active ON approved_card_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status ON card_embedding_jobs(status);
CREATE INDEX IF NOT EXISTS idx_contributions_cand ON contributions(candidate_id);
"""
