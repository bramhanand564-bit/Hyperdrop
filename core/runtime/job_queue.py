from collections import deque
from core.runtime.job import Job

class JobQueue:
    def __init__(self):
        self._queue = deque()

    def push(self, job: Job) -> None:
        self._queue.append(job)

    def pop(self) -> Job | None:
        return self._queue.popleft() if self._queue else None

    def __len__(self) -> int:
        return len(self._queue)
