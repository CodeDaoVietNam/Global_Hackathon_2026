# Experience Shell Phase D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete responsive ContextCue product shell with routed Explore, Context Lab, Practice, Learning, Community, and Review experiences, backed by real server-sent progress events and resilient user-state handling.

**Architecture:** React Router provides route-level feature boundaries inside a shared responsive shell. Feature folders own pages and local components while typed API, streaming, storage, provenance, evidence, progress, and form primitives remain shared. FastAPI adds a browse API and streams sanitized graph events as work happens; thread IDs and idempotency keys preserve the learner's work across retries.

**Tech Stack:** React 19, TypeScript, React Router 7, Tailwind CSS 4, Vitest, Testing Library, FastAPI, LangGraph, SSE over Fetch `ReadableStream`, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-16-experience-shell-design.md`

## Global Constraints

- Routes are `/`, `/explore`, `/sessions/:threadId`, `/sessions/:threadId/practice/:practiceId`, `/learning`, `/community`, `/community/candidates/:candidateId`, `/review`, and `/review/candidates/:candidateId`.
- Primary navigation is Explore, Context Lab, Practice Studio, My Learning, and Community; Review appears only for an authenticated reviewer session.
- The visual system uses teal, cream, ink, mist, and coral with the trail `Understand -> Clarify -> Respond -> Practise -> Reflect`.
- UI evidence and agent traces contain public status, counts, citations, and fallback state only; never show chain-of-thought, prompts, secrets, tokens, or raw model payloads.
- Missing-context flows ask at most three relevant questions, accept a subset of answers, preserve known facts, and provide an evidence-only action.
- Context Switcher is explicitly hypothetical, preserves the original analysis, and explains changed interpretations, facts, strategies, evidence, and reasons.
- Loading and recoverable errors preserve user input. Retried mutations reuse the same thread ID and idempotency key.
- Lexical retrieval fallback is a normal labelled state. Provider failures return safe guidance and a retry path.
- Reviewer HTTP 401 routes to login; HTTP 409 reloads the latest candidate while preserving the local draft.
- Every interactive control is keyboard usable, has a visible focus state, and meets WCAG AA contrast. The product remains usable at 360 CSS pixels without horizontal page scrolling.
- English is the default explanation language and Singapore campus context remains the initial evidence scope.
- This workspace has no valid Git repository, so commit steps are recorded as unavailable rather than simulated.

---

### Task 1: Router, feature boundaries, and application shell

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/src/main.tsx`
- Replace: `frontend/src/App.tsx`
- Create: `frontend/src/app/router.tsx`
- Create: `frontend/src/app/layout/AppShell.tsx`
- Create: `frontend/src/app/layout/PrimaryNav.tsx`
- Create: `frontend/src/app/layout/MobileNav.tsx`
- Create: `frontend/src/app/RouteErrorBoundary.tsx`
- Create: `frontend/src/features/home/HomePage.tsx`
- Test: `frontend/src/app/router.test.tsx`

**Interfaces:**
- Produces: all required Phase D routes, shared navigation, responsive layout, route error fallback, and reviewer-nav visibility from session state.
- Consumes: existing Phase A-C components through temporary route adapters until their feature moves are complete.

- [ ] **Step 1: Add `react-router-dom` constrained to major version 7 and lock the resolved version; add a test-memory router helper**
- [ ] **Step 2: Write failing route tests for every URL, active navigation state, unknown-route recovery, deep links, and conditional Review navigation**
- [ ] **Step 3: Implement route objects and the shared shell; `/` explains the product and routes the main action to `/explore`**
- [ ] **Step 4: Keep each page directly addressable and refresh-safe; do not store navigation state solely in React component memory**
- [ ] **Step 5: Run focused tests, TypeScript checks, and the existing app tests; record the checkpoint without simulating a Git commit**

### Task 2: Design tokens, trail, provenance, evidence, and resilient form primitives

**Files:**
- Modify: `frontend/src/index.css`
- Create: `frontend/src/app/layout/PageHeader.tsx`
- Create: `frontend/src/components/progress/LearningTrail.tsx`
- Create: `frontend/src/components/provenance/ProvenanceBadge.tsx`
- Create: `frontend/src/components/evidence/EvidenceCard.tsx`
- Create: `frontend/src/components/evidence/EvidenceRail.tsx`
- Create: `frontend/src/components/forms/AsyncAction.tsx`
- Create: `frontend/src/components/forms/InlineError.tsx`
- Test: `frontend/src/components/shared-components.test.tsx`

**Interfaces:**
- Produces: CSS variables for the five-color system, type/spacing/focus tokens, stage trail, provenance labels, evidence summaries, retry-safe action state, and accessible errors.

