from core.agent.persistent_queue import DurableJob, SQLiteJobStore

def test_queue_survives_reopen(tmp_path):
    path = tmp_path / "jobs.db"
    q = SQLiteJobStore(path)
    q.put(DurableJob("j1", "t1", {"x": 1}))
    q2 = SQLiteJobStore(path)
    job = q2.next()
    assert job and job.id == "j1"
    assert job.status == "running"
