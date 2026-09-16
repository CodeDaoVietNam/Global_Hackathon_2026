from app.database import Database
from app.services.reviewer_auth import (
    create_session,
    revoke_session,
    validate_session,
    verify_session_signature,
    verify_token,
)


def test_verify_token():
    assert verify_token("reviewer-secret-token") is True
    assert verify_token("wrong-token") is False


def test_session_lifecycle(tmp_path):
    db = Database(tmp_path / "test_auth.db")
    db.setup()

    session_id, cookie = create_session(db)
    assert verify_session_signature(cookie) == session_id

    # Valid session
    assert validate_session(cookie, db) == session_id

    # Revoke session
    revoke_session(cookie, db)
    assert validate_session(cookie, db) is None


def test_tampered_cookie(tmp_path):
    db = Database(tmp_path / "test_auth2.db")
    db.setup()

    _, cookie = create_session(db)
    tampered = cookie + "tampered"
    assert validate_session(tampered, db) is None
