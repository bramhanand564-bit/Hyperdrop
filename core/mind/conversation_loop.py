"""Small orchestration boundary between conversation and research.

A future LLM can provide language understanding and final wording, while this
module keeps the control flow deterministic and cheap:
understand -> decide -> research if needed -> return evidence to the responder.
"""
from dataclasses import dataclass

from core.contracts.task import Task, TaskStatus
from core.mind.task_router import route_task
from core.research.engine import ResearchEngine, ResearchResponse
from core.research.research_plan import build_plan


@dataclass(frozen=True)
class ConversationTurn:
    task: Task
    research: ResearchResponse | None


class ConversationLoop:
    def __init__(self, research_engine: ResearchEngine):
        self.research_engine = research_engine

    def handle(
        self,
        task: Task,
        *,
        confidence: float = 0.0,
        trusted_knowledge_available: bool = False,
        explicit_research_requested: bool = False,
    ) -> ConversationTurn:
        route_task(
            task,
            confidence=confidence,
            trusted_knowledge_available=trusted_knowledge_available,
            explicit_research_requested=explicit_research_requested,
        )

        if task.status != TaskStatus.RESEARCHING:
            return ConversationTurn(task=task, research=None)

        plan = build_plan(task.id, task.goal)
        step = plan.steps[0]
        research = self.research_engine.run(step.query)
        task.status = TaskStatus.ANSWERING
        task.current_step = "answer"
        return ConversationTurn(task=task, research=research)
