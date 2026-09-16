"""Reviewer authentication, constant-time token comparison, and HMAC-signed session cookies."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
import hmac
import hashlib
import os
import secrets
from fastapi import HTTPException, Request, status

from app.database import Database, now_iso

COOKIE_NAME = "contextcue_reviewer"
DEFAULT_REVIEWER_TOKEN = "reviewer-secret-token"
DEFAULT_COOKIE_SECRET = "contextcue-reviewer-hmac-secret-2026"
SESSION_TTL_SECONDS = 86400  # 24 hours


def get_configured_token() -> str:
    return os.getenv("REVIEWER_TOKEN", DEFAULT_REVIEWER_TOKEN)


def get_cookie_secret() -> str:
    return os.getenv("REVIEWER_COOKIE_SECRET", DEFAULT_COOKIE_SECRET)


def verify_token(raw_token: str) -> bool:
    """Constant-time token verification."""
    configured = get_configured_token()
    return secrets.compare_digest(raw_token.strip().encode("utf-8"), configured.strip().encode("utf-8"))


def sign_session_id(session_id: str) -> str:
    secret = get_cookie_secret().encode("utf-8")
    sig = hmac.new(secret, session_id.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{session_id}:{sig}"


def verify_session_signature(signed_value: str) -> str | None:
    try:
        session_id, sig = signed_value.split(":", 1)
    except ValueError:
        return None
    secret = get_cookie_secret().encode("utf-8")
    expected_sig = hmac.new(secret, session_id.encode("utf-8"), hashlib.sha256).hexdigest()
    if secrets.compare_digest(sig.encode("utf-8"), expected_sig.encode("utf-8")):
        return session_id
    return None


def create_session(db: Database) -> tuple[str, str]:
    session_id = str(secrets.token_urlsafe(32))
    created = now_iso()
    expires = (datetime.now(UTC) + timedelta(seconds=SESSION_TTL_SECONDS)).isoformat()
    with db.connection() as conn:
        conn.execute(
            "INSERT INTO reviewer_sessions (session_id, created_at, expires_at) VALUES (?, ?, ?)",
            (session_id, created, expires),
        )
    signed_cookie = sign_session_id(session_id)
    return session_id, signed_cookie


def validate_session(cookie_value: str | None, db: Database) -> str | None:
    if not cookie_value:
        return None
    session_id = verify_session_signature(cookie_value)
    if not session_id:
        return None
    with db.connection() as conn:
        row = conn.execute(
            "SELECT * FROM reviewer_sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
        if not row:
            return None
        if row["revoked_at"] is not None:
            return None
        # Check expiration
        now = now_iso()
        if row["expires_at"] <= now:
            return None
    return session_id


def revoke_session(cookie_value: str | None, db: Database) -> None:
    if not cookie_value:
        return
    session_id = verify_session_signature(cookie_value)
    if not session_id:
        return
    with db.connection() as conn:
        conn.execute(
            "UPDATE reviewer_sessions SET revoked_at = ? WHERE session_id = ?",
            (now_iso(), session_id),
        )


async def require_reviewer(request: Request) -> str:
    """Dependency for reviewer-protected endpoints."""
    cookie = request.cookies.get(COOKIE_NAME)
    db = request.app.state.database
    session_id = validate_session(cookie, db)
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid reviewer session required",
        )
    return session_id