- [ ] **Step 1: Write failing component tests for active/completed trail stages, every provenance label, evidence fallback state, keyboard focus, pending actions, and screen-reader error announcements**
- [ ] **Step 2: Define semantic tokens for background, surface, text, muted text, border, focus, success, warning, and accent; verify normal and large-text contrast against WCAG AA**
- [ ] **Step 3: Implement shared components without feature-specific API calls and add reduced-motion behavior for progress animations**
- [ ] **Step 4: Render the shell at 360, 768, and 1440 CSS pixels; eliminate page-level horizontal overflow and maintain 44-pixel touch targets**
- [ ] **Step 5: Run focused tests and a production build**

### Task 3: Explore library API and responsive discovery page

**Files:**
- Create: `backend/app/api/library.py`
- Create: `backend/app/services/library_service.py`
- Modify: `backend/app/main.py`
- Create: `frontend/src/features/explore/types.ts`
- Create: `frontend/src/features/explore/ExplorePage.tsx`
- Create: `frontend/src/features/explore/ExploreFilters.tsx`
- Create: `frontend/src/features/explore/ScenarioCard.tsx`
- Create: `frontend/src/features/explore/ScenarioDetail.tsx`
- Create: `frontend/src/services/api/library.ts`
- Test: `backend/tests/test_library_api.py`
- Test: `frontend/src/features/explore/ExplorePage.test.tsx`

**Interfaces:**
- Produces: `GET /api/v2/library/cards` with scenario-family, relationship, channel, formality, learning-goal, evidence-status, query, cursor, and limit filters.
- Returns: public synthetic seeds and active approved versions with provenance, evidence scope, actionable example, and filter facets.

- [ ] **Step 1: Write failing API tests for filters, combined filters, pagination stability, approved/synthetic eligibility, and exclusion of every untrusted candidate status**
- [ ] **Step 2: Implement the browse service on the unified Phase C evidence repository and return facet counts from the same eligible result set**
- [ ] **Step 3: Write failing UI tests for desktop sidebar, mobile filter sheet, removable filter chips, loading skeleton, empty result, API error/retry, card detail, and URL-backed filters**
- [ ] **Step 4: Build scenario cards for Teamwork, Humour, Feedback, and Campus Life with visible provenance and evidence scope; selecting a card opens detail without losing filters**
- [ ] **Step 5: Run backend/frontend focused tests, keyboard navigation checks, and responsive viewport checks**

### Task 4: Live LangGraph event streaming and safe event trace

**Files:**
- Modify: `agent/contextcue_agent/runner.py`
- Create: `backend/app/services/analysis_stream.py`
- Modify: `backend/app/api/routes_v2.py`
- Create: `frontend/src/services/streaming/sse.ts`
- Create: `frontend/src/services/streaming/contextStream.ts`
- Create: `frontend/src/components/progress/AgentTrace.tsx`
- Test: `agent/tests/test_runner_stream.py`
- Test: `backend/tests/test_api_v2_stream.py`
- Test: `frontend/src/services/streaming/sse.test.ts`

**Interfaces:**
- Produces: `ContextCueRunner.stream_analysis(...) -> AsyncIterator[GraphEvent]` and POST SSE events `analysis.started`, `stage.started`, `stage.completed`, `context.required`, `retrieval.completed`, `fallback.used`, `analysis.completed`, and `analysis.failed`.
- Public events contain event ID, timestamp, stage, status, counts, retrieval mode, public evidence IDs, and safe error code only.

- [ ] **Step 1: Write failing agent tests proving node events arrive before final completion and no event field contains prompt, hidden reasoning, credentials, or raw provider response**
- [ ] **Step 2: Write failing API tests for ordered event IDs, heartbeat comments, client disconnect cancellation, resumable final lookup, same-thread idempotent retry, and safe provider failure**
- [ ] **Step 3: Refactor the runner to yield sanitized events from actual graph updates; persist the final Context Map once and close work when the HTTP client disconnects**
- [ ] **Step 4: Implement a POST-capable Fetch stream parser that handles fragmented UTF-8 chunks, multiline `data`, comments, final buffered frames, abort signals, and non-SSE HTTP errors**
- [ ] **Step 5: Render a concise user-facing trace from the received events and label lexical fallback as an available evidence mode**
- [ ] **Step 6: Run focused tests plus all Phase A context-analysis regressions**

### Task 5: Deep Context Lab and missing-context recovery

