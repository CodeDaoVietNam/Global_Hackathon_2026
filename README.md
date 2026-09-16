# ContextCue

ContextCue is an English-language intercultural learning companion for international students entering Singapore. A student describes a situation they just encountered, explores several plausible meanings, sees what they should not assume, and practises a respectful next response.

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

## User journey

1. Enter the exact words or behaviour from a recent situation and optional context.
2. Review possible meanings, missing context, and a clear “what not to assume” warning.
3. Take a low-risk next action or ask a clarifying question.
4. Write a response and receive formative practice feedback.
5. Save useful cards and practice progress in the current browser.
6. Submit local context as `pending_review`; it does not enter the learning library automatically.

## Data and responsible use

The canonical seed dataset is `docs/contextcue/context-cards.synthetic.en.json`. Its 12 cards are AI-authored, research-informed, and marked `synthetic_unreviewed`. They are prototype material rather than verified peer testimony or universal cultural rules. Source links support limited language or communication background; they do not prove an individual's intent.

In Gemini mode, situation, context, response text, selected cards, and source metadata are sent to Google's Gemini API. Do not enter names or identifying details. Browser saves use local storage. Community submissions are stored in `data/contributions.json` and remain pending until a human review process is added.

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

Tests cover validation, retrieval, provenance, unsupported model references, the contribution queue, the React analysis flow, and practice feedback. Authored evaluations are regression checks rather than a real student study or evidence of cultural accuracy.

## API

- `GET /api/v1/config`: active AI mode without exposing credentials.
- `GET /api/v1/cards`: synthetic card library and source register.
- `POST /api/v1/analyze`: `{"situation":"My classmate said bojio after lunch.","context":"We only met this week."}`
- `POST /api/v1/practice`: `{"situation":"My classmate said bojio after lunch.","context":"We only met this week.","card_id":"sg-humour-01","response":"Would you like to join next time?"}`
- `POST /api/v1/contributions`: queues a candidate context card with `pending_review` status.

## Demo path

Use: `Someone replied “bojio” when they saw our lunch photo.` Add: `We only met this week, and I am unsure whether they were joking.` Review the alternative meanings, practise a response, and inspect the evidence limits. Then contribute a new phrase and show that it is queued rather than presented as verified content.

## Validation still needed

- Recruit Singapore campus reviewers before promoting any card to a verified collection.
- Test the journey with international students from different language backgrounds.
- Record misunderstanding reduction, response confidence, and whether users choose clarification over assumptions.
- Expand retrieval only after real paraphrase misses are observed.
