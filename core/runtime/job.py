"""Durable background-job state independent of Android UI."""
from dataclasses import dataclass
from enum import Enum

class JobState(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    HANDOFF = "handoff"

@dataclass
class Job:
    id: str
    task_id: str
    state: JobState = JobState.QUEUED
    progress: float = 0.0
    attempts: int = 0
    error: str = ""
