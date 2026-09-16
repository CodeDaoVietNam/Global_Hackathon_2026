# Hackathon Starter Design

## Goal

Provide a small, reusable EdTech AI hackathon starter that a mixed team can run with one command and adapt after the challenge track is announced.

## Scope

- Two runtime services only: Streamlit frontend and FastAPI backend.
- One primary API flow: `POST /api/v1/analyze`.
- Stable Pydantic request and response contracts.
- A deterministic mock AI provider so the demo works without an API key.
- A provider boundary where a real Gemini/OpenAI implementation can be added later.
- Local evaluation data, automated tests, demo cases, health checks, and concise team documentation.
- Docker Compose at the repository root.

Database, authentication, RAG, vector search, workers, and multi-agent behavior are excluded until a chosen challenge requires them.

## Architecture

The browser talks to Streamlit on port 8501. Streamlit calls FastAPI through `BACKEND_URL`; in Compose this is `http://backend:8000`. FastAPI validates the request, delegates to the configured AI provider, validates the structured result, and returns JSON.

The default `mock` provider recognizes a small set of learning misconceptions using deterministic rules. It exists for development, rehearsals, offline fallback, and evaluation; the UI explicitly labels it as demo mode.

## API Contract

Request fields:

- `question`: non-empty string, maximum 2,000 characters.
- `student_answer`: non-empty string, maximum 4,000 characters.

Response fields:

- `misconception`: nullable machine-readable label.
- `confidence`: float from 0 to 1.
- `explanation`: concise learner-facing explanation.
- `next_action`: one concrete retry action.
- `provider`: provider identifier.
- `request_id`: trace identifier.

## Error Handling

- Invalid input returns HTTP 422 through FastAPI validation.
- Provider failures return HTTP 503 with a safe message and request ID.
- Frontend connection errors show an actionable message without exposing secrets.
- Both services have health checks.

## Testing

- Service tests verify deterministic labels, confidence range, and fallback behavior.
- API tests verify health, successful analysis, and invalid input.
- Evaluation script scores the mock provider against JSON cases and exits non-zero below the configured threshold.
- Compose configuration is validated before delivery; if Docker is available, both containers are built and smoke-tested.

## Success Criteria

1. `docker compose up --build` launches both services.
2. `http://localhost:8501` can submit a sample and display structured output.
3. `http://localhost:8000/docs` exposes the API contract.
4. Tests pass without external credentials.
5. A teammate can swap the AI implementation without changing frontend fields.
