from pathlib import Path
from app.database import Database
from app.repositories.evidence import UnifiedEvidenceRepository
from contextcue_agent.schemas import ContextProfile
from contextcue_agent.retrieval import HybridRetriever


def test_unified_evidence_repository(tmp_path):
    # Setup test DB with approved card version
    db_path = tmp_path / "test_evidence.db"
    db = Database(db_path)
    db.setup()

    # Seed path
    seed_path = Path("/docs/contextcue/context-cards.synthetic.en.json")
    if not seed_path.exists():
        seed_path = Path("docs/contextcue/context-cards.synthetic.en.json")
    repo = UnifiedEvidenceRepository(seed_path, db)

    cards = repo.eligible_cards()
    # At least the 12 synthetic seeds
    assert len(cards) >= 12
    # Verify all have valid provenance
    assert all(c.get("provenance") for c in cards)

    retriever = HybridRetriever(repo)
    profile = ContextProfile(relationship="classmate", channel="in-person", formality="casual")
    result = retriever.search("bojio", profile, limit=3)
    assert len(result.items) >= 1
    assert any(item.card_id == "sg-humour-01" for item in result.items)
