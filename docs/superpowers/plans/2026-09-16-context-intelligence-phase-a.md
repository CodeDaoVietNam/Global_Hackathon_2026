# Context Intelligence Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persisted, typed LangGraph workflow that turns a learner-owned situation into a grounded Context Map, can pause for missing context, and can compare a hypothetical context change.

**Architecture:** `agent/contextcue_agent` owns model-independent schemas, graph nodes, retrieval, grounding, and the runner. FastAPI owns SQLite application records and `/api/v2` HTTP contracts while API v1 remains available. Reference mode is deterministic and fully testable; Gemini is an adapter behind the same structured-model protocol.

**Tech Stack:** Python 3.12+, FastAPI, Pydantic 2, LangGraph, LangChain Google GenAI, SQLite, aiosqlite, pytest.

**Spec:** `docs/superpowers/specs/2026-09-16-context-intelligence-agent-design.md`

## Global Constraints

- Default output language is English and the initial evidence scope is Singapore campus environments.
- Preserve user facts and quoted wording; unknown relationship, tone, deadline, and intent stay unknown.
- Retrieve at most three eligible cards and retain synthetic provenance labels.
- Pending, rejected, archived, and superseded community records are never eligible for trusted retrieval.
- Grounding permits one repair; another failure returns an evidence-only safe artifact.
- Business events may expose status and counts, never prompts or hidden model reasoning.
- API v1 remains operational.
- This workspace has no valid Git repository, so commit steps are recorded as unavailable rather than simulated.

---

### Task 1: Package contracts and deterministic retrieval

**Files:**
- Create: `agent/contextcue_agent/__init__.py`
- Create: `agent/contextcue_agent/schemas.py`
- Create: `agent/contextcue_agent/state.py`
- Create: `agent/contextcue_agent/context.py`
- Create: `agent/contextcue_agent/retrieval.py`
- Test: `agent/tests/test_retrieval.py`

**Interfaces:**
- Produces: `ContextProfile`, `EvidenceItem`, `Interpretation`, `GroundingReport`, `ContextMap`, `RuntimeContext`, `HybridRetriever.search(query, profile, limit=3)`.
- Consumes: canonical JSON cards at `CONTEXT_CARDS_PATH`.

- [x] **Step 1: Write failing retrieval and schema tests**

```python
def test_retrieval_fuses_rankings_and_keeps_provenance(card_repository):
    result = HybridRetriever(card_repository).search("Someone wrote bojio after lunch", ContextProfile())
    assert result.items[0].card_id == "sg-humour-01"
    assert result.mode in {"lexical", "hybrid"}
    assert result.items[0].evidence_status == "synthetic_unreviewed"

def test_ineligible_approved_version_never_enters_results(repository_with_pending):
    assert "pending-1" not in {item.card_id for item in HybridRetriever(repository_with_pending).search("group work", ContextProfile()).items}
```

- [x] **Step 2: Run `PYTHONPATH=agent pytest -q agent/tests/test_retrieval.py` and confirm imports fail because the package does not exist**
- [x] **Step 3: Implement typed schemas, card repository, lexical ranking, optional semantic ranking protocol, reciprocal-rank fusion, metadata tie-breaking, and the three-card cap**
- [x] **Step 4: Re-run the focused tests and confirm they pass**
- [x] **Step 5: Record that a Git commit is unavailable because this workspace has no valid `.git` metadata**

### Task 2: Context extraction, classification, gaps, and grounding

**Files:**
- Create: `agent/contextcue_agent/model.py`
- Create: `agent/contextcue_agent/nodes.py`
- Test: `agent/tests/test_nodes.py`

**Interfaces:**
- Consumes: `RuntimeContext`, `ContextCueState`, retrieval results, `StructuredModel.invoke(schema, task, payload)`.
- Produces: `normalize_input`, `extract_context`, `classify_scenario`, `find_context_gaps`, `build_interpretations`, `validate_grounding`, `build_artifact`.

