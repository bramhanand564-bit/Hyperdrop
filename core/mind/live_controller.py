"""Top-level lightweight controller for Hyperdrop's live loop."""
from dataclasses import dataclass

from core.contracts.task import Task, TaskStatus
from core.memory.memory_manager import MemoryManager
from core.mind.answer_builder import AnswerDraft, build_answer
from core.mind.task_router import route_task
from core.research.engine import ResearchEngine
from core.research.research_plan import build_plan
from core.research.verified_research import VerifiedResearchEngine
from core.research.research_answer import ResearchAnswerPipeline


@dataclass(frozen=True)
class LiveResult:
    answer: AnswerDraft
    remembered: bool
    researched: bool


class LiveController:
    def __init__(self, research_engine: ResearchEngine, memory: MemoryManager):
        self.research_engine = research_engine
        self.memory = memory
        self.pipeline = ResearchAnswerPipeline(VerifiedResearchEngine(research_engine))

    def handle(self, task: Task) -> LiveResult:
        recalled = self.memory.recall(task.goal, limit=3)
        if recalled:
            answer = build_answer(task.goal, [])
            answer = AnswerDraft(
                answer=recalled[0].summary,
                sources=recalled[0].source_ids,
            )
            task.status = TaskStatus.ANSWERING
            task.current_step = "answer"
            return LiveResult(answer, remembered=False, researched=False)

        route_task(task, confidence=task.confidence)
        if task.status != TaskStatus.RESEARCHING:
            task.status = TaskStatus.ANSWERING
            return LiveResult(build_answer(task.goal, []), False, False)

        result = self.pipeline.run(task.id, task.goal)
        remembered = False
        if result.lesson:
            remembered = self.memory.learn(result.lesson) is not None
        task.status = TaskStatus.ANSWERING
        task.current_step = "answer"
        return LiveResult(result.draft, remembered, True)
