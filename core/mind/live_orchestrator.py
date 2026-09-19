"""Single entry point that routes recall, research, tools and checkpoints."""
from dataclasses import dataclass

from core.agent.executor import ExecutionEngine
from core.agent.tool_registry import ToolRegistry
from core.contracts.task import Task
from core.memory.memory_manager import MemoryManager
from core.mind.live_controller import LiveController
from core.research.engine import ResearchEngine


@dataclass(frozen=True)
class OrchestratorResult:
    answer: str
    researched: bool
    remembered: bool
    task_id: str


class LiveOrchestrator:
    def __init__(
        self,
        controller: LiveController,
        executor: ExecutionEngine,
        memory: MemoryManager,
    ):
        self.controller = controller
        self.executor = executor
        self.memory = memory

    def ask(self, task: Task) -> OrchestratorResult:
        result = self.controller.handle(task)
        return OrchestratorResult(
            answer=result.answer.answer,
            researched=result.researched,
            remembered=result.remembered,
            task_id=task.id,
        )
