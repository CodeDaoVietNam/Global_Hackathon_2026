from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


class Database:
    def __init__(self, path: str | Path):
        self.path = str(path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def connection(self):
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def setup(self) -> None:
        from app.db_schema.community import COMMUNITY_SCHEMA_DDL
        with self.connection() as db:
            db.executescript(COMMUNITY_SCHEMA_DDL)
            db.executescript("""
                CREATE TABLE IF NOT EXISTS learning_sessions (
                    thread_id TEXT PRIMARY KEY,
                    learner_id TEXT NOT NULL,
                    situation TEXT NOT NULL DEFAULT '',
                    additional_context TEXT NOT NULL DEFAULT '',
                    status TEXT NOT NULL DEFAULT 'received',
                    analysis_idempotency_key TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_sessions_owner ON learning_sessions(learner_id, updated_at);
                CREATE TABLE IF NOT EXISTS context_maps (
                    thread_id TEXT PRIMARY KEY REFERENCES learning_sessions(thread_id) ON DELETE CASCADE,
                    version TEXT NOT NULL,
                    input_hash TEXT NOT NULL,
                    artifact_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS practice_runs (
                    practice_id TEXT PRIMARY KEY,
                    thread_id TEXT NOT NULL REFERENCES learning_sessions(thread_id) ON DELETE CASCADE,
                    learner_id TEXT NOT NULL,
                    goal TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'active',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_practice_owner ON practice_runs(learner_id, updated_at);
                CREATE TABLE IF NOT EXISTS practice_turns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    practice_id TEXT NOT NULL REFERENCES practice_runs(practice_id) ON DELETE CASCADE,
                    turn_number INTEGER NOT NULL,
                    retry_of_turn INTEGER,
                    idempotency_key TEXT NOT NULL,
                    turn_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    UNIQUE(practice_id, idempotency_key)
                );
                CREATE TABLE IF NOT EXISTS reflections (
                    practice_id TEXT PRIMARY KEY REFERENCES practice_runs(practice_id) ON DELETE CASCADE,
                    initial_assumption TEXT NOT NULL,
                    next_clarification TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS skill_evidence (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    learner_id TEXT NOT NULL,
                    thread_id TEXT NOT NULL REFERENCES learning_sessions(thread_id) ON DELETE CASCADE,
                    practice_id TEXT NOT NULL REFERENCES practice_runs(practice_id) ON DELETE CASCADE,
                    criterion_id TEXT NOT NULL,
                    response_span TEXT NOT NULL,
                    model_result TEXT NOT NULL,
                    learner_confirmed INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
            """)

    def create_thread(self, learner_id: str) -> dict:
        thread_id = str(uuid4())
        timestamp = now_iso()
        with self.connection() as db:
            db.execute(
                "INSERT INTO learning_sessions(thread_id, learner_id, created_at, updated_at) VALUES(?,?,?,?)",
                (thread_id, learner_id, timestamp, timestamp),
            )
        return self.get_thread(thread_id, learner_id)

    def get_thread(self, thread_id: str, learner_id: str) -> dict | None:
        with self.connection() as db:
            row = db.execute(
                "SELECT * FROM learning_sessions WHERE thread_id=? AND learner_id=?", (thread_id, learner_id)
            ).fetchone()
        return dict(row) if row else None

    def update_analysis(self, thread_id: str, learner_id: str, situation: str, context: str, status: str, idempotency_key: str | None) -> None:
        with self.connection() as db:
            db.execute(
                "UPDATE learning_sessions SET situation=?, additional_context=?, status=?, analysis_idempotency_key=?, updated_at=? WHERE thread_id=? AND learner_id=?",
                (situation, context, status, idempotency_key, now_iso(), thread_id, learner_id),
            )

    def update_status(self, thread_id: str, learner_id: str, status: str, context: str | None = None) -> None:
        with self.connection() as db:
            if context is None:
                db.execute("UPDATE learning_sessions SET status=?, updated_at=? WHERE thread_id=? AND learner_id=?", (status, now_iso(), thread_id, learner_id))
            else:
                db.execute("UPDATE learning_sessions SET status=?, additional_context=?, updated_at=? WHERE thread_id=? AND learner_id=?", (status, context, now_iso(), thread_id, learner_id))

    def save_context_map(self, thread_id: str, input_hash: str, artifact: dict) -> None:
        with self.connection() as db:
            db.execute(
                "INSERT OR REPLACE INTO context_maps(thread_id, version, input_hash, artifact_json, created_at) VALUES(?,?,?,?,?)",
                (thread_id, artifact.get("version", "2.0"), input_hash, json.dumps(artifact, ensure_ascii=False), now_iso()),
            )

    def get_context_map(self, thread_id: str, learner_id: str) -> dict | None:
        with self.connection() as db:
            row = db.execute(
                "SELECT cm.artifact_json FROM context_maps cm JOIN learning_sessions ls ON ls.thread_id=cm.thread_id WHERE cm.thread_id=? AND ls.learner_id=?",
                (thread_id, learner_id),
            ).fetchone()
        return json.loads(row["artifact_json"]) if row else None

    def delete_thread(self, thread_id: str, learner_id: str) -> bool:
        with self.connection() as db:
            cursor = db.execute("DELETE FROM learning_sessions WHERE thread_id=? AND learner_id=?", (thread_id, learner_id))
        return cursor.rowcount > 0

    def create_practice(self, thread_id: str, learner_id: str, goal: str) -> dict:
        practice_id = str(uuid4())
        timestamp = now_iso()
        with self.connection() as db:
            db.execute(
                "INSERT INTO practice_runs(practice_id, thread_id, learner_id, goal, created_at, updated_at) VALUES(?,?,?,?,?,?)",
                (practice_id, thread_id, learner_id, goal, timestamp, timestamp),
            )
        return self.get_practice(practice_id, thread_id, learner_id)

    def get_practice(self, practice_id: str, thread_id: str, learner_id: str) -> dict | None:
        with self.connection() as db:
            row = db.execute(
                "SELECT * FROM practice_runs WHERE practice_id=? AND thread_id=? AND learner_id=?",
                (practice_id, thread_id, learner_id),
            ).fetchone()
        return dict(row) if row else None

    def list_turns(self, practice_id: str) -> list[dict]:
        with self.connection() as db:
            rows = db.execute("SELECT turn_json FROM practice_turns WHERE practice_id=? ORDER BY id", (practice_id,)).fetchall()
        return [json.loads(row["turn_json"]) for row in rows]

    def get_turn_by_key(self, practice_id: str, key: str) -> dict | None:
        with self.connection() as db:
            row = db.execute("SELECT turn_json FROM practice_turns WHERE practice_id=? AND idempotency_key=?", (practice_id, key)).fetchone()
        return json.loads(row["turn_json"]) if row else None

    def save_turn(self, practice_id: str, key: str, turn: dict) -> None:
        with self.connection() as db:
            db.execute(
                "INSERT INTO practice_turns(practice_id, turn_number, retry_of_turn, idempotency_key, turn_json, created_at) VALUES(?,?,?,?,?,?)",
                (practice_id, turn["turn_number"], turn.get("retry_of_turn"), key, json.dumps(turn, ensure_ascii=False), now_iso()),
            )
            db.execute("UPDATE practice_runs SET updated_at=? WHERE practice_id=?", (now_iso(), practice_id))

    def save_reflection(self, practice: dict, initial: str, next_clarification: str) -> dict:
        timestamp = now_iso()
        with self.connection() as db:
            db.execute(
                "INSERT OR REPLACE INTO reflections(practice_id, initial_assumption, next_clarification, created_at) VALUES(?,?,?,?)",
                (practice["practice_id"], initial, next_clarification, timestamp),
            )
            turns = db.execute("SELECT turn_json FROM practice_turns WHERE practice_id=? ORDER BY id", (practice["practice_id"],)).fetchall()
            db.execute("DELETE FROM skill_evidence WHERE practice_id=?", (practice["practice_id"],))
            for row in turns:
                turn = json.loads(row["turn_json"])
                for item in turn.get("evidence", []):
                    if item.get("demonstrated"):
                        db.execute(
                            "INSERT INTO skill_evidence(learner_id, thread_id, practice_id, criterion_id, response_span, model_result, learner_confirmed, created_at) VALUES(?,?,?,?,?,?,?,?)",
                            (practice["learner_id"], practice["thread_id"], practice["practice_id"], item["criterion_id"], item["response_span"], item["explanation"], 1, timestamp),
                        )
            db.execute("UPDATE practice_runs SET status='reflected', updated_at=? WHERE practice_id=?", (timestamp, practice["practice_id"]))
        return {"initial_assumption": initial, "next_clarification": next_clarification}

    def learning_summary(self, learner_id: str) -> dict:
        with self.connection() as db:
            evidence_rows = db.execute(
                "SELECT criterion_id, COUNT(*) count, MAX(created_at) last_demonstrated FROM skill_evidence WHERE learner_id=? GROUP BY criterion_id ORDER BY criterion_id",
                (learner_id,),
            ).fetchall()
            sessions = db.execute(
                "SELECT thread_id, status, situation, updated_at FROM learning_sessions WHERE learner_id=? ORDER BY updated_at DESC",
                (learner_id,),
            ).fetchall()
        return {"skill_evidence": [dict(row) for row in evidence_rows], "sessions": [dict(row) for row in sessions]}

