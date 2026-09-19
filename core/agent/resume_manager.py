"""Task resume policy built on durable job state."""
from dataclasses import dataclass
from core.agent.persistent_queue import SQLiteJobStore, DurableJob

@dataclass(frozen=True)
class ResumeDecision:
    resumable: bool
    reason: str

class ResumeManager:
    def __init__(self, store: SQLiteJobStore):
        self.store=store

    def inspect(self, job_id: str) -> ResumeDecision:
        # Store is intentionally small; resume is permitted for non-completed jobs.
        job=self.store.next()
        if job is None:
            return ResumeDecision(False,"no unfinished job")
        if job.id != job_id:
            self.store.update(job)
            return ResumeDecision(False,"requested job not next")
        return ResumeDecision(job.status in {"running","paused","pending"},"unfinished durable job")
