"""Small durable-friendly scheduler for cooperative job execution."""
from dataclasses import dataclass
from time import monotonic
from core.runtime.job import Job
from core.runtime.job_queue import JobQueue

@dataclass(frozen=True)
class ScheduleResult:
    processed: int
    remaining: int
    elapsed_seconds: float

class JobScheduler:
    def __init__(self, queue: JobQueue):
        self.queue=queue

    def run_budget(self, worker, handler, max_jobs: int=1, max_seconds: float=5.0) -> ScheduleResult:
        started=monotonic()
        processed=0
        while processed < max_jobs and len(self.queue) and monotonic()-started < max_seconds:
            worker.run_once(handler)
            processed += 1
        return ScheduleResult(processed,len(self.queue),monotonic()-started)
