# ContextCue

ContextCue is an English-language intercultural learning companion for international students entering Singapore. V2 runs each real situation through a persisted Context Intelligence Graph, separates facts from missing context, grounds conditional perspectives in eligible evidence, and turns the result into a short practice loop.

The prototype combines four parts of the hackathon concept:

- a context-aware study companion as the main experience;
- candidate knowledge from local peer contributions, with human review before publication;
- humour and unfamiliar expressions as a scenario family;
- direct and indirect feedback as another scenario family.

## Run with Docker

```bash
cp .env.example .env
# Add GEMINI_API_KEY to .env for live AI guidance.
docker compose up --build
```

Open:

- App: http://localhost:8501
- API documentation: http://localhost:8000/docs
- Backend health: http://localhost:8000/health

## Run locally

Backend, in the repository root:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --env-file .env --host 127.0.0.1 --port 8000
```

Frontend, in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. Vite proxies `/api` to the local backend.

## AI modes

- `AI_PROVIDER=auto`: use Gemini when `GEMINI_API_KEY` exists; otherwise use reference mode.
- `AI_PROVIDER=reference`: retrieve related fictional cards and provide self-check criteria. It does not claim to interpret a person's intent.
- `AI_PROVIDER=gemini`: return structured, personalised English guidance and practice feedback. Provider errors stay visible instead of silently falling back to mock output.
- `GEMINI_MODEL`: defaults to `gemini-2.5-flash`.

## V2 user journey

1. Enter the exact words or behaviour from a recent situation and optional context.
2. LangGraph extracts facts, classifies the scenario, runs hybrid retrieval, and pauses instead of guessing when a blocking detail is missing.
3. Inspect the Context Map: known facts, missing context, conditional perspectives, assumption risks, response strategies, and evidence trail.
4. Use Context Switcher to compare a relationship or channel change while preserving original facts.
5. Edit a response strategy and practise for up to three learner turns.
6. Inspect feedback tied to exact response spans and visibly labelled simulation assumptions.
7. Save a verbatim reflection and inspect practice evidence plus a deterministic next recommendation in My Learning.
8. Submit local context as `pending_review`; it does not enter retrieval automatically.

## Context Intelligence architecture

- `agent/contextcue_agent/` owns typed state, retrieval, grounding, the LangGraph workflow, Gemini structured output, and bounded practice coaching.
- `backend/app/api/routes_v2.py` owns learner-scoped API contracts, idempotency, pause/resume, Context Switcher, practice, reflection, and learning endpoints.
- `backend/app/database.py` stores sessions, Context Maps, turns, reflections, and skill evidence in `data/contextcue.db`.
- Docker uses LangGraph `AsyncSqliteSaver`; local Python 3.13 can use the synchronous SQLite saver through `CONTEXTCUE_ASYNC_CHECKPOINTER=false`.
- API v1 remains available for compatibility.

## Data and responsible use

The canonical seed dataset is `docs/contextcue/context-cards.synthetic.en.json`. Its 12 cards are AI-authored, research-informed, and marked `synthetic_unreviewed`. They are prototype material rather than verified peer testimony or universal cultural rules. Source links support limited language or communication background; they do not prove an individual's intent.

In Gemini mode, situation, context, response text, selected cards, and source metadata are sent to Google's Gemini API. Do not enter names or identifying details. The browser stores only an anonymous learner ID and transient UI state. V2 learning records and LangGraph checkpoints use SQLite. Community submissions remain pending until Phase C governance is implemented.

## Verify

```bash
# Backend
python -m pytest -q backend/tests
python eval/evaluate.py

# Frontend
cd frontend
npm test
npm run lint
npm run build
```

Tests cover typed graph state, retrieval fusion, grounding, pause/resume checkpoints, ownership, idempotency, Context Switcher, three-turn enforcement, exact response evidence, reflection, learning recommendations, API v1 regressions, and the React learning flow. Authored evaluations are regression checks rather than a real student study or evidence of cultural accuracy.

## API

- `GET /api/v1/config`: active AI mode without exposing credentials.
- `GET /api/v1/cards`: synthetic card library and source register.
- `POST /api/v1/analyze`: `{"situation":"My classmate said bojio after lunch.","context":"We only met this week."}`
- `POST /api/v1/practice`: `{"situation":"My classmate said bojio after lunch.","context":"We only met this week.","card_id":"sg-humour-01","response":"Would you like to join next time?"}`
- `POST /api/v1/contributions`: queues a candidate context card with `pending_review` status.

V2:

- `POST /api/v2/threads` and `GET/DELETE /api/v2/threads/{thread_id}`
- `POST /api/v2/threads/{thread_id}/analyze` and `/analyze/stream`
- `POST /api/v2/threads/{thread_id}/context` to resume a paused graph
- `POST /api/v2/threads/{thread_id}/switch-context`
- `GET /api/v2/threads/{thread_id}/context-map`
- `POST/GET /api/v2/threads/{thread_id}/practice...`
- `POST /api/v2/threads/{thread_id}/practice/{practice_id}/reflection`
- `GET /api/v2/learning/{learner_id}` and learner-owned session deletion
- `POST /api/v2/threads/{thread_id}/context/evidence-only`: resume analysis relying purely on retrieved evidence

Phase C Community & Moderation:
- `POST /api/v2/community/contributions`: anonymous local cue submission with deterministic privacy scanning
- `GET /api/v2/community/candidates`: public candidate cards and readiness status
- `POST /api/v2/community/candidates/{candidate_id}/perspectives`: add alternative perspectives
- `POST /api/v2/reviewer/login` & `POST /api/v2/reviewer/logout`: secure reviewer session with HttpOnly cookie
- `GET /api/v2/reviewer/queue` & `POST /api/v2/reviewer/candidates/{candidate_id}/decisions`: version-controlled moderation decisions (HTTP 409 on conflict)

Phase D Experience Shell & Library:
- `GET /api/v2/library/cards`: faceted scenario discovery library (Teamwork, Humour, Feedback, Campus Life)
- Routes: `/` (Landing), `/explore` (Library), `/context-lab` (Lab & Switcher), `/practice` (Studio), `/learning` (My Learning), `/community` (Contributions), `/review` (Moderator Workspace)

## Demo path

1. **Explore Library**: Navigate to `/explore` to browse research-backed synthetic seeds and community-reviewed cards with faceted filters.
2. **Analyze Situation**: In `/context-lab`, enter: `Someone replied “bojio” when they saw our lunch photo.` Add: `We only met this week, and I am unsure whether they were joking.`
3. **Context Switcher**: Change the relationship from classmate to project teammate to observe how expectations and risk guidance change.
4. **Practice Studio**: Practise replying in `/practice`, observing simulated partner replies and simulation assumptions.
5. **Reflect**: Store a verbatim reflection, then inspect demonstrated criteria in `/learning`.
6. **Community Knowledge**: Go to `/community` to submit a cue. Notice the deterministic privacy scanner blocking any emails or phone numbers.
7. **Moderation Workspace**: Log into `/review` with the reviewer token to inspect candidate readiness ($\ge 2$ contributors) and publish verified cards to trusted retrieval.

## Validation still needed

- Continue expanding verified Singapore campus reviewer pool across autonomous universities (NUS, NTU, SMU, S科大).
- Test the journey with international students from varied linguistic and cultural backgrounds.
- Record misunderstanding reduction, response confidence, and whether users choose clarification over assumptions.
- Expand retrieval vector indexing as community card volume scales.
