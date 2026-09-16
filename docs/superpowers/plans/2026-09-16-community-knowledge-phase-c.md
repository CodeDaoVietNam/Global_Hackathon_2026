# Community Knowledge Phase C Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn learner contributions into privacy-safe, multi-perspective, reviewer-approved Context Cards, and allow only immutable approved versions to enter trusted retrieval.

**Architecture:** FastAPI owns a separate community domain, SQLite repository, public contribution API, and cookie-authenticated reviewer API. The browser performs the first privacy scan before any request and the backend repeats the same deterministic checks before persistence. Approval is one transaction that writes an immutable card version and queues its embedding; the agent reads a unified evidence repository containing synthetic seeds and approved versions only.

**Tech Stack:** Python 3.12+, FastAPI, Pydantic 2, SQLite, React 19, TypeScript, Vitest, Testing Library, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-09-16-community-knowledge-design.md`

## Global Constraints

- Roles are learner, anonymous contributor, reviewer, and system; public responses never expose reviewer identity or contributor identifiers.
- The candidate lifecycle is `pending -> collecting_perspectives -> ready_for_review -> approved | needs_revision | rejected`; approved cards may become `superseded` or `archived`, and revised candidates may return to `ready_for_review`.
- Readiness requires two non-duplicate perspectives from different contributor IDs, a do-not-assume note, a counterexample, a safe action, an evidence scope, and no unresolved identifier flags.
- Email addresses, phone numbers, student IDs, private-token URLs, labelled full names, long pasted chats, and precise private locations are blocked in the browser and rechecked by the backend.
- Flagged raw text never reaches Gemini or another model provider.
- Only immutable approved card versions enter trusted retrieval. Pending, collecting, ready, needs-revision, rejected, superseded, and archived candidates remain ineligible.
- Synthetic seeds retain the `Synthetic seed` label and lower trust; approved versions use `Community-reviewed`. Never claim peer verification before approval.
- Reviewer authentication uses `REVIEWER_TOKEN`, constant-time comparison, a signed `HttpOnly` and `SameSite=Strict` cookie, expiry, and server-side revocation.
- Reviewer mutations require `expected_candidate_version`; stale writes return HTTP 409 with the latest version.
- API v1 remains operational and its file queue is not silently imported into the Phase C database.
- This workspace has no valid Git repository, so commit steps are recorded as unavailable rather than simulated.

---

### Task 1: Community domain, lifecycle, and deterministic privacy policy

**Files:**
- Create: `backend/app/domain/__init__.py`
- Create: `backend/app/domain/community.py`
- Create: `backend/app/services/privacy.py`
- Test: `backend/tests/test_community_domain.py`
- Test: `backend/tests/test_privacy.py`

**Interfaces:**
- Produces: `CandidateStatus`, `ReviewDecisionType`, `ContributionDraft`, `PerspectiveDraft`, `ReadinessReport`, `PrivacyFlag`, `PrivacyReport`, `assert_transition(current, target)`, `evaluate_candidate(candidate)`, and `scan_submission(fields)`.
- Consumes: plain learner-authored fields only; no model client is accepted by the privacy service.

- [ ] **Step 1: Write failing lifecycle tests for every allowed transition and representative forbidden transitions**

```python
def test_approved_candidate_cannot_return_to_pending():
    with pytest.raises(InvalidCandidateTransition):
        assert_transition(CandidateStatus.APPROVED, CandidateStatus.PENDING)

def test_readiness_requires_distinct_contributors(candidate_factory):
    candidate = candidate_factory(perspective_contributors=["anon-a", "anon-a"])
    report = evaluate_candidate(candidate)
    assert report.ready is False
    assert "different_contributors" in report.missing_requirements
