from core.agent.checkpoint import CheckpointStore
from core.agent.worker import JobWorker
from core.runtime.job import Job, JobState
from core.runtime.job_queue import JobQueue

def test_worker_completes_job(tmp_path):
    q=JobQueue()
    q.push(Job("j1","t1"))
    worker=JobWorker(q,CheckpointStore(str(tmp_path/"cp.json")))
    result=worker.run_once(lambda job: 1.0)
    assert result.state==JobState.COMPLETED
    assert result.progress==1.0
