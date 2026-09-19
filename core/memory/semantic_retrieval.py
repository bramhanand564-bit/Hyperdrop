"""Lightweight semantic-ish retrieval without a heavyweight vector dependency."""
import math
import re
from dataclasses import dataclass

TOKEN_RE=re.compile(r"[\w-]+", re.UNICODE)

def tokens(text: str) -> set[str]:
    return {x.lower() for x in TOKEN_RE.findall(text) if len(x)>1}

@dataclass(frozen=True)
class RetrievalScore:
    topic: str
    score: float

def score(query: str, text: str, confidence: float=0.0, use_count: int=0) -> float:
    q, t=tokens(query), tokens(text)
    if not q or not t:
        return 0.0
    overlap=len(q & t)/len(q)
    usage=1-math.exp(-max(use_count,0)/5)
    return 0.60*overlap+0.25*max(0,min(confidence,1))+0.15*usage
