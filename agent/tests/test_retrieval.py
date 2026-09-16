from contextcue_agent.retrieval import CardRepository, HybridRetriever
from contextcue_agent.schemas import ContextProfile


def test_lexical_retrieval_returns_ranked_evidence_with_provenance(cards_path):
    result = HybridRetriever(CardRepository(cards_path)).search(
        "Someone wrote bojio after seeing our lunch photo.", ContextProfile()
    )

    assert result.mode == "lexical"
    assert result.items[0].card_id == "sg-humour-01"
    assert result.items[0].evidence_status == "synthetic_unreviewed"
    assert 1 <= len(result.items) <= 3


def test_irrelevant_query_returns_no_evidence(cards_path):
    result = HybridRetriever(CardRepository(cards_path)).search(
        "How do I renew a passport?", ContextProfile()
    )
    assert result.items == []


def test_reciprocal_rank_fusion_is_deterministic():
    rankings = [["a", "b", "c"], ["b", "a", "d"]]
    from contextcue_agent.retrieval import reciprocal_rank_fusion

    assert reciprocal_rank_fusion(rankings)[:2] == ["a", "b"]
