"""Create an inspectable research plan from a task."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ResearchStep:
    objective: str
    query: str


@dataclass(frozen=True)
class ResearchPlan:
    task_id: str
    steps: tuple[ResearchStep, ...]


def build_plan(task_id: str, goal: str) -> ResearchPlan:
    return ResearchPlan(
        task_id=task_id,
        steps=(ResearchStep(objective="find relevant evidence", query=goal),),
    )
