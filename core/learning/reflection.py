"""Small post-task reflection record."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Reflection:
    task_id: str
    outcome: str
    lesson: str
    reusable: bool = False


def reflect(task_id: str, outcome: str, lesson: str, reusable: bool = False) -> Reflection:
    if not outcome.strip() or not lesson.strip():
        raise ValueError("reflection fields cannot be empty")
    return Reflection(task_id, outcome.strip(), lesson.strip(), reusable)
