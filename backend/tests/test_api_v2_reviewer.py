from starlette.testclient import TestClient
from app.main import app


def test_reviewer_auth_and_moderation_flow():
    with TestClient(app) as client:
        # 1. Unauthenticated access should return 401
        res = client.get("/api/v2/reviewer/queue")
        assert res.status_code == 401

        # 2. Login with bad token -> 401
        res = client.post("/api/v2/reviewer/login", json={"token": "bad-token"})
        assert res.status_code == 401

        # 3. Login with correct token -> 200 and cookie set
        res = client.post("/api/v2/reviewer/login", json={"token": "reviewer-secret-token"})
        assert res.status_code == 200
        assert "contextcue_reviewer" in res.cookies
        assert "samesite=strict" in res.headers["set-cookie"].lower()

        # 4. Access queue with cookie -> 200
        res = client.get("/api/v2/reviewer/queue")
        assert res.status_code == 200

        # 5. Create a contribution to review
        c_res = client.post(
            "/api/v2/community/contributions",
            json={
                "cue": "kiasu",
                "scenario": "Classmate rushed to line up an hour early.",
                "scenario_family": "campus",
                "relationship": "classmate",
                "channel": "in-person",
                "formality": "casual",
                "interpretation": "Fear of missing out or wanting to ensure the best spot.",
                "do_not_assume": "Do not assume malice or greed.",
                "safe_action": "Arrive at normal time or join if you wish.",
                "counterexample": "Sometimes people line up simply because they had free time.",
                "evidence_scope": "Singapore academic environment.",
            },
            headers={"X-Contributor-ID": "rev-test-anon-1"},
        )
        cand_id = c_res.json()["candidate_id"]

        # Add second perspective
        client.post(
            f"/api/v2/community/candidates/{cand_id}/perspectives",
            json={"interpretation": "Pragmatic precaution to secure limited slots."},
            headers={"X-Contributor-ID": "rev-test-anon-2"},
        )

        # 6. Apply decision with stale version -> 409
        decision_payload = {
            "expected_candidate_version": 999,
            "decision": "approve",
            "card_id": "sg-campus-kiasu",
            "title": "Kiasu behaviour in university settings",
            "privacy_check": True,
            "stereotype_risk_check": True,
            "conditional_wording_check": True,
            "perspective_diversity_check": True,
            "counterexample_check": True,
            "safe_action_check": True,
            "evidence_scope_check": True,
        }
        dec_res = client.post(f"/api/v2/reviewer/candidates/{cand_id}/decision", json=decision_payload)
        assert dec_res.status_code == 409

        # 7. Apply decision with correct version 1 -> 200
        decision_payload["expected_candidate_version"] = 1
        dec_res = client.post(f"/api/v2/reviewer/candidates/{cand_id}/decision", json=decision_payload)
        assert dec_res.status_code == 200
        assert dec_res.json()["status"] == "approved"

        # 8. Check card versions
        v_res = client.get("/api/v2/reviewer/cards/sg-campus-kiasu/versions")
        assert v_res.status_code == 200
        versions = v_res.json()
        assert len(versions) >= 1
        assert versions[0]["provenance"] == "Community-reviewed"
