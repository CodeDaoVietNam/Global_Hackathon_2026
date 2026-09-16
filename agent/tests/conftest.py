import json
from pathlib import Path

import pytest


@pytest.fixture
def cards_path() -> Path:
    return Path(__file__).resolve().parents[2] / "docs/contextcue/context-cards.synthetic.en.json"


@pytest.fixture
def cards(cards_path: Path) -> list[dict]:
    return json.loads(cards_path.read_text(encoding="utf-8"))["cards"]
