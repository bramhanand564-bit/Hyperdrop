from core.agent.agent_loop import AgentLoop
from core.agent.persistent_queue import SQLiteJobStore
from core.agent.tool_runtime import ToolRuntime
from core.agent.tool_registry import ToolRegistry, Tool

def test_agent_loop_can_complete_non_tool_plan(tmp_path):
    runtime = ToolRuntime(ToolRegistry())
    result = AgentLoop(SQLiteJobStore(tmp_path/"jobs.db"), runtime).run(__import__("core.contracts.task", fromlist=["Task"]).Task("t1","hello"))
    assert result.status == "completed"