- [x] **Step 1: Write failing tests proving quoted facts survive extraction, relevant missing context becomes a question, unsupported evidence IDs fail validation, and a fictional card deadline is detected**
- [x] **Step 2: Run the focused tests and confirm missing node imports are the expected failure**
- [x] **Step 3: Implement deterministic reference behavior plus a scripted structured-model boundary; ensure every fact carries a source span and every perspective has a support status**
- [x] **Step 4: Implement grounding checks for unknown evidence IDs, contradicted facts, fictional detail leakage, duplicate perspectives, and stereotypes**
- [x] **Step 5: Re-run focused tests and the retrieval suite**

### Task 3: LangGraph workflow, pause/resume, repair, and switcher

**Files:**
- Create: `agent/contextcue_agent/graph.py`
- Create: `agent/contextcue_agent/runner.py`
- Test: `agent/tests/test_graph.py`

**Interfaces:**
- Produces: `build_context_graph(checkpointer)`, `ContextCueRunner.analyze`, `ContextCueRunner.resume`, `ContextCueRunner.switch_context`, and public `GraphEvent` values.
- Consumes: the Task 2 nodes and LangGraph `Command(resume=...)`.

- [x] **Step 1: Write failing graph tests for complete, interrupt/resume, lexical fallback, one-repair, safe-result, and context-switch paths**
- [x] **Step 2: Run the focused tests and confirm graph construction is missing**
- [x] **Step 3: Build a controlled `StateGraph` with explicit conditional edges; call `interrupt()` only in the context-gap node and compile with an injected checkpointer**
- [x] **Step 4: Implement runner event mapping and make switch-context copy the completed state while preserving original facts**
- [x] **Step 5: Run all agent tests and verify graph checkpoints resume under the same `thread_id`**

### Task 4: SQLite repositories and API v2

**Files:**
- Create: `backend/app/database.py`
- Create: `backend/app/repositories/learning.py`
- Create: `backend/app/api/routes_v2.py`
- Modify: `backend/app/main.py`
- Modify: `backend/requirements.txt`
- Modify: `backend/Dockerfile`
- Modify: `docker-compose.yml`
- Test: `backend/tests/test_api_v2_context.py`

**Interfaces:**
- Produces: thread CRUD, analysis/resume/switch endpoints, Context Map lookup, and SSE graph events.
- Consumes: `ContextCueRunner`; learner ownership from `X-Learner-ID`; idempotency from `Idempotency-Key`.

- [x] **Step 1: Write failing API tests for ownership, create/analyze/get, missing-context resume, idempotency, switch-context, SSE event names, and deletion**
- [x] **Step 2: Run the focused tests and confirm `/api/v2` returns 404**
- [x] **Step 3: Create SQLite tables `learning_sessions` and `context_maps`, initialize the LangGraph SQLite checkpointer at FastAPI lifespan startup, and close both resources at shutdown**
- [x] **Step 4: Implement typed v2 request/response models and routes; owner mismatch returns 404 and invalid transitions return 409**
- [x] **Step 5: Re-run API v2 tests and existing API v1 tests**

### Task 5: Gemini adapter, configuration, docs, and Phase A verification

**Files:**
- Create: `agent/contextcue_agent/gemini.py`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `eval/evaluate.py`
- Test: `agent/tests/test_gemini_adapter.py`

**Interfaces:**
- Produces: `GeminiStructuredModel` using native structured output and `GeminiEmbedder` with lexical fallback.

- [x] **Step 1: Write failing adapter tests for schema selection, one malformed-output retry, timeout mapping, and credential redaction**
- [x] **Step 2: Implement `ChatGoogleGenerativeAI.with_structured_output(..., method="json_schema")` behind `StructuredModel`; never pass credentials into graph state**
- [x] **Step 3: Add authored evaluation fixtures for paraphrase, stereotype trap, unsupported detail, boundary, and context switch**
- [x] **Step 4: Run full agent/backend tests, retrieval evaluations, Docker build, and an optional credentialed smoke test without printing secrets**
- [x] **Step 5: Re-read the Phase A definition of done and document any environment-only limitation**

