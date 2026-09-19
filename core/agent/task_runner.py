"""Checkpointed task runner for long-running work."""
from core.agent.checkpoint import Checkpoint, CheckpointStore


class TaskRunner:
    def __init__(self, checkpoints: CheckpointStore):
        self.checkpoints = checkpoints

    def checkpoint(self, task_id: str, step: str, status: str, progress: float, payload=None):
        self.checkpoints.save(
            Checkpoint(task_id, step, status, max(0.0, min(1.0, progress)), payload or {})
        )

    def resume(self, task_id: str):
        return self.checkpoints.load(task_id)
