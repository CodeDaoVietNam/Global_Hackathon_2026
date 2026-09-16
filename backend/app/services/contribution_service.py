import json
import os
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from uuid import uuid4

from app.schemas import ContributionRequest, ContributionResult

_write_lock = Lock()


def _queue_path() -> Path:
    default = Path(__file__).resolve().parents[3] / 'data' / 'contributions.json'
    return Path(os.getenv('CONTRIBUTIONS_PATH', default))


def queue_contribution(request: ContributionRequest) -> ContributionResult:
    contribution_id = f'contrib-{uuid4()}'
    record = {
        'id': contribution_id,
        'status': 'pending_review',
        'submitted_at': datetime.now(UTC).isoformat(),
        **request.model_dump(),
    }
    path = _queue_path()
    path.parent.mkdir(parents=True, exist_ok=True)

    # A single process lock is enough for this hackathon deployment.
    with _write_lock:
        try:
            existing = json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
        except (json.JSONDecodeError, OSError):
            existing = []
        existing.append(record)
        temporary = path.with_suffix(f'{path.suffix}.tmp')
        temporary.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding='utf-8')
        temporary.replace(path)

    return ContributionResult(
        id=contribution_id,
        status='pending_review',
        message='Thanks. Your context was queued for human review and is not yet part of the card library.',
    )
