"""Explore library API endpoint."""

from __future__ import annotations

import os
from pathlib import Path
from fastapi import APIRouter, Query, Request
from app.repositories.evidence import UnifiedEvidenceRepository
from app.services.library_service import LibraryService

router = APIRouter(prefix="/api/v2/library", tags=["library"])


@router.get("/cards")
async def list_library_cards(
    request: Request,
    scenario_family: str | None = Query(None),
    relationship: str | None = Query(None),
    channel: str | None = Query(None),
    formality: str | None = Query(None),
    evidence_level: str | None = Query(None),
    query: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    cursor: int = Query(0, ge=0),
):
    default_cards = Path(__file__).resolve().parents[2] / "docs/contextcue/context-cards.synthetic.en.json"
    cards_path = Path(os.getenv("CONTEXT_CARDS_PATH", str(default_cards)))
    db = request.app.state.database
    evidence_repo = UnifiedEvidenceRepository(cards_path, db)
    service = LibraryService(evidence_repo)
    return service.list_cards(
        scenario_family=scenario_family,
        relationship=relationship,
        channel=channel,
        formality=formality,
        evidence_level=evidence_level,
        query=query,
        limit=limit,
        cursor=cursor,
    )
