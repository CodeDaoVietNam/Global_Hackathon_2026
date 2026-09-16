import os
import sqlite3
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path

from fastapi import FastAPI
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.checkpoint.sqlite import SqliteSaver

from contextcue_agent.graph import build_context_graph
from contextcue_agent.gemini import GeminiEmbedder, GeminiStructuredModel
from contextcue_agent.retrieval import CardRepository, HybridRetriever

from app.api.routes import router
from app.api.routes_v2 import router as router_v2
from app.api.community import router as router_community
from app.api.reviewer import router as router_reviewer
from app.api.library import router as router_library
from app.database import Database


@dataclass
class V2Runtime:
    database: Database
    checkpointer: object
    graph: object
    asynchronous: bool
    model: object | None = None
    retriever: object | None = None

    async def invoke(self, value, config):
        if self.asynchronous:
            return await self.graph.ainvoke(value, config=config)
        return self.graph.invoke(value, config=config)

    async def delete_checkpoints(self, thread_id: str):
        if self.asynchronous:
            await self.checkpointer.adelete_thread(thread_id)
        else:
            self.checkpointer.delete_thread(thread_id)


@asynccontextmanager
async def lifespan(app: FastAPI):
    default_db = Path(__file__).resolve().parents[2] / "data/contextcue.db"
    db_path = Path(os.getenv("CONTEXTCUE_DB_PATH", str(default_db)))
    database = Database(db_path)
    database.setup()
    app.state.database = database
    default_cards = Path(__file__).resolve().parents[2] / "docs/contextcue/context-cards.synthetic.en.json"
    cards_path = Path(os.getenv("CONTEXT_CARDS_PATH", str(default_cards)))
    ai_mode = os.getenv("AI_PROVIDER", "auto").lower()
    use_gemini = bool(os.getenv("GEMINI_API_KEY")) and ai_mode != "reference"
    model = GeminiStructuredModel() if use_gemini else None
    embedder = GeminiEmbedder() if use_gemini else None
    from app.repositories.evidence import UnifiedEvidenceRepository
    evidence_repo = UnifiedEvidenceRepository(cards_path, database)
    retriever = HybridRetriever(evidence_repo, embedder)
    use_async = os.getenv("CONTEXTCUE_ASYNC_CHECKPOINTER", "false").lower() == "true"
    if use_async:
        async with AsyncSqliteSaver.from_conn_string(str(db_path)) as checkpointer:
            await checkpointer.setup()
            app.state.contextcue_v2 = V2Runtime(database, checkpointer, build_context_graph(retriever, checkpointer, model), True, model, retriever)
            yield
    else:
        connection = sqlite3.connect(db_path, check_same_thread=False)
        try:
            checkpointer = SqliteSaver(connection)
            checkpointer.setup()
            app.state.contextcue_v2 = V2Runtime(database, checkpointer, build_context_graph(retriever, checkpointer, model), False, model, retriever)
            yield
        finally:
            connection.close()


app = FastAPI(
    title="ContextCue",
    description="Context and response practice for international students in Singapore.",
    version="0.1.0",
    lifespan=lifespan,
)
app.include_router(router)
app.include_router(router_v2)
app.include_router(router_community)
app.include_router(router_reviewer)
app.include_router(router_library)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
