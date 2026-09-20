"""Deterministic normalization and near-duplicate filtering for cognitive datasets."""
from __future__ import annotations
import re
from typing import Iterable
from .cognitive_extractor import CognitiveTrajectory

def fingerprint(text:str)->frozenset[str]:
    return frozenset(re.findall(r"[a-z0-9]{3,}",text.lower()))

def similarity(a:str,b:str)->float:
    x,y=fingerprint(a),fingerprint(b)
    return len(x&y)/max(1,len(x|y))

def deduplicate(items:Iterable[CognitiveTrajectory],threshold:float=.88)->list[CognitiveTrajectory]:
    kept=[]
    for item in items:
        if any(similarity(item.question,old.question)>=threshold for old in kept):continue
        kept.append(item)
    return kept
