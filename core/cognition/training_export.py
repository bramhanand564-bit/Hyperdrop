"""Export accepted cognitive trajectories to generic SFT-style JSONL."""
from __future__ import annotations
import json
from dataclasses import asdict
from pathlib import Path
from .cognitive_extractor import CognitiveTrajectory
from .probe_engine import CognitiveProbe

def export_sft(items: list[tuple[CognitiveProbe,CognitiveTrajectory,float]], path: str) -> int:
    p=Path(path); p.parent.mkdir(parents=True,exist_ok=True)
    count=0
    with p.open("w",encoding="utf-8") as out:
        for probe,item,score in items:
            target={k:getattr(item,k) for k in asdict(item) if k!="question"}
            record={"instruction":probe.question,"target":target,"metadata":{"category":probe.category,"difficulty":probe.difficulty,"quality_score":score}}
            out.write(json.dumps(record,ensure_ascii=False,separators=(",",":"))+"\n"); count+=1
    return count
