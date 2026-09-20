"""Held-out benchmark for the cognitive-control objective."""
from __future__ import annotations
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Callable,Any
from .cognitive_extractor import CognitiveTrajectory, COGNITIVE_FIELDS, normalize_teacher_output
from .trajectory_evaluator import evaluate
from .probe_engine import CognitiveProbe

@dataclass(frozen=True)
class BenchmarkResult:
    total:int
    passed:int
    pass_rate:float
    average_score:float

def run_benchmark(probes:list[CognitiveProbe], predictor:Callable[[str],dict[str,Any]], threshold:float=.70)->BenchmarkResult:
    scores=[]; passed=0
    for probe in probes:
        item=normalize_teacher_output(probe.question,predictor(probe.question))
        result=evaluate(probe,item,threshold)
        scores.append(result.score)
        passed += int(result.accepted)
    total=len(probes)
    return BenchmarkResult(total,passed,round(passed/max(1,total),3),round(sum(scores)/max(1,total),3))

def load_probes(path:str)->list[CognitiveProbe]:
    probes=[]
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if line.strip():
            row=json.loads(line)
            probes.append(CognitiveProbe(**row))
    return probes

def save_result(result:BenchmarkResult,path:str)->None:
    Path(path).write_text(json.dumps(result.__dict__,indent=2)+"\n",encoding="utf-8")
