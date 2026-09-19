from core.agent.audit import AuditLog
from core.agent.permissions import PermissionStore
from core.agent.tool_contract import ToolCall
from core.agent.tool_registry import Tool, ToolRegistry
from core.agent.tool_runtime import ToolRuntime

def runtime(tmp_path):
    reg=ToolRegistry(); reg.register(Tool("echo",lambda a:a["value"]))
    perms=PermissionStore(); perms.grant("echo")
    return ToolRuntime(reg,perms,AuditLog(tmp_path/"audit.jsonl"))

def test_runtime_executes_granted_tool(tmp_path):
    assert runtime(tmp_path).call(ToolCall("echo",{"value":"ok"})).output=="ok"

def test_runtime_rejects_inline_secret(tmp_path):
    out=runtime(tmp_path).call(ToolCall("echo",{"password":"x"}))
    assert out.success is False

def test_runtime_requires_confirmation_for_sensitive_tool(tmp_path):
    reg=ToolRegistry(); reg.register(Tool("upload",lambda a:"uploaded"))
    perms=PermissionStore(); perms.grant("upload")
    rt=ToolRuntime(reg,perms,AuditLog(tmp_path/"audit.jsonl"))
    out=rt.call(ToolCall("upload",{"path":"x"}))
    assert out.requires_confirmation is True
    assert out.success is False
    out=rt.call(ToolCall("upload",{"path":"x"},confirmed=True))
    assert out.success is True
