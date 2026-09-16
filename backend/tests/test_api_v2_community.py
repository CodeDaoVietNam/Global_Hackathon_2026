from starlette.testclient import TestClient
from app.main import app


def test_submit_contribution_clean_flow():
    with TestClient(app) as client:
        payload = {
            "cue": "chope",
            "scenario": "A packet of tissue paper was placed on a hawker center table.",
            "scenario_family": "campus",
            "relationship": "stranger",
            "channel": "in-person",
            "formality": "casual",
            "interpretation": "It reserves the table while people order food.",
            "do_not_assume": "Do not assume someone left trash or forgot their tissue.",
            "safe_action": "Find an unoccupied table without tissue or items.",
            "counterexample": "An empty used tissue might just be litter.",
            "evidence_scope": "Singapore hawker centers and food courts.",
        }
        res = client.post(
            "/api/v2/community/contributions",
            json=payload,
            headers={"X-Contributor-ID": "test-anon-contributor-1"},
        )
        assert res.status_code == 201
        data = res.json()
        assert "contribution_id" in data
        assert "candidate_id" in data
        assert data["provenance"] == "Pending contribution"

        # Check candidate retrieval
        cand_res = client.get(f"/api/v2/community/candidates/{data['candidate_id']}")
        assert cand_res.status_code == 200
        cand_data = cand_res.json()
        assert cand_data["cue"] == "chope"
        assert len(cand_data["perspectives"]) == 1
        # Contributor hash is never leaked
        assert "contributor_id_hash" not in str(cand_data)

        # Check status receipt
        receipt_res = client.get(f"/api/v2/community/contributions/{data['contribution_id']}/status")
        assert receipt_res.status_code == 200
        receipt_data = receipt_res.json()
        assert receipt_data["cue"] == "chope"


def test_contribution_idempotency_replays_the_original_receipt():
    payload = {
        "cue": "blur",
        "scenario": "A classmate said they were blur after reading the assignment brief.",
        "scenario_family": "campus",
        "relationship": "classmate",
        "channel": "chat",
        "formality": "casual",
        "interpretation": "They may mean they feel confused by the brief.",
    }
    headers = {
        "X-Contributor-ID": "idempotent-contributor",
        "Idempotency-Key": "contribution-1",
    }
    with TestClient(app) as client:
        first = client.post("/api/v2/community/contributions", json=payload, headers=headers)
        second = client.post("/api/v2/community/contributions", json=payload, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 201
    assert second.json()["contribution_id"] == first.json()["contribution_id"]
    assert second.json()["candidate_id"] == first.json()["candidate_id"]


def test_submit_contribution_privacy_blocked():
    with TestClient(app) as client:
        payload = {
            "cue": "secret info",
            "scenario": "Call me at +65 9123 4567 or email secret@nus.edu for details.",
            "scenario_family": "campus",
            "relationship": "classmate",
            "channel": "chat",
            "formality": "casual",
            "interpretation": "Interpretation text here.",
        }
        res = client.post(
            "/api/v2/community/contributions",
            json=payload,
            headers={"X-Contributor-ID": "test-anon-contributor-2"},
        )
        assert res.status_code == 422
        err = res.json()["detail"]
        assert err["error"] == "privacy_violation"
        # Secret values are not echoed in response
        assert "9123 4567" not in str(err)
        assert "secret@nus.edu" not in str(err)


def test_add_perspective_flow():
    with TestClient(app) as client:
        # Create initial contribution
        res = client.post(
            "/api/v2/community/contributions",
            json={
                "cue": "steady",
                "scenario": "Teammate responded steady to proposal.",
                "scenario_family": "teamwork",
                "relationship": "classmate",
                "channel": "chat",
                "formality": "casual",
                "interpretation": "Means enthusiastic agreement.",
                "do_not_assume": "Do not assume formal signoff.",
                "safe_action": "Proceed with agreed task.",
                "counterexample": "Can be used sarcastically if plan failed.",
                "evidence_scope": "Singapore university students.",
            },
            headers={"X-Contributor-ID": "anon-contributor-a"},
        )
        assert res.status_code == 201
        cand_id = res.json()["candidate_id"]

        # Add second perspective
        res2 = client.post(
            f"/api/v2/community/candidates/{cand_id}/perspectives",
            json={
                "interpretation": "Also means reliable or skilled in a playful way.",
                "conditions": "When describing someone handling a task well.",
            },
            headers={"X-Contributor-ID": "anon-contributor-b"},
        )
        assert res2.status_code == 201
        data2 = res2.json()
        assert data2["status"] == "ready_for_review"
        assert data2["readiness"]["ready"] is True
