"""Reviewer workspace authentication and moderation API endpoints."""

from __future__ import annotations

import os
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field

from app.domain.community import ReviewDecisionType
from app.repositories.community import CommunityRepository, StaleVersionConflictError
from app.services.reviewer_auth import (
    COOKIE_NAME,
    create_session,
    require_reviewer,
    revoke_session,
    validate_session,
    verify_token,
)

router = APIRouter(prefix="/api/v2/reviewer", tags=["reviewer"])


class LoginRequest(BaseModel):
    token: str = Field(..., min_length=1)


class DecisionRequest(BaseModel):
    expected_candidate_version: int = Field(..., ge=1)
    decision: ReviewDecisionType
    card_id: str | None = None
    title: str | None = None
    privacy_check: bool = False
    stereotype_risk_check: bool = False
    conditional_wording_check: bool = False
    perspective_diversity_check: bool = False
    counterexample_check: bool = False
    safe_action_check: bool = False
    evidence_scope_check: bool = False
    editorial_notes: str = ""
    decision_note: str = ""


def get_community_repo(request: Request) -> CommunityRepository:
    return CommunityRepository(request.app.state.database)


@router.post("/login")
async def login(req: LoginRequest, request: Request, response: Response):
    if not verify_token(req.token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid reviewer token",
        )

    db = request.app.state.database
    session_id, signed_cookie = create_session(db)
    is_secure = os.getenv("REVIEWER_COOKIE_SECURE", "false").lower() == "true"
    response.set_cookie(
        key=COOKIE_NAME,
        value=signed_cookie,
        httponly=True,
        samesite="strict",
        secure=is_secure,
        path="/",
        max_age=86400,
    )
    return {"status": "authenticated", "session_id": session_id[:8]}


@router.post("/logout")
async def logout(request: Request, response: Response):
    cookie = request.cookies.get(COOKIE_NAME)
    db = request.app.state.database
    revoke_session(cookie, db)
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"status": "logged_out"}


@router.get("/me")
async def me(request: Request):
    cookie = request.cookies.get(COOKIE_NAME)
    db = request.app.state.database
    session_id = validate_session(cookie, db)
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return {"authenticated": True, "session_prefix": session_id[:8]}


@router.get("/queue")
async def review_queue(
    request: Request,
    status: str | None = Query(None),
    session_id: str = Depends(require_reviewer),
):
    repo = get_community_repo(request)
    return repo.list_review_queue(status=status)


@router.get("/candidates/{candidate_id}")
async def reviewer_candidate_detail(
    candidate_id: str,
    request: Request,
    session_id: str = Depends(require_reviewer),
):
    repo = get_community_repo(request)
    cand = repo.get_reviewer_candidate(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return cand


@router.post("/candidates/{candidate_id}/decision")
async def apply_candidate_decision(
    candidate_id: str,
    req: DecisionRequest,
    request: Request,
    session_id: str = Depends(require_reviewer),
):
    repo = get_community_repo(request)
    try:
        result = repo.apply_decision(
            candidate_id=candidate_id,
            reviewer_session_id=session_id,
            expected_version=req.expected_candidate_version,
            decision=req.decision,
            decision_payload=req.model_dump(),
        )
        return result
    except StaleVersionConflictError as e:
        latest = repo.get_reviewer_candidate(candidate_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "stale_version_conflict",
                "message": str(e),
                "expected_version": e.expected_version,
                "current_version": e.current_version,
                "latest_candidate": latest,
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.get("/cards/{card_id}/versions")
async def list_card_versions(
    card_id: str,
    request: Request,
    session_id: str = Depends(require_reviewer),
):
    repo = get_community_repo(request)
    return repo.list_card_versions(card_id)
