from core.agent.checkpoint import CheckpointStore
from core.agent.executor import ExecutionEngine
from core.agent.permissions import PermissionStore
from core.agent.task_runner import TaskRunner
from core.agent.tool_registry import Tool, ToolRegistry


def test_executor_permission_and_checkpoint(tmp_path):
    registry = ToolRegistry()
    registry.register(Tool("echo", lambda args: args["text"]))
    permissions = PermissionStore()
    permissions.set("echo", True)
    runner = TaskRunner(CheckpointStore(str(tmp_path / "c.json")))
    result = ExecutionEngine(registry, permissions, runner).execute("t1", "echo", {"text": "ok"})
    assert result.success is True
    assert result.output == "ok"
    assert runner.resume("t1").status == "completed"
