"""Permission-aware execution engine with checkpoints and tool dispatch."""
from dataclasses import dataclass

from core.agent.checkpoint import CheckpointStore
from core.agent.permissions import PermissionStore
from core.agent.task_runner import TaskRunner
from core.agent.tool_registry import ToolRegistry


@dataclass(frozen=True)
class ExecutionResult:
    success: bool
    output: object = None
    error: str = ""


class ExecutionEngine:
    def __init__(self, registry: ToolRegistry, permissions: PermissionStore, runner: TaskRunner):
        self.registry = registry
        self.permissions = permissions
        self.runner = runner

    def execute(self, task_id: str, tool_name: str, args=None, *, progress: float = 0.0) -> ExecutionResult:
        if not self.permissions.allowed(tool_name):
            return ExecutionResult(False, error=f"permission denied: {tool_name}")
        try:
            tool = self.registry.get(tool_name)
            self.runner.checkpoint(task_id, f"tool:{tool_name}", "running", progress, {"args": args or {}})
            output = tool.handler(args or {})
            self.runner.checkpoint(task_id, f"tool:{tool_name}", "completed", 1.0)
            return ExecutionResult(True, output=output)
        except Exception as exc:
            self.runner.checkpoint(task_id, f"tool:{tool_name}", "failed", progress, {"error": str(exc)})
            return ExecutionResult(False, error=str(exc))
