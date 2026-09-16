# ContextCue Integration Implementation Plan

> Execute inline using Superpowers executing-plans and test-driven-development. The user approved end-to-end integration of the agreed ContextCue journey.

**Goal:** International students in Singapore enter a real situation, inspect sourced synthetic context, clarify uncertainty, and practise a respectful English response.

**Architecture:** Keep FastAPI and Streamlit. Load the existing JSON once per process. Rank at most three cards using lexical evidence; no match asks for context. Gemini REST structured output adapts selected evidence to the user, with validated card IDs. Without a key, explicitly show reference-card mode and self-reflection rather than claiming generated interpretation or graded learning.

**Spec:** Agreed conversation requirements plus `docs/contextcue/context-cards.research-and-review.en.md`. This supersedes the physics-specific portions of the starter spec.

## Global constraints

- English default; Singapore setting; all international students.
- Preserve synthetic_unreviewed provenance and source scope; never invent peer reviews.
- User context overrides fictional card details. No numerical confidence or mind-reading.
- No database or stored conversations. Gemini disclosure before submission.
- Errors are explicit; no silent fallback masquerading as live AI.
- Existing .git is not recognised as a repository in this environment; work in place without git mutations.

## Tasks

- [x] 1. Replace physics API tests with situation validation, card retrieval, no-match, practice, evidence integrity and provider-failure tests. Run pytest to see missing-contract failures.
- [x] 2. Replace schemas/service/routes: `GET /cards`, `GET /config`, `POST /analyze` (situation, context), `POST /practice` (situation, context, card_id, response). Validate bounded strings; retain /health. Use existing httpx for Gemini; validate outputs and source IDs server-side.
- [x] 3. Replace Streamlit UI: examples, situation/context form, result persistence, sources and synthetic labels, clarification resubmission, practice with feedback or explicit self-check. Reset stale results when selecting another example or submitting another situation.
- [x] 4. Update Compose mounts/env, demo/eval cases, README/problem/architecture/pitch documentation. Add independent paraphrase and irrelevant-query retrieval checks; do not claim a learning study.
- [ ] 5. Run API/provider tests, evaluation and Streamlit AppTest flow. Launch both services and verify HTTP health and live backend flow. Test real Gemini only with a configured key; report missing credentials accurately.

## Verification progress

- 16 automated API/provider/UI tests passed; provider calls are simulated in tests.
- 15/15 authored retrieval checks passed.
- Docker build succeeded; both containers healthy; container Streamlit AppTest exercised real HTTP backend analysis, practice and context resubmission.
- Local API and frontend health checks passed on ports 8000/8501.
- Live Gemini and visual browser review remain unverified: credentials are missing and browser discovery returned no connected browsers.
