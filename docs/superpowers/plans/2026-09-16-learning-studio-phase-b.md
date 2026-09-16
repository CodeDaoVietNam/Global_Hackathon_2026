# Learning Studio Phase B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an evidence-based response lab, a two-to-three-turn role-play loop, learner-authored reflection, skill evidence, and deterministic recommendations to completed Context Maps.

**Architecture:** Practice extends the agent package but stores authoritative limits and learning records in backend SQLite repositories. Each submitted response receives one structured coaching result whose positive evidence must quote the learner's response. The React app consumes API v2 for Context Lab, Response Lab, Practice Studio, and My Learning while preserving API v1 compatibility.

**Tech Stack:** Python 3.12+, LangGraph, FastAPI, SQLite, React 19, TypeScript, Vitest, Testing Library, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-09-16-learning-studio-design.md`

## Global Constraints

- A practice run accepts at most three learner responses.
- Feedback evaluates observable wording and never assigns personality, nationality, cultural-intelligence, or outcome-certainty scores.
- Positive criterion evidence must be an exact span in the submitted learner response.
- Simulation assumptions are explicit and may not invent deadlines, owners, agreements, protected traits, or personal history.
- Reflection text is stored verbatim and is never rewritten by the model.
- Progress means demonstrated practice criteria, not real-world competence.
- Recommendations are deterministic and explainable.
- This workspace has no valid Git repository, so commit steps are recorded as unavailable rather than simulated.

---

### Task 1: Response strategies and practice contracts

**Files:**
- Create: `agent/contextcue_agent/practice.py`
- Extend: `agent/contextcue_agent/schemas.py`
- Extend: `agent/contextcue_agent/state.py`
- Test: `agent/tests/test_practice.py`

**Interfaces:**
- Produces: `PracticeGoal`, `ResponseStrategy`, `PracticeTurn`, `CoachResult`, `PracticeRun`, `strategies_for(context_map, goal)`, and `criteria_for(goal)`.

- [x] **Step 1: Write failing tests for goal-to-criteria mapping, three distinct low-risk strategies, and context-derived formality**
- [x] **Step 2: Run focused tests and confirm contracts are missing**
- [x] **Step 3: Implement clarification, confirmation, boundary, and formal strategy templates selected from the Context Map without invented facts**
- [x] **Step 4: Re-run focused tests and all agent tests**

### Task 2: Role-play and coaching workflow

**Files:**
- Create: `agent/contextcue_agent/practice_graph.py`
- Extend: `agent/contextcue_agent/runner.py`
- Test: `agent/tests/test_practice_graph.py`

**Interfaces:**
- Produces: `PracticeRunner.start`, `PracticeRunner.respond`, and `PracticeRunner.retry`.
- Consumes: completed `ContextMap`, selected perspective and goal, conversation history, and one `StructuredModel` call per learner turn.

- [x] **Step 1: Write failing tests for two-turn completion, three-turn maximum, rejected fourth turn, preserved retry history, exact response-span evidence, and visible assumptions**
- [x] **Step 2: Run focused tests and confirm runner behavior is absent**
- [x] **Step 3: Implement a bounded practice graph with deterministic reference coaching and a structured-model path**
- [x] **Step 4: Reject invented simulation details and remove positive evidence whose span does not occur in the submitted response**
- [x] **Step 5: Re-run graph tests and all agent tests**

### Task 3: Practice persistence, reflection, skills, and recommendations

**Files:**
- Extend: `backend/app/database.py`
- Extend: `backend/app/repositories/learning.py`
- Create: `backend/app/services/learning_service.py`
- Test: `backend/tests/test_learning_repository.py`

**Interfaces:**
- Produces: persisted practice runs/turns/reflections/skill evidence, `learning_summary(learner_id)`, and `recommend_next(learner_id)`.

- [x] **Step 1: Write failing repository tests proving reflection is verbatim, evidence points to a real turn, idempotency prevents duplicate turns, and deletion cascades**
- [x] **Step 2: Write failing recommendation tests proving the least-recent skill wins, scenario family changes, and card repetition is avoided when alternatives exist**
- [x] **Step 3: Add `practice_runs`, `practice_turns`, `reflections`, and `skill_evidence` tables with foreign keys and indexes**
- [x] **Step 4: Implement transactional writes, ownership checks, deterministic recommendation reasons, and deletion**
- [x] **Step 5: Run repository tests with a temporary SQLite database**

### Task 4: Learning API v2

**Files:**
- Extend: `backend/app/api/routes_v2.py`
- Test: `backend/tests/test_api_v2_learning.py`

**Interfaces:**
- Produces: start/get/respond/reflection practice endpoints plus learning overview, session history, and session deletion.

- [x] **Step 1: Write failing HTTP tests for every Phase B endpoint, owner mismatch 404, fourth-turn 409, missing reflection fields 422, and duplicate idempotency behavior**
- [x] **Step 2: Run focused tests and confirm the routes are absent**
- [x] **Step 3: Implement route models and map domain conflicts to stable HTTP errors**
- [x] **Step 4: Re-run Phase B API tests followed by all backend tests**

### Task 5: React Context Lab, Practice Studio, and My Learning

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/services/api.ts`
- Create: `frontend/src/components/ContextLab.tsx`
- Create: `frontend/src/components/ResponseLab.tsx`
- Create: `frontend/src/components/PracticeStudio.tsx`
- Create: `frontend/src/components/LearningDashboard.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/services/api.test.ts`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: all Phase A/B API v2 endpoints and anonymous `learner_id` stored in the browser.
- Produces: context analysis/resume/switch UI, editable strategies, role-play turn UI, reflection form, skill evidence, recommendation, and session deletion.

- [x] **Step 1: Write failing client tests for v2 headers and payloads plus UI tests for Context Map sections, strategy editing, two role-play turns, assumption labels, reflection, and learning summary**
- [x] **Step 2: Run Vitest and confirm the new contracts/components fail before implementation**
- [x] **Step 3: Implement typed API functions and components; visually distinguish learner, simulated partner, and coach; show turn count and progress meaning**
- [x] **Step 4: Integrate the components into the existing application without removing Explore, contribution, or API v1 fallback behavior**
- [x] **Step 5: Run frontend tests, TypeScript checks, and production build**

### Task 6: Phase B end-to-end verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Create: `docs/contextcue/phase-a-b-verification.md`

**Interfaces:**
- Verifies: one complete two-turn route and the three-turn boundary through HTTP and the production frontend build.

- [x] **Step 1: Run every Python and frontend test from a clean process**
- [x] **Step 2: Run retrieval/safety evaluations and inspect all hard invariant results**
- [x] **Step 3: Build and start Docker Compose; verify health, create/analyze/practice/reflect/learning API flow, and API v1 regression**
- [x] **Step 4: Perform live Gemini smoke analysis/practice when credentials are configured, without exposing the key**
- [x] **Step 5: Record commands, counts, results, and any unverified browser-only behavior in the verification document**

