from dataclasses import dataclass, field
from enum import Enum

from core.agent.browser_contract import BrowserPlan, BrowserStep, BrowserAction
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
    """Pure planner: chooses a safe execution shape; it never executes tools."""

    def plan(self, task: Task, *, research: bool = False, browser_steps: tuple[BrowserStep, ...] = ()) -> TaskPlan:
        if browser_steps:
            sensitive = any(s.action in {BrowserAction.LOGIN, BrowserAction.UPLOAD, BrowserAction.DOWNLOAD} for s in browser_steps)
            return TaskPlan(
                task.id,
                (PlannedStep("browser", PlanKind.TOOL, "browser", {"steps": browser_steps}, sensitive),),
                "browser workflow",
            )
        if research:
            return TaskPlan(task.id, (PlannedStep("research", PlanKind.RESEARCH, "research"),), "knowledge gap")
        return TaskPlan(task.id, (PlannedStep("answer", PlanKind.ANSWER),), "direct answer")

    def to_tool_calls(self, plan: TaskPlan) -> tuple[ToolCall, ...]:
        calls = []
        for step in plan.steps:
            if step.tool_name:
                calls.append(ToolCall(name=step.tool_name, args=step.args, requires_confirmation=step.requires_confirmation))
        return tuple(calls)
