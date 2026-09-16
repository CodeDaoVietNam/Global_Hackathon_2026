from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]
Context = Annotated[str, StringConstraints(strip_whitespace=True, max_length=4000)]
Short = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1500)]


class AnalyzeRequest(BaseModel):
    situation: Text
    context: Context = ''


class Guidance(BaseModel):
    model_config = ConfigDict(extra='forbid')
    summary: Short
    possible_meanings: list[Short] = Field(max_length=3)
    do_not_assume: list[Short] = Field(max_length=4)
    clarifying_questions: list[Short] = Field(max_length=3)
    next_action: Short
    learning_prompt: Short
    card_ids: list[str] = Field(max_length=3)


class AnalyzeResult(Guidance):
    mode: Literal['reference', 'gemini']
    notice: str
    cards: list[dict]
    sources: list[dict]
    request_id: str


class PracticeRequest(AnalyzeRequest):
    card_id: Annotated[str, StringConstraints(max_length=100)]
    response: Text


class PracticeGuidance(BaseModel):
    model_config = ConfigDict(extra='forbid')
    feedback: Short
    strengths: list[Short] = Field(max_length=3)
    improvements: list[Short] = Field(max_length=3)
    suggested_revision: Short


class PracticeResult(BaseModel):
    mode: Literal['self_check', 'gemini']
    notice: str
    criteria: list[str]
    feedback: str
    strengths: list[str]
    improvements: list[str]
    suggested_revision: str
    request_id: str


class ContributionRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    phrase: str = Field(min_length=1, max_length=300)
    contextScenario: Context = ''
    scenarioType: Literal['teamwork', 'feedback', 'singlish-idioms', 'campus-life']
    relationship: Literal['peer-teammate', 'project-lead', 'new-acquaintance', 'senior-mentor']
    literalMeaning: Context = ''
    perspective1: Context = ''
    perspective2: Context = ''
    whatNotToAssume: Context = ''
    suggestedReply: Context = ''
    contributorFaculty: str = Field(default='', max_length=300)


class ContributionResult(BaseModel):
    id: str
    status: Literal['pending_review']
    message: str
