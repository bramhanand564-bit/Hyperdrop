"""Higher-level tool runtime with centralized authorization and audit events."""
from core.agent.audit import AuditLog
from core.agent.tool_contract import ToolCall, ToolOutcome
from core.agent.tool_registry import ToolRegistry
from core.agent.permissions import PermissionStore
from core.agent.execution_policy import authorize

class ToolRuntime:
    def __init__(self, registry: ToolRegistry, permissions: PermissionStore, audit: AuditLog):
        self.registry=registry
        self.permissions=permissions
        self.audit=audit

    def call(self, request: ToolCall) -> ToolOutcome:
        self.audit.record("tool_requested",tool=request.tool,task_id=request.task_id)
        granted=self.permissions.allowed(request.tool)
        try:
            decision=authorize(request.tool, request.arguments, granted, request.confirmed)
        except ValueError as exc:
            self.audit.record("tool_denied",tool=request.tool,task_id=request.task_id,reason=str(exc))
            return ToolOutcome(False,error=str(exc),audit_event="tool_denied")
        if not decision.allowed:
            event="tool_confirmation_required" if decision.requires_confirmation else "tool_denied"
            self.audit.record(event,tool=request.tool,task_id=request.task_id,reason=decision.reason)
            return ToolOutcome(False,error=decision.reason,requires_confirmation=decision.requires_confirmation,audit_event=event)
        try:
            tool=self.registry.get(request.tool)
            output=tool.handler(request.arguments)
            self.audit.record("tool_completed",tool=request.tool,task_id=request.task_id)
            return ToolOutcome(True,output=output,audit_event="tool_completed")
        except Exception as exc:
            self.audit.record("tool_failed",tool=request.tool,task_id=request.task_id,error=str(exc))
            return ToolOutcome(False,error=str(exc),audit_event="tool_failed")
