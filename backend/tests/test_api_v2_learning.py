import httpx
import pytest

from app.main import app


HEADERS = {"X-Learner-ID": "learner-learning"}


async def completed_thread(client):
    thread_id = (await client.post("/api/v2/threads", headers=HEADERS, json={})).json()["thread_id"]
    response = await client.post(
        f"/api/v2/threads/{thread_id}/analyze",
        headers=HEADERS,
        json={"situation": "My teammate said can lah in our group chat.", "context": "No task or deadline was agreed."},
    )
    assert response.json()["status"] == "complete"
    return thread_id


@pytest.mark.asyncio
async def test_practice_reflection_and_learning_summary(tmp_path, monkeypatch):
    monkeypatch.setenv("CONTEXTCUE_DB_PATH", str(tmp_path / "contextcue.db"))
    async with app.router.lifespan_context(app), httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        thread_id = await completed_thread(client)
        started = await client.post(
            f"/api/v2/threads/{thread_id}/practice",
            headers=HEADERS,
            json={"goal": "clarify_before_inferring"},
        )
        assert started.status_code == 201
        practice = started.json()
        assert len(practice["strategies"]) == 3
        practice_id = practice["practice_id"]

        response = await client.post(
            f"/api/v2/threads/{thread_id}/practice/{practice_id}/respond",
            headers={**HEADERS, "Idempotency-Key": "turn-1"},
            json={"response": "Could you confirm which slides you can take?"},
        )
        assert response.status_code == 200
        turn = response.json()["turn"]
        assert turn["simulation_assumptions"]
        assert all(item["response_span"] in turn["learner_response"] for item in turn["evidence"])

        duplicate = await client.post(
            f"/api/v2/threads/{thread_id}/practice/{practice_id}/respond",
            headers={**HEADERS, "Idempotency-Key": "turn-1"},
            json={"response": "A duplicate response"},
        )
        assert duplicate.json()["turn"] == turn

        reflected = await client.post(
            f"/api/v2/threads/{thread_id}/practice/{practice_id}/reflection",
            headers=HEADERS,
            json={"initial_assumption": "  I assumed agreement.  ", "next_clarification": "I will ask who owns each slide."},
        )
        assert reflected.status_code == 200
        assert reflected.json()["reflection"]["initial_assumption"] == "  I assumed agreement.  "

        summary = await client.get(f"/api/v2/learning/{HEADERS['X-Learner-ID']}", headers=HEADERS)
        assert summary.status_code == 200
        assert summary.json()["progress_meaning"].startswith("Counts of criteria demonstrated")
        assert summary.json()["skill_evidence"]
        assert summary.json()["recommendation"]["reason"]
        assert summary.json()["recommendation"]["scenario_family"] != "academic_teamwork"


@pytest.mark.asyncio
async def test_three_response_limit_and_owner_mismatch(tmp_path, monkeypatch):
    monkeypatch.setenv("CONTEXTCUE_DB_PATH", str(tmp_path / "contextcue.db"))
    async with app.router.lifespan_context(app), httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        thread_id = await completed_thread(client)
        practice_id = (await client.post(
            f"/api/v2/threads/{thread_id}/practice", headers=HEADERS,
            json={"goal": "make_commitments_explicit"},
        )).json()["practice_id"]
        for number in range(1, 4):
            response = await client.post(
                f"/api/v2/threads/{thread_id}/practice/{practice_id}/respond",
                headers={**HEADERS, "Idempotency-Key": f"turn-{number}"},
                json={"response": f"Could you confirm action {number}?"},
            )
            assert response.status_code == 200
        fourth = await client.post(
            f"/api/v2/threads/{thread_id}/practice/{practice_id}/respond",
            headers={**HEADERS, "Idempotency-Key": "turn-4"},
            json={"response": "Could we continue?"},
        )
        assert fourth.status_code == 409
        assert "reflection" in fourth.json()["detail"].lower()

        other = {"X-Learner-ID": "another-learner"}
        assert (await client.get(f"/api/v2/threads/{thread_id}/practice/{practice_id}", headers=other)).status_code == 404
