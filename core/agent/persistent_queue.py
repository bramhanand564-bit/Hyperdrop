import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path

@dataclass(frozen=True)
class DurableJob:
    id: str
    task_id: str
    payload: dict
    status: str = "pending"
    progress: float = 0.0

class SQLiteJobStore:
    """Small durable queue; unfinished jobs survive process death."""

    def __init__(self, path: str | Path):
        self.path = str(path)
        with sqlite3.connect(self.path) as db:
            db.execute("""CREATE TABLE IF NOT EXISTS jobs(
                id TEXT PRIMARY KEY, task_id TEXT NOT NULL, payload TEXT NOT NULL,
                status TEXT NOT NULL, progress REAL NOT NULL)""")
            db.commit()

    def put(self, job: DurableJob) -> None:
        with sqlite3.connect(self.path) as db:
            db.execute("INSERT OR REPLACE INTO jobs VALUES(?,?,?,?,?)",
                       (job.id, job.task_id, json.dumps(job.payload), job.status, job.progress))
            db.commit()

    def get(self, job_id: str) -> DurableJob | None:
        with sqlite3.connect(self.path) as db:
            row = db.execute("SELECT id,task_id,payload,status,progress FROM jobs WHERE id=?", (job_id,)).fetchone()
        if not row:
            return None
        return DurableJob(row[0], row[1], json.loads(row[2]), row[3], row[4])

    def next(self) -> DurableJob | None:
        with sqlite3.connect(self.path) as db:
            row = db.execute(
                "SELECT id,task_id,payload,status,progress FROM jobs "
                "WHERE status IN ('pending','paused','running') ORDER BY rowid LIMIT 1"
            ).fetchone()
            if not row:
                return None
            db.execute("UPDATE jobs SET status='running' WHERE id=?", (row[0],))
            db.commit()
        return DurableJob(row[0], row[1], json.loads(row[2]), "running", row[4])

    def update(self, job: DurableJob) -> None:
        self.put(job)

    def complete(self, job_id: str) -> None:
        with sqlite3.connect(self.path) as db:
            db.execute("UPDATE jobs SET status='completed',progress=1 WHERE id=?", (job_id,))
            db.commit()