```

- [ ] **Step 2: Write failing privacy tests covering each blocked identifier class, benign text, normalized Unicode, and a long-chat threshold of 1,500 characters or 12 line breaks**
- [ ] **Step 3: Run `pytest -q backend/tests/test_community_domain.py backend/tests/test_privacy.py` and confirm the new imports fail**
- [ ] **Step 4: Implement enums, immutable input models, the explicit transition table, normalized duplicate detection, readiness calculation, and field-level privacy flags with stable codes**
- [ ] **Step 5: Re-run the focused tests; verify privacy reports contain field name, code, and safe remediation without echoing the matched secret**
- [ ] **Step 6: Record the checkpoint in this plan; do not initialize or simulate Git metadata**

### Task 2: Community SQLite schema and repository

**Files:**
- Create: `backend/app/repositories/__init__.py`
- Create: `backend/app/repositories/community.py`
- Create: `backend/app/db_schema/__init__.py`
- Create: `backend/app/db_schema/community.py`
- Modify: `backend/app/database.py`
- Test: `backend/tests/test_community_repository.py`

**Interfaces:**
- Produces: `CommunityRepository.create_contribution`, `find_similar_candidates`, `list_public_candidates`, `get_public_candidate`, `add_perspective`, `get_status_receipt`, `list_review_queue`, `get_reviewer_candidate`, `apply_decision`, and `list_card_versions`.
- Persists: `contributions`, `card_candidates`, `perspectives`, `reviews`, `approved_card_versions`, `card_embedding_jobs`, and `reviewer_sessions`.

- [ ] **Step 1: Write failing repository tests for contribution creation, public-field projection, distinct-contributor readiness, duplicate perspective rejection, and deterministic pagination**
- [ ] **Step 2: Write failing transaction tests proving approval creates one immutable version plus one embedding job, stale versions fail without partial writes, and historical versions cannot be updated**
- [ ] **Step 3: Run `pytest -q backend/tests/test_community_repository.py` and confirm the schema/repository is missing**
- [ ] **Step 4: Add idempotent schema initialization with foreign keys, status checks, UTC timestamps, candidate `version`, normalized perspective hash, and indexes on status, update time, candidate ID, and embedding-job state**
- [ ] **Step 5: Implement repository transactions using parameterized SQL; public projections omit contributor hashes, reviewer IDs, raw auth data, internal notes, and privacy matches**
- [ ] **Step 6: Re-run repository tests against a temporary SQLite file and verify rollback after a forced embedding-job insertion failure**

### Task 3: Public Community service and API

**Files:**
- Create: `backend/app/services/community_service.py`
- Create: `backend/app/api/community.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_api_v2_community.py`

**Interfaces:**
- Produces:
  - `POST /api/v2/community/contributions`
  - `GET /api/v2/community/candidates`
  - `GET /api/v2/community/candidates/{candidate_id}`
  - `POST /api/v2/community/candidates/{candidate_id}/perspectives`
  - `GET /api/v2/community/contributions/{contribution_id}/status`
- Consumes: anonymous `X-Contributor-ID`, `Idempotency-Key`, and validated Phase C request bodies.

- [ ] **Step 1: Write failing HTTP tests for create/receipt/status, similar-candidate suggestions, perspective addition, pagination, idempotent replay, missing contributor ID, blocked privacy input, and unknown resources**
- [ ] **Step 2: Assert privacy-blocked requests return 422 before repository or model calls and expose stable `privacy_flags` without the matched value**
- [ ] **Step 3: Run `pytest -q backend/tests/test_api_v2_community.py` and confirm the routes return 404**
- [ ] **Step 4: Implement typed service orchestration and a dedicated router; hash contributor IDs with an application pepper before persistence and never return the hash**
- [ ] **Step 5: Generate a receipt containing contribution ID, candidate ID, current status, requirements still missing, provenance label, and a status URL**
- [ ] **Step 6: Re-run the focused tests and all existing backend API v1/v2 tests**

### Task 4: Reviewer authentication and authorization boundary

**Files:**
- Create: `backend/app/services/reviewer_auth.py`
- Create: `backend/app/api/reviewer.py`
- Modify: `.env.example`
- Test: `backend/tests/test_reviewer_auth.py`

**Interfaces:**
- Produces: `POST /api/v2/reviewer/login`, `POST /api/v2/reviewer/logout`, `require_reviewer(request)`, and the `contextcue_reviewer` cookie.
- Consumes: `REVIEWER_TOKEN`, `REVIEWER_COOKIE_SECRET`, `REVIEWER_SESSION_TTL_SECONDS`, and `REVIEWER_COOKIE_SECURE`.

- [ ] **Step 1: Write failing tests for a valid login, invalid token, missing configuration, expired/revoked session, logout, and protected endpoint access**
- [ ] **Step 2: Assert token comparison uses a wrapped `secrets.compare_digest` call and responses/logs never contain the configured token**
- [ ] **Step 3: Implement a signed HMAC-SHA256 session envelope backed by a random server-side session ID in `reviewer_sessions`; set `HttpOnly`, `SameSite=Strict`, root path, max age, and environment-controlled `Secure`**
- [ ] **Step 4: Reject unsafe mutation origins using the configured frontend origin in addition to SameSite cookie protection**
- [ ] **Step 5: Re-run focused auth tests and verify logout revokes the database session before clearing the cookie**

### Task 5: Reviewer queue, decisions, immutable versions, and trusted retrieval

**Files:**
- Extend: `backend/app/api/reviewer.py`
- Create: `backend/app/services/review_service.py`
- Create: `backend/app/repositories/evidence.py`
- Create: `agent/contextcue_agent/repository.py`
- Modify: `agent/contextcue_agent/retrieval.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_api_v2_reviewer.py`
- Test: `agent/tests/test_evidence_repository.py`

**Interfaces:**
- Produces:
  - `GET /api/v2/reviewer/queue`
  - `GET /api/v2/reviewer/candidates/{candidate_id}`
  - `POST /api/v2/reviewer/candidates/{candidate_id}/decision`
  - `GET /api/v2/reviewer/candidates/{candidate_id}/versions`
  - `EvidenceRepository.eligible_cards()`
- Decision payload contains `expected_candidate_version`, decision, edited card fields, evidence scope, counterexample, safe action, and reviewer rationale.

- [ ] **Step 1: Write failing reviewer API tests for queue filters, readiness details, approval checks, needs-revision/rejection, version history, unauthenticated 401, and stale-version 409**
- [ ] **Step 2: Write failing retrieval tests proving pending records never appear, an approved version appears with `Community-reviewed`, superseded versions disappear, and seeds remain labelled `Synthetic seed`**
- [ ] **Step 3: Implement the review checklist for privacy, conditional language, stereotype risk, perspective diversity, counterexample, safe action, and evidence scope; return field-specific 422 errors when approval requirements fail**
- [ ] **Step 4: Define an agent-side evidence repository protocol and inject a backend adapter that merges canonical seed JSON with active approved versions; do not make the agent import FastAPI or SQLite**
- [ ] **Step 5: Treat embedding jobs as optional enrichment: new approved cards are immediately lexical-searchable and become hybrid-searchable only after the job succeeds**
- [ ] **Step 6: Run reviewer, retrieval, context-analysis, and API regression suites**

### Task 6: Community contribution experience

**Files:**
- Create: `frontend/src/features/community/types.ts`
- Create: `frontend/src/features/community/privacy.ts`
- Create: `frontend/src/features/community/CommunityPage.tsx`
- Create: `frontend/src/features/community/ContributionForm.tsx`
- Create: `frontend/src/features/community/CandidateDetail.tsx`
- Create: `frontend/src/features/community/ContributionReceipt.tsx`
- Move: `frontend/src/services/api.ts` -> `frontend/src/services/api/client.ts`
- Move: `frontend/src/services/api.test.ts` -> `frontend/src/services/api/client.test.ts`
- Create: `frontend/src/services/api/community.ts`
- Create: `frontend/src/services/storage/contributor.ts`
- Test: `frontend/src/features/community/CommunityPage.test.tsx`
- Test: `frontend/src/features/community/privacy.test.ts`

**Interfaces:**
- Consumes: public Community API and an anonymous contributor ID stored locally.
- Produces: lifecycle explanation, contribution form, privacy preflight, similar-candidate choice, perspective form, receipt, and remaining-requirements display.

- [ ] **Step 1: Write failing tests proving every blocked identifier prevents `fetch`, a clean contribution submits, similar candidates can be selected, and receipts survive a reload**
- [ ] **Step 2: Move the existing API client into `services/api/client.ts`, update all imports, and keep the existing API tests green before adding Community calls**
- [ ] **Step 3: Implement a TypeScript privacy scanner from the same named policy fixtures used by Python; show field-level remediation and discard flagged text when the user resets the form**
- [ ] **Step 4: Build accessible contribution and perspective forms with explicit provenance labels and status language; do not present pending content as trusted guidance**
- [ ] **Step 5: Store only contributor ID and receipt IDs in local storage; never store raw contribution text, reviewer tokens, or reviewer cookies**
- [ ] **Step 6: Run focused Vitest tests, `npm run build`, and compare the Python/TypeScript policy fixture results**

### Task 7: Reviewer workspace

**Files:**
- Create: `frontend/src/features/review/ReviewerLogin.tsx`
- Create: `frontend/src/features/review/ReviewQueue.tsx`
- Create: `frontend/src/features/review/ReviewCandidate.tsx`
- Create: `frontend/src/features/review/ReviewHistory.tsx`
- Create: `frontend/src/services/api/reviewer.ts`
- Test: `frontend/src/features/review/ReviewWorkspace.test.tsx`

**Interfaces:**
- Consumes: reviewer API with `credentials: "include"`.
- Produces: login, queue filters, side-by-side perspectives, readiness/privacy flags, editable approved-card preview, retrieval preview, decision controls, conflict recovery, and immutable version history.

- [ ] **Step 1: Write failing tests for login, 401 session expiry, queue filters, approval validation, needs-revision notes, rejection rationale, and version history**
- [ ] **Step 2: Write a stale-write test where HTTP 409 shows the latest version and preserves the reviewer's unsaved draft for manual reconciliation**
- [ ] **Step 3: Implement the workspace without persisting the reviewer token in browser storage; clear token input immediately after login completes**
- [ ] **Step 4: Display the exact approval checklist and retrieval eligibility result before a decision; require rationale for needs-revision and rejection**
- [ ] **Step 5: Run focused tests, the full frontend suite, TypeScript checks, and the production build**

### Task 8: Phase C end-to-end verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Create: `docs/contextcue/phase-c-verification.md`

**Interfaces:**
- Verifies: contribution through approval, retrieval eligibility, privacy containment, concurrency, provenance, and API v1 compatibility.

- [ ] **Step 1: Run all agent, backend, and frontend tests from clean processes**
- [ ] **Step 2: Exercise one contribution with two distinct perspectives; confirm it becomes ready, a stale decision returns 409, approval creates version 1, and version 1 appears in lexical retrieval**
- [ ] **Step 3: Submit every privacy fixture through the browser scanner and backend API; confirm blocked raw text never enters SQLite, logs, graph state, or mocked model calls**
- [ ] **Step 4: Build and start Docker Compose; verify reviewer cookies, logout revocation, Community views, Review views, health checks, and API v1 regression**
- [ ] **Step 5: Record commands, test counts, outcomes, and environment-only limitations in the verification document; re-read every Phase C Definition of Done item and map it to evidence**