**Files:**
- Move: `frontend/src/components/ContextLab.tsx` -> `frontend/src/features/context-lab/ContextLabPage.tsx`
- Create: `frontend/src/features/context-lab/SituationComposer.tsx`
- Create: `frontend/src/features/context-lab/ContextQuestions.tsx`
- Create: `frontend/src/features/context-lab/ContextMapView.tsx`
- Create: `frontend/src/features/context-lab/PerspectivePanel.tsx`
- Create: `frontend/src/features/context-lab/KnownUnknownPanel.tsx`
- Create: `frontend/src/features/context-lab/ResponseWorkspace.tsx`
- Create: `frontend/src/services/storage/drafts.ts`
- Create: `frontend/src/services/api/context.ts`
- Extend: `backend/app/api/routes_v2.py`
- Test: `frontend/src/features/context-lab/ContextLabPage.test.tsx`
- Test: `backend/tests/test_api_v2_context_evidence_only.py`

**Interfaces:**
- Produces: `POST /api/v2/threads/{thread_id}/context/evidence-only`, a desktop three-column lab, ordered mobile layout, sticky stage navigation, and recoverable local drafts.

- [ ] **Step 1: Write failing API tests proving evidence-only completion preserves known facts, labels unknowns, performs no interpretation generation, and remains retrievable under the same thread**
- [ ] **Step 2: Write failing UI tests for situation submission, live stages, known/unknown facts, two perspectives, evidence rail, at most three questions, subset answers, evidence-only action, reload recovery, and retry with the same idempotency key**
- [ ] **Step 3: Implement the three-column desktop layout as trail/composer, Context Map/workspace, and evidence/trace; order the same content logically on mobile**
- [ ] **Step 4: Persist only unfinished learner drafts and request identifiers locally; clear the draft after durable completion or explicit deletion**
- [ ] **Step 5: Move the existing `components/ResponseLab.tsx` behavior into `ResponseWorkspace`, update imports, and preserve editable strategy variants and evidence links**
- [ ] **Step 6: Run focused tests, the full frontend suite, and the Phase A/B backend suite**

### Task 6: Context Switcher and explainable comparison

**Files:**
- Modify: `agent/contextcue_agent/schemas.py`
- Modify: `agent/contextcue_agent/runner.py`
- Modify: `backend/app/api/routes_v2.py`
- Create: `frontend/src/features/context-lab/ContextSwitcher.tsx`
- Create: `frontend/src/features/context-lab/ContextComparison.tsx`
- Test: `agent/tests/test_context_switch_comparison.py`
- Test: `frontend/src/features/context-lab/ContextSwitcher.test.tsx`

**Interfaces:**
- Produces: comparison fields `changed_facts`, `changed_interpretations`, `changed_strategies`, `changed_evidence`, and `reasons`; original and hypothetical maps remain separately addressable.

- [ ] **Step 1: Write failing agent/API tests for changing relationship, channel, or urgency; assert original user facts and original analysis remain unchanged**
- [ ] **Step 2: Extend the typed comparison contract and derive reasons only from changed context fields and cited evidence**
- [ ] **Step 3: Write failing UI tests for side-panel behavior, explicit `Hypothetical` label, cancel without mutation, comparison sections, and return to original analysis**
- [ ] **Step 4: Implement the switcher with focus trapping, Escape close, focus restoration, and a shareable comparison tied to the original thread**
- [ ] **Step 5: Run focused tests and context-analysis regressions**

### Task 7: Routed Practice Studio and My Learning

**Files:**
- Move: `frontend/src/components/PracticeStudio.tsx` -> `frontend/src/features/practice/PracticeStudioPage.tsx`
- Move: `frontend/src/components/LearningDashboard.tsx` -> `frontend/src/features/learning/LearningPage.tsx`
- Create: `frontend/src/features/practice/TurnTimeline.tsx`
- Create: `frontend/src/features/practice/CoachFeedback.tsx`
- Create: `frontend/src/features/learning/SkillEvidenceList.tsx`
- Create: `frontend/src/features/learning/RecommendedLesson.tsx`
- Create: `frontend/src/services/api/practice.ts`
- Create: `frontend/src/services/api/learning.ts`
- Test: `frontend/src/features/practice/PracticeStudioPage.test.tsx`
- Test: `frontend/src/features/learning/LearningPage.test.tsx`

**Interfaces:**
- Consumes: Phase B practice, reflection, skill-evidence, recommendation, history, and deletion endpoints.
- Produces: direct practice route, two-to-three-turn timeline, role separation, observable feedback evidence, reflection/retry, progress explanation, and recommended lesson.

