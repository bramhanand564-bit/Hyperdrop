"""Deterministic leakage-resistant train/eval splitting for cognitive trajectories."""
from __future__ import annotations
import hashlib, json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

def _bucket(text:str)->int:
    digest=hashlib.sha256(text.strip().lower().encode("utf-8")).hexdigest()
    return int(digest[:8],16)%100

def split_records(records:list[dict[str,Any]], eval_ratio:float=.20)->tuple[list[dict[str,Any]],list[dict[str,Any]]]:
    if not 0.0 < eval_ratio < 1.0: raise ValueError("eval_ratio must be between 0 and 1")
    groups=defaultdict(list)
    for record in records:
        instruction=str(record.get("instruction") or record.get("question") or "").strip()
        if not instruction: continue
        groups[instruction.lower()].append(record)
    train=[]; evaluation=[]
    target=int(eval_ratio*100)
    for key,group in groups.items():
        if _bucket(key) < target: evaluation.extend(group)
        else: train.extend(group)
    if records and not evaluation and train:
        evaluation.append(train.pop())
    if records and not train and evaluation:
        train.append(evaluation.pop())
    return train,evaluation

def write_split(records:list[dict[str,Any]],path:str)->int:
    p=Path(path); p.parent.mkdir(parents=True,exist_ok=True)
    with p.open("w",encoding="utf-8") as f:
        for record in records: f.write(json.dumps(record,ensure_ascii=False,separators=(",",":"))+"\n")
    return len(records)

def category_counts(records:list[dict[str,Any]])->dict[str,int]:
    return dict(Counter(str(r.get("metadata",{}).get("category","unknown")) for r in records))
