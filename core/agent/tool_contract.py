"""V0.2 tool contract: observable, permission-aware, auditable actions."""
from dataclasses import dataclass, field
from typing import Any, Callable

@dataclass(frozen=True)
class ToolCall:
    tool: str
    arguments: dict[str, Any] = field(default_factory=dict)
    task_id: str = ""
    confirmed: bool = False

@dataclass(frozen=True)
class ToolOutcome:
    success: bool
    output: Any = None
    error: str = ""
    requires_confirmation: bool = False
    audit_event: str = ""

ToolHandler=Callable[[dict[str,Any]], Any]
