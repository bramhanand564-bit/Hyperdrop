from core.agent.checkpoint import CheckpointStore
from core.agent.scheduler import JobScheduler
from core.agent.worker import JobWorker
from core.runtime.job import Job
from core.runtime.job_queue import JobQueue

def test_scheduler_processes_budget(tmp_path):
    q=JobQueue()
    q.push(Job("j1","t1")); q.push(Job("j2","t2"))
    w=JobWorker(q,CheckpointStore(str(tmp_path/"cp.json")))
    result=JobScheduler(q).run_budget(w,lambda job:1.0,max_jobs=1)
    assert result.processed==1
    assert result.remaining==1
