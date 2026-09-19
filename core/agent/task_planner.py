from dataclasses import dataclass, field
from enum import Enum

from core.agent.browser_contract import BrowserAction, BrowserStep
from core.agent.tool_contract import ToolCall
from core.contracts.task import Task

class PlanKind(str, Enum):
    ANSWER = "answer"
    TOOL = "tool"
    RESEARCH = "research"
    HANDOFF = "handoff"

@dataclass(frozen=True)
class PlannedStep:
    name: str
    kind: PlanKind
    tool_name: str | None = None
    args: dict = field(default_factory=dict)
    requires_confirmation: bool = False

@dataclass(frozen=True)
class TaskPlan:
    task_id: str
    steps: tuple[PlannedStep, ...]
    reason: str = ""

class TaskPlanner:
    """Pure planner: selects a safe execution shape; it never executes tools."""
    def plan(self, task: Task, *, research=False, browser_steps=()):
        if browser_steps:
            sensitive = any(s.action in {BrowserAction.LOGIN, BrowserAction.UPLOAD, BrowserAction.DOWNLOAD} for s in browser_steps)
            return TaskPlan(task.id, (PlannedStep("browser", PlanKind.TOOL, "browser", {"steps": browser_steps}, sensitive),), "browser workflow")
        if research:
            return TaskPlan(task.id, (PlannedStep("research", PlanKind.RESEARCH, "research"),), "knowledge gap")
        return TaskPlan(task.id, (PlannedStep("answer", PlanKind.ANSWER),), "direct answer")

    def to_tool_calls(self, plan: TaskPlan, task_id: str | None = None):
        return tuple(ToolCall(tool=s.tool_name, arguments=s.args, task_id=task_id or plan.task_id)
                     for s in plan.steps if s.tool_name)
