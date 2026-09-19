"""SQLite-backed memory store for V0.2.

Keeps the V0.1 MemoryStore interface while adding durable metadata,
keyword retrieval, confidence, usage, and timestamps.
"""
import sqlite3
from dataclasses import asdict
from pathlib import Path
from datetime import datetime, timezone

from core.memory.lesson import Lesson

class SQLiteMemoryStore:
    def __init__(self, path: str = "data/memory.db"):
        self.path = Path(path)
        self._init()

    def _connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        return sqlite3.connect(self.path)

    def _init(self):
        with self._connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS lessons(
                topic TEXT PRIMARY KEY,
                summary TEXT NOT NULL,
                confidence REAL NOT NULL,
                source_ids TEXT NOT NULL,
                use_count INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            )""")
            db.commit()

    def remember(self, lesson: Lesson) -> Lesson:
        import json
        now=datetime.now(timezone.utc).isoformat()
        with self._connect() as db:
            row=db.execute("SELECT use_count,confidence,source_ids FROM lessons WHERE lower(topic)=lower(?)",(lesson.topic,)).fetchone()
            if row:
                old_sources=json.loads(row[2])
                sources=list(dict.fromkeys(old_sources+list(lesson.source_ids)))
                merged=Lesson(lesson.topic,lesson.summary,max(row[1],lesson.confidence),tuple(sources),row[0]+1)
                db.execute("UPDATE lessons SET topic=?,summary=?,confidence=?,source_ids=?,use_count=?,updated_at=? WHERE lower(topic)=lower(?)",
                           (merged.topic,merged.summary,merged.confidence,json.dumps(sources),merged.use_count,now,lesson.topic))
            else:
                merged=lesson
                db.execute("INSERT INTO lessons VALUES(?,?,?,?,?,?)",
                           (lesson.topic,lesson.summary,lesson.confidence,json.dumps(list(lesson.source_ids)),lesson.use_count,now))
            db.commit()
        return merged

    def recall(self, query: str, limit: int=5) -> list[Lesson]:
        import json
        terms={x.casefold() for x in query.split() if len(x)>2}
        if not terms: return []
        with self._connect() as db:
            rows=db.execute("SELECT topic,summary,confidence,source_ids,use_count FROM lessons").fetchall()
        scored=[]
        for topic,summary,confidence,sources,use_count in rows:
            hay=f"{topic} {summary}".casefold()
            score=sum(t in hay for t in terms)
            if score: scored.append((score,confidence,use_count,Lesson(topic,summary,confidence,tuple(json.loads(sources)),use_count)))
        scored.sort(key=lambda x:(x[0],x[1],x[2]),reverse=True)
        return [x[3] for x in scored[:limit]]

    def forget(self, topic: str) -> bool:
        with self._connect() as db:
            cur=db.execute("DELETE FROM lessons WHERE lower(topic)=lower(?)",(topic,))
            db.commit()
            return cur.rowcount>0
