# ContextCue React Frontend Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Streamlit demo with the supplied React/Vite interface, connect it to the existing FastAPI/Gemini journey, and polish it for international students.

**Architecture:** React calls FastAPI through `/api/v1`; Vite proxies that path in development and Nginx proxies it in Docker. The backend remains the source of truth for cards, sources, Gemini analysis, practice feedback, and pending contributions. Browser local storage is limited to bookmarks and learning reflections.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, FastAPI, Pydantic, Gemini REST, Nginx.

**Spec:** `docs/contextcue/react-frontend-design.md`

## Global Constraints

- Default learner-facing language is English.
- Audience is international students of any nationality entering Singapore.
- Existing cards remain labelled `synthetic_unreviewed`; no fabricated peer verification.
- New contributions enter `pending_review` and never become approved retrieval evidence automatically.
- Gemini credentials remain server-side.
- Preserve the supplied teal/cream visual direction while improving clarity, mobile behavior, keyboard focus, loading, empty, and error states.
- Keep the two-service Docker architecture.

---

### Task 1: Import and build the supplied frontend

**Files:**
- Replace: `frontend/`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/services/api.test.ts`

**Interfaces:**
- Consumes: the supplied `contextcue.zip` React/Vite project.
- Produces: a reproducible TypeScript build and a test command.

- [x] Add a failing service test that expects `getConfig()` and `analyzeSituation()` to call `/api/v1/config` and `/api/v1/analyze`.
- [x] Run `npm test` and confirm those functions are missing.
- [x] Import the supplied source, remove browser Gemini dependencies, add Vitest, and implement the smallest typed API client.
- [x] Run `npm test`, `npm run lint`, and `npm run build`.

### Task 2: Connect Explore and Practice to FastAPI

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/components/SearchInputSection.tsx`
- Modify: `frontend/src/components/ResultCardView.tsx`
- Modify: `frontend/src/components/ResponseEditorModal.tsx`

**Interfaces:**
- Consumes: `GET /config`, `GET /cards`, `POST /analyze`, and `POST /practice`.
- Produces: situation plus optional context → Gemini guidance → cited reference cards → learner reply feedback.

- [x] Add failing component tests for submitting situation/context and opening response practice.
- [x] Run the targeted tests and confirm the existing mock-only flow fails them.
- [x] Map backend card/provenance fields into honest learner-facing views and wire the two POST requests.
- [x] Improve copy, hierarchy, progress cues, error recovery, and mobile layout.
- [x] Run frontend tests, type checking, and production build.

### Task 3: Implement honest pending contributions

**Files:**
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/api/routes.py`
- Create: `backend/app/services/contribution_service.py`
- Modify: `backend/tests/test_api.py`
- Modify: `frontend/src/components/ContributeModal.tsx`
- Modify: `frontend/src/services/api.ts`
- Create: `data/contributions.json`

**Interfaces:**
- Consumes: anonymized contribution form content.
- Produces: `POST /api/v1/contributions` returning an ID and `pending_review`; the queue remains server-side.

- [x] Add backend tests proving submission is pending, does not enter `/cards`, and rejects blank or oversized content.
- [x] Run the tests and confirm the route is absent.
- [x] Implement file-backed prototype storage with an atomic replace and no automatic approval.
- [x] Connect the modal, replace verification claims with pending-review copy, and display submission status.
- [x] Run backend and frontend tests.

### Task 4: Serve React and verify end to end

**Files:**
- Replace: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`
- Modify: `docker-compose.yml`
- Modify: `README.md`
- Modify: `docs/contextcue/implementation-verification.md`

**Interfaces:**
- Consumes: Docker Compose and the configured backend Gemini key.
- Produces: one browser origin on port 8501 with `/api` proxied to FastAPI.

- [x] Configure the production Vite build and Nginx proxy with SPA fallback and health endpoint.
- [x] Run backend tests, frontend tests, type checking, and frontend build.
- [x] Build and launch Compose; verify both health checks and exercise analyze/practice/contribute over HTTP.
- [x] Attempt browser inspection; no browser was connected, so visual review remains unverified.
- [x] Update documentation with actual verification evidence and remaining limits.
