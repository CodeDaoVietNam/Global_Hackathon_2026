from fastapi import APIRouter, status
from app.schemas import (AnalyzeRequest, AnalyzeResult, ContributionRequest,
                         ContributionResult, PracticeRequest, PracticeResult)
from app.services.ai_service import analyze, dataset, practice, provider
from app.services.contribution_service import queue_contribution

router = APIRouter(prefix='/api/v1')


@router.get('/config')
async def config():
    mode = provider()
    return {'mode': mode, 'external_ai': mode == 'gemini'}


@router.get('/cards')
async def cards():
    return dataset()


@router.post('/analyze', response_model=AnalyzeResult)
async def analyze_situation(request: AnalyzeRequest):
    return analyze(request)


@router.post('/practice', response_model=PracticeResult)
async def review_response(request: PracticeRequest):
    return practice(request)


@router.post('/contributions', response_model=ContributionResult, status_code=status.HTTP_202_ACCEPTED)
async def contribute_context(request: ContributionRequest):
    return queue_contribution(request)
