from core.runtime.job import Job
from core.runtime.job_queue import JobQueue

def test_job_queue():
    queue = JobQueue()
    queue.push(Job("j1", "t1"))
    assert queue.pop().id == "j1"
    assert len(queue) == 0
