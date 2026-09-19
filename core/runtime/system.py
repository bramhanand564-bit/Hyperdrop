"""Compose and run the complete V0.1 Hyperdrop runtime."""
from core.agent.checkpoint import CheckpointStore
from core.agent.executor import ExecutionEngine
from core.agent.permissions import PermissionStore
from core.agent.task_runner import TaskRunner
from core.agent.tool_registry import ToolRegistry
from core.contracts.task import Task, TaskStatus
from core.memory.memory_manager import MemoryManager
from core.memory.store import MemoryStore
from core.mind.live_controller import LiveController, LiveResult
from core.research.engine import ResearchEngine
from core.research.provider_factory import create_search_provider
from core.runtime.config import RuntimeConfig
from core.runtime.lifecycle import Lifecycle


class HyperdropRuntime:
    def __init__(self, config: RuntimeConfig | None = None):
        self.config = config or RuntimeConfig()
        self.lifecycle = Lifecycle()
        self.permissions = PermissionStore()
        self.memory = MemoryManager(MemoryStore(self.config.memory_path))
        self.checkpoints = CheckpointStore(self.config.checkpoint_path)
        self.tasks = TaskRunner(self.checkpoints)
        self.tools = ToolRegistry()
        self.executor = ExecutionEngine(self.tools, self.permissions, self.tasks)
        self.research_engine = ResearchEngine(create_search_provider(self.config.provider))
        self.controller = LiveController(self.research_engine, self.memory)

    def ask(self, goal: str, task_id: str = "interactive") -> LiveResult:
        clean_goal = goal.strip()
        if not clean_goal:
            raise ValueError("goal cannot be empty")
        task = Task(task_id, clean_goal)
        self.lifecycle.start_task()
        self.tasks.checkpoint(task.id, "understand", "running", 0.05, {"goal": clean_goal})
        try:
            result = self.controller.handle(task)
            task.status = TaskStatus.COMPLETED
            task.current_step = "completed"
            self.tasks.checkpoint(task.id, "completed", "completed", 1.0)
            return result
        except Exception as exc:
            task.status = TaskStatus.FAILED
            self.tasks.checkpoint(task.id, "failed", "failed", 1.0, {"error": str(exc)})
            raise
        finally:
            self.lifecycle.sleep()
