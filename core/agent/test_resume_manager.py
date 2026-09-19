from core.agent.resume_manager import ResumeManager
from core.agent.persistent_queue import SQLiteJobStore, DurableJob

def test_resume_manager_finds_unfinished_job(tmp_path):
    q=SQLiteJobStore(tmp_path/"jobs.db")
    q.put(DurableJob("j1","t1",{"step":1},"paused",0.5))
    assert ResumeManager(q).inspect("j1").resumable is True
