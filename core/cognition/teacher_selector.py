"""Best-of-N selection for multiple teacher trajectories per probe."""
from __future__ import annotations
from collections import defaultdict
from .cognitive_extractor import CognitiveTrajectory
from .probe_engine import CognitiveProbe
from .trajectory_evaluator import evaluate

def select_best(candidates: list[tuple[CognitiveProbe,CognitiveTrajectory]], threshold: float=.70) -> list[tuple[CognitiveProbe,CognitiveTrajectory,float]]:
    groups=defaultdict(list)
    for probe,item in candidates: groups[probe.question].append((probe,item))
    selected=[]
    for group in groups.values():
        ranked=sorted(((evaluate(p,t,threshold).score,p,t) for p,t in group), key=lambda x:(x[0], x[2].question), reverse=True)
        if ranked and ranked[0][0] >= threshold:
            score,p,t=ranked[0]
            selected.append((p,t,score))
    return selected
