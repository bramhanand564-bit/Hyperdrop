from core.agent.agent_loop import AgentLoop
from core.agent.persistent_queue import SQLiteJobStore
from core.agent.tool_runtime import ToolRuntime
from core.agent.tool_registry import ToolRegistry
from core.agent.permissions import PermissionStore
from core.agent.audit import AuditLog
from core.contracts.task import Task

def test_agent_loop_can_complete_non_tool_plan(tmp_path):
    runtime=ToolRuntime(ToolRegistry(), PermissionStore(), AuditLog(str(tmp_path/"audit.jsonl")))
    result=AgentLoop(SQLiteJobStore(tmp_path/"jobs.db"), runtime).run(Task("t1","hello"))
    assert result.status == "completed"
