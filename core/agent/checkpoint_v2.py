"""Versioned checkpoint envelope for durable resume."""
from dataclasses import dataclass,asdict
import json
from pathlib import Path

@dataclass(frozen=True)
class ResumeState:
    task_id:str
    version:int=1
    step:str="start"
    progress:float=0.0
    payload:dict|None=None

class ResumeStore:
    def __init__(self,path="data/resume.json"):
        self.path=Path(path)
    def save(self,state:ResumeState):
        self.path.parent.mkdir(parents=True,exist_ok=True)
        self.path.write_text(json.dumps(asdict(state),ensure_ascii=False,indent=2),encoding="utf-8")
    def load(self,task_id:str)->ResumeState|None:
        if not self.path.exists(): return None
        item=json.loads(self.path.read_text(encoding="utf-8"))
        return ResumeState(**item) if item.get("task_id")==task_id else None
