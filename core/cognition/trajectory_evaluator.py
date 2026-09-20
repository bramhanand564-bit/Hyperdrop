"""Evaluate cognitive trajectories against probe intent and reusable-core quality."""
from __future__ import annotations
import re
from dataclasses import dataclass
from .cognitive_extractor import CognitiveTrajectory, COGNITIVE_FIELDS, GENERIC_BAD
from .probe_engine import CognitiveProbe

@dataclass(frozen=True)
class Evaluation:
    score: float
    accepted: bool
    reasons: tuple[str, ...]

def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]{3,}", text.lower()))

def _overlap(a: str, b: str) -> float:
    x,y=_tokens(a),_tokens(b)
    return len(x&y)/max(1,len(y))

def evaluate(probe: CognitiveProbe, item: CognitiveTrajectory, threshold: float=.70) -> Evaluation:
    if item.question.strip() == "":
        return Evaluation(0.0, False, ("missing_question",))
    fields={f:getattr(item,f) for f in COGNITIVE_FIELDS}
    filled=sum(bool(v.strip()) and v.lower() not in GENERIC_BAD for v in fields.values())/len(fields)
    focus=sum(_overlap(fields.get(f,""), probe.category+" "+" ".join(probe.expected_focus)) for f in probe.expected_focus)/max(1,len(probe.expected_focus))
    action=1.0 if fields["next_action"] and fields["response_strategy"] else 0.0
    correction=1.0 if fields["self_correction"] else 0.0
    compression=1.0 if fields["compression"] and len(fields["compression"])<=600 else 0.5 if fields["compression"] else 0.0
    score=round(min(1.0, .35*filled+.25*focus+.20*action+.10*correction+.10*compression),3)
    reasons=[]
    if filled < .60: reasons.append("sparse_cognition")
    if action == 0: reasons.append("missing_action_or_strategy")
    if focus < .15: reasons.append("weak_probe_alignment")
    return Evaluation(score, score>=threshold, tuple(reasons))

def evaluate_many(items: list[tuple[CognitiveProbe,CognitiveTrajectory]], threshold: float=.70) -> list[Evaluation]:
    return [evaluate(p,t,threshold) for p,t in items]
