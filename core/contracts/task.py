"""Minimal V0.1 task contract."""

from dataclasses import dataclass, field
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    RESEARCHING = "researching"
    ANSWERING = "answering"
    VERIFYING = "verifying"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Task:
    id: str
    goal: str
    status: TaskStatus = TaskStatus.PENDING
    knowledge_state: str = "unknown"
    confidence: float = 0.0
    current_step: str = "understand"
    reasons: list[str] = field(default_factory=list)
