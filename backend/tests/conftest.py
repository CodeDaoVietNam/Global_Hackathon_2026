import pytest

@pytest.fixture(autouse=True)
def offline_by_default(monkeypatch):
    monkeypatch.setenv('AI_PROVIDER', 'reference')
