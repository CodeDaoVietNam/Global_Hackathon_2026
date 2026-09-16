# Context Intelligence Agent Design

**Parent:** [ContextCue V2 Master Design](2026-09-16-contextcue-v2-master-design.md)  
**Delivery phase:** A  

## 1. Goal

Build a typed LangGraph workflow that turns a learner's situation into a grounded Context Map, supports missing-context pause/resume, compares a hypothetical context change, and exposes real workflow progress to the React client.

## 2. Package boundary

```text
agent/
  contextcue_agent/
    graph.py
    state.py
    context.py
    schemas.py
    runner.py
    model/gemini.py
    nodes/
      normalize.py
      extract.py
      classify.py
      retrieve.py
      gaps.py
      interpret.py
      validate.py
      artifact.py
    retrieval/
      lexical.py
      embeddings.py
      fusion.py
      repository.py
  tests/
```

`agent/` is importable by FastAPI. It has no knowledge of HTTP, cookies, React, or reviewer authentication. Backend adapters supply repositories, model, clock, and request ID through runtime context.

## 3. State

`ContextCueState` is a serializable `TypedDict`. It contains situation input, typed context profile, scenario family, gaps, retrieved evidence, interpretations, validation report, final artifact, status, and recoverable error. It never contains API keys, HTTP clients, database connections, or raw exception objects.

State status values:

```text
received
extracting
retrieving
awaiting_context
interpreting
validating
complete
safe_result
failed
```

## 4. Core schemas

### Context profile

- relationship
- setting
- channel
- formality
- user goal
- explicit facts
- quoted language
- boundary signals
- unresolved questions

Every extracted fact includes a short source span from user input. Source spans are evidence pointers, not hidden reasoning.

### Retrieved evidence

- card ID and immutable version
- title and scenario family
- matched fields
- evidence status
- lexical rank
- semantic rank when available
- fusion rank
- source records and evidence limits

### Interpretation

- statement
- plausibility conditions
- supporting signals
- contradicting signals
- evidence IDs
- support status

### Grounding report

- valid evidence IDs
- unsupported claims
- copied fictional details
- stereotype risks
- repair required
- repair count

### Context Map artifact

- known facts
- missing context
- perspectives
- assumption risks
- safest next action
- response strategies
- evidence trail
- grounding summary
- retrieval mode

## 5. Graph behavior

### Normalization

Reject blank or oversized input through API validation. Normalize whitespace and produce a stable input hash for retries.

### Extraction and classification

One structured Gemini call returns `ContextProfile` and scenario candidates. Deterministic rules preserve all quoted wording and explicit facts. A model may leave fields unknown; it may not fill missing relationship or tone as fact.

### Retrieval

The retriever searches synthetic seeds and eligible approved card versions. Pending, rejected, archived, and superseded versions are ineligible. Lexical retrieval always runs. Semantic retrieval runs when embeddings are configured and falls back without failing the graph.

Reciprocal Rank Fusion combines result ranks. Metadata affects only already relevant candidates. The result contains at most three cards.

### Missing-context interrupt

The graph interrupts only when a missing fact blocks a safe interpretation or the user explicitly asks for a decision that depends on it. The interrupt payload contains up to three answerable questions and the current known facts. A resume payload adds context without overwriting original input.

### Interpretation

The model receives actual user facts, eligible evidence, evidence limits, and strict structured schemas. Fictional card scenarios, example replies, and learning answers are excluded from generation context unless specifically displayed as labelled reference material.

### Validation and repair

Deterministic validation runs first:

- all evidence IDs exist and were retrieved;
- explicit facts are preserved;
- no excluded card fields reappear;
- no duplicate perspectives;
- required uncertainty labels exist.

A structured critic then reports unsupported facts, cultural generalizations, and conflicts with user input. One repair call is allowed. A second failure returns a safe artifact containing known facts, missing context, evidence limitations, and clarification actions.

