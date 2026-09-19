"""Durable V0.2 worker loop for checkpointed background jobs."""
from dataclasses import dataclass
from time import monotonic

from core.agent.checkpoint import CheckpointStore
from core.runtime.job import Job, JobState

@dataclass(frozen=True)
class WorkerResult:
    job_id: str
    state: JobState
    progress: float
    elapsed_seconds: float

class JobWorker:
    def __init__(self, queue, checkpoints: CheckpointStore):
        self.queue=queue
        self.checkpoints=checkpoints

    def run_once(self, handler) -> WorkerResult | None:
        job=self.queue.pop()
        if job is None: return None
        started=monotonic()
        job.state=JobState.RUNNING
        self.checkpoints.save_checkpoint(job.id,"running","running",job.progress,{"attempts":job.attempts})
        try:
            progress=handler(job)
            job.progress=max(0.0,min(1.0,float(progress)))
            job.state=JobState.COMPLETED if job.progress>=1.0 else JobState.PAUSED
            self.checkpoints.save_checkpoint(job.id,"worker",job.state.value,job.progress)
        except Exception as exc:
            job.state=JobState.FAILED
            job.error=str(exc)
            self.checkpoints.save_checkpoint(job.id,"worker","failed",job.progress,{"error":job.error})
        return WorkerResult(job.id,job.state,job.progress,monotonic()-started)
