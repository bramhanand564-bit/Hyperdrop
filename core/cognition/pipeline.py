"""End-to-end cognitive dataset preparation pipeline."""
from __future__ import annotations
import json
from pathlib import Path
from .cognitive_extractor import normalize_teacher_output, _extract_json
from .deduplicator import deduplicate
from .probe_engine import CognitiveProbe
from .teacher_selector import select_best
from .training_export import export_sft

def load_teacher_records(path: str) -> list[tuple[CognitiveProbe,object]]:
    result=[]
    with Path(path).open(encoding="utf-8") as f:
        for line in f:
            if not line.strip(): continue
            row=json.loads(line); probe=CognitiveProbe(**row["probe"])
            raw=row.get("trajectory",{})
            result.append((probe,normalize_teacher_output(probe.question,raw)))
    return result

def prepare(teacher_jsonl: str, output_jsonl: str, threshold: float=.70) -> int:
    candidates=load_teacher_records(teacher_jsonl)
    selected=select_best(candidates,threshold)
    unique=[]
    seen=[]
    for probe,item,score in selected:
        if deduplicate([item],.88):
            if any(item.question == old.question for old in seen): continue
            seen.append(item); unique.append((probe,item,score))
    return export_sft(unique,output_jsonl)
