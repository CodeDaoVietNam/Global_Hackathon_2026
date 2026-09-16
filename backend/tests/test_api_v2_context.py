import httpx
import pytest

from app.main import app


def headers(learner="learner-a", idem=None):
    value = {"X-Learner-ID": learner}
    if idem:
        value["Idempotency-Key"] = idem
    return value


@pytest.mark.asyncio
async def test_context_thread_analysis_owner_and_switch(tmp_path, monkeypatch):
    monkeypatch.setenv("CONTEXTCUE_DB_PATH", str(tmp_path / "contextcue.db"))
    async with app.router.lifespan_context(app), httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        created = await client.post("/api/v2/threads", headers=headers(), json={})
        assert created.status_code == 201
        thread_id = created.json()["thread_id"]

        analyzed = await client.post(
            f"/api/v2/threads/{thread_id}/analyze",
            headers=headers(idem="analysis-1"),
            json={
                "situation": "My teammate said can lah in our group chat.",
                "context": "We had not assigned slides or agreed a deadline.",
            },
        )
        assert analyzed.status_code == 200
        result = analyzed.json()
        assert result["status"] == "complete"
        assert result["context_map"]["known_facts"]
        assert result["context_map"]["response_strategies"]
        assert result["context_map"]["evidence_trail"][0]["card_id"] == "sg-team-01"

        repeated = await client.post(
            f"/api/v2/threads/{thread_id}/analyze",
            headers=headers(idem="analysis-1"),
            json={"situation": "Different text must not replace the idempotent result", "context": ""},
        )
        assert repeated.json()["context_map"] == result["context_map"]

        assert (await client.get(f"/api/v2/threads/{thread_id}", headers=headers("other"))).status_code == 404
        switched = await client.post(
            f"/api/v2/threads/{thread_id}/switch-context",
            headers=headers(),
            json={"overrides": {"relationship": "lecturer", "channel": "email", "formality": "formal"}},
        )
        assert switched.status_code == 200
        assert switched.json()["changed"]["relationship"]["after"] == "lecturer"
        assert switched.json()["unchanged_facts"] == result["context_map"]["known_facts"]


@pytest.mark.asyncio
async def test_vague_context_interrupts_and_resumes(tmp_path, monkeypatch):
    monkeypatch.setenv("CONTEXTCUE_DB_PATH", str(tmp_path / "contextcue.db"))
    async with app.router.lifespan_context(app), httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        thread_id = (await client.post("/api/v2/threads", headers=headers(), json={})).json()["thread_id"]
        paused = await client.post(
            f"/api/v2/threads/{thread_id}/analyze",
            headers=headers(), json={"situation": "They said okay.", "context": ""},
        )
        assert paused.status_code == 200
        assert paused.json()["status"] == "awaiting_context"
        assert paused.json()["questions"]

        resumed = await client.post(
            f"/api/v2/threads/{thread_id}/context",
            headers=headers(),
            json={"answers": {"relationship": "teammate", "channel": "group chat", "goal": "confirm task ownership"}},
        )
        assert resumed.status_code == 200
        assert resumed.json()["status"] in {"complete", "safe_result"}


@pytest.mark.asyncio
async def test_context_stream_uses_business_events_and_delete_removes_thread(tmp_path, monkeypatch):
    monkeypatch.setenv("CONTEXTCUE_DB_PATH", str(tmp_path / "contextcue.db"))
    async with app.router.lifespan_context(app), httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        thread_id = (await client.post("/api/v2/threads", headers=headers(), json={})).json()["thread_id"]
        response = await client.post(
            f"/api/v2/threads/{thread_id}/analyze/stream",
            headers=headers(),
            json={"situation": "Someone wrote bojio after lunch.", "context": "We are new classmates."},
        )
        assert response.status_code == 200
        assert response.text.index("event: analysis_started") < response.text.index("event: context_extracted")
        assert "event: context_extracted" in response.text
        assert "event: retrieval_completed" in response.text
        assert "event: context_map_ready" in response.text
        assert "prompt" not in response.text.lower()

        assert (await client.delete(f"/api/v2/threads/{thread_id}", headers=headers())).status_code == 204
        assert (await client.get(f"/api/v2/threads/{thread_id}", headers=headers())).status_code == 404
