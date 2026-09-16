# Architecture

## ContextCue V2: Phase A and B

```text
React Context Lab / Practice Studio
        │  X-Learner-ID + Idempotency-Key
        ▼
FastAPI /api/v2
        ├── SQLite application repositories
        └── contextcue_agent
              ├── controlled LangGraph
              ├── lexical + Gemini embedding retrieval
              ├── structured Gemini interpretation and critic
              ├── deterministic grounding and one repair boundary
              └── bounded role-play coach
                       │
                       ▼
              AsyncSqliteSaver checkpoints
```

The graph is a controlled state machine rather than an unrestricted tool-using agent. Runtime dependencies and credentials stay outside serializable graph state. User facts survive pause/resume and Context Switcher comparisons. Practice progress records observable criteria and exact response spans; it is not a cultural-intelligence score.

The deployable backend image imports `agent/contextcue_agent` as a package. API v1 stays mounted beside API v2 during migration. Docker uses Python 3.12 and `AsyncSqliteSaver`; the local Python 3.13 test fallback uses the synchronous saver because the available `aiosqlite` worker hangs in that interpreter environment.

Browser → Nginx/React → FastAPI → lexical retrieval of 12 JSON cards → Gemini structured generation when configured → validated response → React.

FastAPI routes live in `backend/app/api/routes.py`; request and response contracts live in `backend/app/schemas.py`. `ai_service.py` owns the small lexical ranker, prompt assembly, Gemini HTTP call, output validation, and explicit reference mode. `contribution_service.py` appends candidate cards to a file-backed `pending_review` queue. Contributions never enter retrieval automatically.

The React app in `frontend/src` owns the situation form, structured guidance, practice, saved cards, and contribution form. Vite proxies `/api` to FastAPI during local development. The production frontend container builds static assets and serves them through Nginx, which proxies `/api` to the backend container.

Settings: `AI_PROVIDER=auto|reference|gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CONTEXT_CARDS_PATH`, and `CONTRIBUTIONS_PATH`. `/api/v1/config` discloses only the active mode. Compose mounts the canonical cards read-only and `data/` for the contribution queue.

This architecture intentionally keeps one model call per analysis or practice request. LangChain or LangGraph would add useful machinery only when the product has multi-step tool use, durable workflows, or branching agent state.
