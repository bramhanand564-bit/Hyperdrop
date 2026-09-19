"""Append-only JSONL audit trail for agent actions."""
import json
from pathlib import Path
from datetime import datetime, timezone

class AuditLog:
    def __init__(self,path="data/audit.jsonl"):
        self.path=Path(path)

    def record(self,event:str,**data):
        self.path.parent.mkdir(parents=True,exist_ok=True)
        item={"timestamp":datetime.now(timezone.utc).isoformat(),"event":event,**data}
        with self.path.open("a",encoding="utf-8") as f:
            f.write(json.dumps(item,ensure_ascii=False)+"\n")
        return item