### Context Switcher

The caller submits an explicit override for relationship, channel, formality, deadline status, tone status, or prior-agreement status. The graph forks from the completed context checkpoint, applies the override as a hypothetical value, and re-runs only affected nodes. The comparison artifact lists changed and unchanged fields. Original session facts remain immutable.

## 6. Model adapter

The `StructuredModel` protocol exposes asynchronous structured invocation with schema, system instruction, input payload, timeout, and request ID. The Gemini implementation uses `ChatGoogleGenerativeAI.with_structured_output(..., method="json_schema")`.

Tests use a scripted fake model. Reference mode produces retrieval and clarification artifacts without claiming personalised interpretation.

## 7. Streaming progress

The runner emits these business events:

- `context_extracted`
- `scenario_classified`
- `retrieval_completed`
- `context_gap_found`
- `interpretations_created`
- `grounding_checked`
- `context_map_ready`
- `safe_result_ready`
- `error`

Events include public metadata such as category, card count, retrieval mode, and validation status. They never include prompts, hidden model thoughts, API keys, or reviewer-only data.

## 8. Backend API

```text
POST   /api/v2/threads
GET    /api/v2/threads/{thread_id}
DELETE /api/v2/threads/{thread_id}
POST   /api/v2/threads/{thread_id}/analyze
POST   /api/v2/threads/{thread_id}/analyze/stream
POST   /api/v2/threads/{thread_id}/context
POST   /api/v2/threads/{thread_id}/switch-context
GET    /api/v2/threads/{thread_id}/context-map
```

All thread endpoints require the anonymous learner ID that owns the thread. A different learner ID receives 404 to avoid confirming another thread exists.

## 9. Persistence

- `learning_sessions` stores owner ID, original input, status, timestamps, and deletion state.
- `context_maps` stores versioned artifact JSON and input hash.
- LangGraph uses `AsyncSqliteSaver` with `thread_id`; setup and lifecycle belong to FastAPI startup/shutdown rather than individual requests.
- Analysis retries with the same idempotency key return the existing completed artifact or resume the existing failed run.
- Delete removes application session records and associated checkpoints.

## 10. Error behavior

- Model timeout: checkpoint state remains retryable.
- Embedding failure: lexical fallback and trace metadata.
- No eligible evidence: clarification or evidence-only output.
- Invalid structured output: one model retry at adapter level.
- Unsupported result after repair: safe artifact.
- Storage failure: explicit recoverable API error; no substitute output.

## 11. Tests

### Unit

- extraction preserves explicit facts;
- classification permits multiple candidates but selects one primary family;
- lexical and embedding rankings fuse deterministically;
- pending content is ineligible;
- missing context produces interrupt payload;
- invalid IDs fail grounding;
- fictional details trigger repair;
- second grounding failure returns safe result;
- context switch preserves original facts.

### Graph paths

- complete input reaches Context Map;
- missing context interrupts and resumes;
- embeddings fail and lexical path succeeds;
- one repair succeeds;
- two validation failures produce safe result;
- switch-context returns changed/unchanged comparison.

### Evaluation

- existing 15 retrieval cases continue passing;
- add paraphrase, stereotype trap, unsupported detail, boundary, and context-switch fixtures;
- hard safety invariants must pass every authored case.

## 12. Definition of done

- `agent/` exists as an isolated, tested Python package.
- LangGraph executes the workflow and persists checkpoints.
- Context Map is produced from typed state.
- Pause/resume works with the same thread.
- Hybrid retrieval and lexical fallback are observable.
- Context Switcher produces a grounded comparison.
- One-repair limit and safe-result path are tested.
- API v1 remains operational.
- Live Gemini smoke test succeeds without exposing credentials.

## 13. Non-goals

- role-play and learning profile;
- contribution review interface;
- production authentication;
- separate agent container;
- vector database;
- A2A, MCP, or multiple autonomous agents.
