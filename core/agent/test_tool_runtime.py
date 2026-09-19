from core.agent.audit import AuditLog
from core.agent.permissions import PermissionStore
from core.agent.tool_contract import ToolCall
from core.agent.tool_registry import Tool, ToolRegistry
from core.agent.tool_runtime import ToolRuntime

def test_tool_runtime_audits_and_executes(tmp_path):
    registry=ToolRegistry()
    registry.register(Tool("echo",lambda args: args["x"]))
    permissions=PermissionStore()
    permissions.grant("echo")
    runtime=ToolRuntime(registry,permissions,AuditLog(str(tmp_path/"audit.jsonl")))
    result=runtime.call(ToolCall("echo",{"x":"ok"},"t1"))
    assert result.success is True
    assert result.output=="ok"
