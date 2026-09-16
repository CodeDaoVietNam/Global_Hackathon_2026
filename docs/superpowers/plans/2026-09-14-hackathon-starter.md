# Hackathon Starter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-service Docker Compose starter with a tested FastAPI analysis endpoint, Streamlit demo UI, deterministic AI fallback, evaluation script, and team documentation.

**Architecture:** Streamlit sends a validated JSON request to FastAPI. FastAPI delegates to a provider interface whose default implementation is deterministic and credential-free, then returns a stable Pydantic response.

**Tech Stack:** Python 3.12, FastAPI, Pydantic, Streamlit, httpx, pytest, Docker Compose

**Spec:** `docs/superpowers/specs/2026-09-14-hackathon-starter-design.md`

## Global Constraints

- Run exactly two services initially: `frontend` and `backend`.
- Compose lives at repository root.
- Default execution requires no external API key.
- Frontend calls `http://backend:8000` inside Compose.
- Do not add a database, vector store, worker, or authentication.

---

### Task 1: Backend contract and deterministic service

**Files:**
- Create: `backend/app/schemas.py`
- Create: `backend/app/services/ai_service.py`
- Test: `backend/tests/test_ai_service.py`

**Interfaces:**
- Consumes: `AnalyzeRequest(question: str, student_answer: str)`
- Produces: `analyze(request: AnalyzeRequest) -> AnalyzeResult`

- [ ] Write tests for known and unknown misconceptions.
- [ ] Run `pytest backend/tests/test_ai_service.py -q` and confirm import failure.
- [ ] Implement the Pydantic contracts and deterministic service.
- [ ] Re-run the test and confirm it passes.

### Task 2: FastAPI endpoint

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/api/routes.py`
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: `analyze(request)` from Task 1.
- Produces: `GET /health` and `POST /api/v1/analyze`.

- [ ] Write API tests for health, success, and invalid input.
- [ ] Run `pytest backend/tests/test_api.py -q` and confirm import failure.
- [ ] Implement routes and application wiring.
- [ ] Re-run all backend tests and confirm they pass.

### Task 3: Frontend and evaluation

**Files:**
- Create: `frontend/app.py`
- Create: `eval/evaluate.py`
- Create: `data/eval/test_cases.json`
- Create: `data/demo/case_01.json`
- Create: `data/demo/case_02.json`
- Create: `data/demo/case_03.json`

**Interfaces:**
- Consumes: `POST /api/v1/analyze`.
- Produces: interactive demo and repeatable evaluation output.

- [ ] Implement the Streamlit form with sample loading and safe request errors.
- [ ] Add labeled evaluation cases and deterministic scoring.
- [ ] Run the evaluation and require at least 80% label accuracy.

### Task 4: Containers and handoff documentation

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `README.md`
- Create: `docs/problem.md`
- Create: `docs/ai-logic-flow.md`
- Create: `docs/architecture.md`
- Create: `docs/pitch-notes.md`

**Interfaces:**
- Consumes: backend and frontend entry points.
- Produces: one-command local launch and team handoff.

- [ ] Add reproducible images, health checks, and service dependency configuration.
- [ ] Document native and Compose workflows, customization points, demo fallback, and team ownership.
- [ ] Validate with `docker compose config`.
- [ ] Build and smoke-test containers when Docker is available.
- [ ] Run the complete automated test and evaluation suite.
