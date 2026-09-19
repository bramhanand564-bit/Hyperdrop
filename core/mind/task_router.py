"""Connect a Task to the V0.1 knowledge-gap decision policy."""

from core.contracts.task import Task, TaskStatus
from core.mind.decision import Decision, DecisionInput, choose_action
from core.mind.knowledge_state import KnowledgeState


def route_task(
    task: Task,
    *,
    current_information_needed: bool = False,
    explicit_research_requested: bool = False,
    trusted_knowledge_available: bool = True,
    conflicting_evidence: bool = False,
    confidence: float = 1.0,
    required_confidence: float = 0.7,
) -> Task:
    result = choose_action(
        DecisionInput(
            current_information_needed=current_information_needed,
            explicit_research_requested=explicit_research_requested,
            trusted_knowledge_available=trusted_knowledge_available,
            conflicting_evidence=conflicting_evidence,
            confidence=confidence,
            required_confidence=required_confidence,
        )
    )

    task.reasons = list(result.reasons)
    task.confidence = confidence

    if result.decision == Decision.RESEARCH:
        task.status = TaskStatus.RESEARCHING
        task.current_step = "research"
    else:
        task.status = TaskStatus.ANSWERING
        task.current_step = "answer"

    return task
