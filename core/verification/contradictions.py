"""Detect simple claim conflicts before an answer is emitted."""
import re
from dataclasses import dataclass
from core.contracts.evidence import Evidence


@dataclass(frozen=True)
class ContradictionReport:
    conflicting: bool
    groups: tuple[tuple[str, ...], ...]


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]{4,}", text.lower()))


def detect_contradictions(evidence: list[Evidence] | tuple[Evidence, ...]) -> ContradictionReport:
    verified = [e for e in evidence if e.verified]
    groups = []
    for i, left in enumerate(verified):
        for right in verified[i + 1:]:
            # V0.1 intentionally flags only very similar claims from different sources.
            overlap = len(_tokens(left.claim) & _tokens(right.claim))
            if overlap >= 4 and left.claim.strip().lower() != right.claim.strip().lower():
                groups.append((left.id, right.id))
    return ContradictionReport(bool(groups), tuple(groups))
