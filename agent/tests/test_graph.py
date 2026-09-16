from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from contextcue_agent.graph import build_context_graph
from contextcue_agent.retrieval import CardRepository, HybridRetriever
from contextcue_agent.schemas import GroundingReport, Interpretation, InterpretationBatch


def test_graph_builds_context_map_for_specific_situation(cards_path):
    graph = build_context_graph(HybridRetriever(CardRepository(cards_path)), InMemorySaver())
    config = {"configurable": {"thread_id": "complete-1"}}

    result = graph.invoke({
        "situation": "My teammate said can lah in our group chat.",
        "additional_context": "We had not assigned slides or a deadline.",
        "status": "received",
        "repair_count": 0,
    }, config=config)

    assert result["status"] == "complete"
    assert result["artifact"]["retrieval_mode"] == "lexical"
    assert result["artifact"]["known_facts"]


def test_graph_interrupts_for_vague_input_and_resumes(cards_path):
    graph = build_context_graph(HybridRetriever(CardRepository(cards_path)), InMemorySaver())
    config = {"configurable": {"thread_id": "pause-1"}}

    paused = graph.invoke({
        "situation": "They said okay.",
        "additional_context": "",
        "status": "received",
        "repair_count": 0,
    }, config=config)
    assert paused["__interrupt__"]

    resumed = graph.invoke(Command(resume={
        "relationship": "teammate",
        "channel": "group chat",
        "goal": "confirm who owns the task",
    }), config=config)
    assert resumed["status"] in {"complete", "safe_result"}
    assert resumed["profile"]["relationship"] == "teammate"


def test_graph_keeps_grounded_model_interpretation_in_final_artifact(cards_path):
    class ScriptedModel:
        def invoke(self, schema, task, payload):
            if schema is InterpretationBatch:
                return InterpretationBatch(interpretations=[Interpretation(
                    statement="The reply may confirm feasibility without assigning a task.",
                    plausibility_conditions=["If no task owner was named."],
                    evidence_ids=["sg-team-01"], support_status="contextual_hypothesis",
                )])
            return GroundingReport(valid_evidence_ids=["sg-team-01"], repair_required=False)

    graph = build_context_graph(HybridRetriever(CardRepository(cards_path)), InMemorySaver(), ScriptedModel())
    result = graph.invoke({
        "situation": "My teammate said can lah in our group chat.",
        "additional_context": "No task owner was named.", "status": "received", "repair_count": 0,
    }, config={"configurable": {"thread_id": "model-artifact"}})
    assert result["artifact"]["perspectives"][0]["statement"] == "The reply may confirm feasibility without assigning a task."
