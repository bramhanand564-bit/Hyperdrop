"""Task resume policy built on durable job state."""
from dataclasses import dataclass
from core.agent.persistent_queue import SQLiteJobStore

@dataclass(frozen=True)
class ResumeDecision:
    resumable: bool
    reason: str

class ResumeManager:
    def __init__(self, store: SQLiteJobStore):
        self.store = store

    def inspect(self, job_id: str) -> ResumeDecision:
        job = self.store.get(job_id)
        if job is None:
            return ResumeDecision(False, "job not found")
        if job.status == "completed":
            return ResumeDecision(False, "job already completed")
        if job.status not in {"running", "paused", "pending"}:
            return ResumeDecision(False, f"job is {job.status}")
        return ResumeDecision(True, "unfinished durable job")

    def load(self, job_id: str):
        decision = self.inspect(job_id)
        if not decision.resumable:
            return None
        return self.store.get(job_id)