- [ ] **Step 1: Write failing route-level tests for direct-load practice, missing/foreign practice recovery, turn limits, retry history, exact learner-span evidence, reflection, and recommendation navigation**
- [ ] **Step 2: Split Phase B API functions into typed service modules while preserving `X-Learner-ID` and idempotency behavior**
- [ ] **Step 3: Build the role-play timeline with distinct learner, simulated partner, and coach regions; keep assumptions and remaining turn count visible**
- [ ] **Step 4: Build My Learning around demonstrated criteria, dated evidence, session history, deletion, and the deterministic reason for the next recommendation**
- [ ] **Step 5: Run focused tests and all Phase B agent/backend/frontend regressions**

### Task 8: Route Community and Review into the shell

**Files:**
- Modify: `frontend/src/app/router.tsx`
- Modify: `frontend/src/app/layout/PrimaryNav.tsx`
- Modify: `frontend/src/app/layout/MobileNav.tsx`
- Modify: `frontend/src/features/community/CommunityPage.tsx`
- Modify: `frontend/src/features/community/CandidateDetail.tsx`
- Modify: `frontend/src/features/review/ReviewerLogin.tsx`
- Modify: `frontend/src/features/review/ReviewQueue.tsx`
- Modify: `frontend/src/features/review/ReviewCandidate.tsx`
- Test: `frontend/src/features/community/community-routes.test.tsx`
- Test: `frontend/src/features/review/review-routes.test.tsx`

**Interfaces:**
- Produces: route-aware Community candidate details, protected Review routes, and shell-consistent loading/error/provenance behavior.

- [ ] **Step 1: Write failing deep-link tests for candidate detail and reviewer candidate routes, including unknown IDs, 401 redirect to reviewer login, and 409 draft-preserving refresh**
- [ ] **Step 2: Integrate Phase C pages with the shell primitives and breadcrumbs; keep Review absent from navigation until a session check succeeds**
- [ ] **Step 3: Ensure contribution and review forms survive recoverable network failures and never place raw sensitive text or reviewer tokens in URLs**
- [ ] **Step 4: Run Phase C frontend tests and all router tests**

### Task 9: Accessibility, responsive behavior, and failure-state audit

**Files:**
- Create: `frontend/e2e/accessibility.spec.ts`
- Create: `frontend/e2e/responsive.spec.ts`
- Create: `frontend/e2e/recovery.spec.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: affected Phase D components from Tasks 1-8

**Interfaces:**
- Verifies: keyboard completion, focus order, semantic landmarks, labels, announcements, contrast, 360-pixel usability, offline/retry behavior, 401, 409, provider failure, and lexical fallback.

- [ ] **Step 1: Add Playwright test configuration and deterministic API fixtures; do not make browser tests depend on live Gemini**
- [ ] **Step 2: Write end-to-end keyboard tests for Explore filters, Context questions, Practice response/reflection, Community contribution, reviewer login, and one reviewer decision**
- [ ] **Step 3: Test 360x800, 768x1024, and 1440x900 viewports for overflow, reachable controls, filter-sheet behavior, three-column collapse, and sticky navigation**
- [ ] **Step 4: Test interrupted SSE, offline mutation retry, safe provider error, lexical fallback, reviewer 401, and stale reviewer 409 while asserting learner/reviewer drafts remain intact**
- [ ] **Step 5: Repair failures in the owning feature component and rerun unit, integration, accessibility, and responsive suites**

### Task 10: Production routing, end-to-end verification, and documentation

**Files:**
- Modify: `frontend/nginx.conf`
- Modify: `docker-compose.yml`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Create: `docs/contextcue/phase-d-verification.md`

**Interfaces:**
- Verifies: SPA deep-link fallback, API/SSE proxy behavior, all product routes, full learning trail, and the Phase D Definition of Done.

- [ ] **Step 1: Configure Nginx to serve `index.html` for application routes while preserving `/api` proxying, SSE buffering disablement, and health endpoints**
- [ ] **Step 2: Run all Python tests, all frontend unit/integration tests, TypeScript checks, production build, and Playwright suites from clean processes**
- [ ] **Step 3: Build and start Docker Compose; refresh every required route directly and complete Explore -> Context Lab -> Respond -> Practice -> Reflect -> My Learning**
- [ ] **Step 4: Complete one Community contribution and one reviewer approval; confirm the approved card appears in Explore and a later Context Lab retrieval with `Community-reviewed` provenance**
- [ ] **Step 5: Inspect browser network events and application logs to confirm prompts, hidden reasoning, credentials, reviewer tokens, and privacy matches are absent**
- [ ] **Step 6: Record commands, test counts, viewport results, screenshots, outcomes, and environment-only limitations; map every Phase D Definition of Done item to evidence**
