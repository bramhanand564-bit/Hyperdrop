"""Checkpoint state for long-running tasks."""
from dataclasses import dataclass, asdict
import json
from pathlib import Path


@dataclass
class Checkpoint:
    task_id: str
    step: str
    status: str
    progress: float = 0.0
    payload: dict | None = None


class CheckpointStore:
    def __init__(self, path="data/checkpoints.json"):
        self.path = Path(path)

    def save(self, checkpoint: Checkpoint) -> None:
        data = {}
        if self.path.exists():
            data = json.loads(self.path.read_text(encoding="utf-8"))
        data[checkpoint.task_id] = asdict(checkpoint)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def load(self, task_id: str) -> Checkpoint | None:
        if not self.path.exists():
            return None
        item = json.loads(self.path.read_text(encoding="utf-8")).get(task_id)
        return Checkpoint(**item) if item else None
