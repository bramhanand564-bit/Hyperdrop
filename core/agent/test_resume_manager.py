from core.agent.resume_manager import ResumeManager
from core.agent.persistent_queue import SQLiteJobStore, DurableJob

def test_resume_manager_finds_unfinished_job(tmp_path):
    q=SQLiteJobStore(tmp_path/"jobs.db")
    q.put(DurableJob("j1","t1",{"step":1},"paused",0.5))
    assert ResumeManager(q).inspect("j1").resumable is True

def test_resume_manager_does_not_consume_other_jobs(tmp_path):
    q=SQLiteJobStore(tmp_path/"jobs.db")
    q.put(DurableJob("j1","t1",{"step":1},"paused",0.5))
    q.put(DurableJob("j2","t2",{"step":2},"pending",0.0))
    assert ResumeManager(q).inspect("j2").resumable is True
    assert q.get("j1").status == "paused"

def test_resume_manager_loads_payload(tmp_path):
    q=SQLiteJobStore(tmp_path/"jobs.db")
    q.put(DurableJob("j1","t1",{"step":3},"running",0.75))
    job=ResumeManager(q).load("j1")
    assert job.payload["step"] == 3
    assert job.progress == 0.75
