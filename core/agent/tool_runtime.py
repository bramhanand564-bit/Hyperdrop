"""Higher-level tool runtime with audit events and confirmation semantics."""
from core.agent.audit import AuditLog
from core.agent.tool_contract import ToolCall, ToolOutcome
from core.agent.tool_registry import ToolRegistry
from core.agent.permissions import PermissionStore

class ToolRuntime:
    def __init__(self, registry: ToolRegistry, permissions: PermissionStore, audit: AuditLog):
        self.registry=registry
        self.permissions=permissions
        self.audit=audit

    def call(self, request: ToolCall) -> ToolOutcome:
        self.audit.record("tool_requested",tool=request.tool,task_id=request.task_id)
        if not self.permissions.allowed(request.tool):
            self.audit.record("tool_denied",tool=request.tool,task_id=request.task_id)
            return ToolOutcome(False,error=f"permission denied: {request.tool}",audit_event="tool_denied")
        try:
            tool=self.registry.get(request.tool)
            output=tool.handler(request.arguments)
            self.audit.record("tool_completed",tool=request.tool,task_id=request.task_id)
            return ToolOutcome(True,output=output,audit_event="tool_completed")
        except Exception as exc:
            self.audit.record("tool_failed",tool=request.tool,task_id=request.task_id,error=str(exc))
            return ToolOutcome(False,error=str(exc),audit_event="tool_failed")
