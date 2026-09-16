"""Community Knowledge public endpoints."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.repositories.community import CommunityRepository, DuplicatePerspectiveError
from app.services.community_service import CommunityService

router = APIRouter(prefix="/api/v2/community", tags=["community"])


class ContributionCreateRequest(BaseModel):
    cue: str = Field(..., min_length=1, max_length=100)
    scenario: str = Field(..., min_length=5, max_length=1000)
    scenario_family: str = Field(..., min_length=1, max_length=50)
    relationship: str = Field(..., min_length=1, max_length=50)
    channel: str = Field(..., min_length=1, max_length=50)
    formality: str = Field(..., min_length=1, max_length=50)
    interpretation: str = Field(..., min_length=5, max_length=1000)
    conditions: str = Field("", max_length=500)
    counterconditions: str = Field("", max_length=500)
    do_not_assume: str = Field("", max_length=500)
    safe_action: str = Field("", max_length=500)
    counterexample: str = Field("", max_length=500)
    evidence_scope: str = Field("", max_length=500)
    direct_experience: bool = True
    consent_given: bool = True


class PerspectiveCreateRequest(BaseModel):
    interpretation: str = Field(..., min_length=5, max_length=1000)
    conditions: str = Field("", max_length=500)
    counterconditions: str = Field("", max_length=500)


def get_community_service(request: Request) -> CommunityService:
    repo = CommunityRepository(request.app.state.database)
    return CommunityService(repo)


def get_community_repo(request: Request) -> CommunityRepository:
    return CommunityRepository(request.app.state.database)


@router.post("/contributions", status_code=status.HTTP_201_CREATED)
async def submit_contribution(
    req: ContributionCreateRequest,
    request: Request,
    x_contributor_id: str = Header(..., alias="X-Contributor-ID"),
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
):
    if not x_contributor_id or not x_contributor_id.strip():
        raise HTTPException(status_code=400, detail="X-Contributor-ID header is required")

    service = get_community_service(request)
    result = service.submit_contribution(
        x_contributor_id, req.model_dump(), idempotency_key=idempotency_key
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": result.get("error"), "privacy_flags": result.get("flags")},
        )
    return result["data"]


@router.get("/candidates")
async def list_candidates(
    request: Request,
    status: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    cursor: int = Query(0, ge=0),
):
    repo = get_community_repo(request)
    return repo.list_public_candidates(status=status, limit=limit, cursor=cursor)


@router.get("/candidates/similar")
async def find_similar_candidates(
    request: Request,
    cue: str = Query(..., min_length=1),
    scenario_family: str = Query("", max_length=50),
    limit: int = Query(5, ge=1, le=20),
):
    repo = get_community_repo(request)
    return repo.find_similar_candidates(cue=cue, scenario_family=scenario_family, limit=limit)


@router.get("/candidates/{candidate_id}")
async def get_candidate(candidate_id: str, request: Request):
    repo = get_community_repo(request)
    cand = repo.get_public_candidate(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return cand


@router.post("/candidates/{candidate_id}/perspectives", status_code=status.HTTP_201_CREATED)
async def add_perspective(
    candidate_id: str,
    req: PerspectiveCreateRequest,
    request: Request,
    x_contributor_id: str = Header(..., alias="X-Contributor-ID"),
):
    if not x_contributor_id or not x_contributor_id.strip():
        raise HTTPException(status_code=400, detail="X-Contributor-ID header is required")

    service = get_community_service(request)
    try:
        result = service.add_perspective(candidate_id, x_contributor_id, req.model_dump())
    except DuplicatePerspectiveError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": result.get("error"), "privacy_flags": result.get("flags")},
        )
    return result["data"]


@router.get("/contributions/{contribution_id}/status")
async def get_contribution_status(contribution_id: str, request: Request):
    repo = get_community_repo(request)
    receipt = repo.get_status_receipt(contribution_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Contribution receipt not found")
    return receipt
