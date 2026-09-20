"""Dataset integrity gates before any cognitive training run."""
from __future__ import annotations
import hashlib
from typing import Any

def _key(record:dict[str,Any])->str:
    text=str(record.get("instruction") or record.get("question") or "").strip().lower()
    return hashlib.sha256(text.encode()).hexdigest()

def validate_train_eval(train:list[dict[str,Any]], evaluation:list[dict[str,Any]])->tuple[bool,tuple[str,...]]:
    train_keys={_key(r) for r in train}
    eval_keys={_key(r) for r in evaluation}
    overlap=train_keys & eval_keys
    reasons=[]
    if not train: reasons.append("empty_train")
    if not evaluation: reasons.append("empty_eval")
    if overlap: reasons.append("train_eval_exact_overlap")
    return (not reasons,tuple(reasons))
