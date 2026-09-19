"""Minimal, inspectable V0.1 knowledge-gap decision logic."""

from dataclasses import dataclass
from enum import Enum


class Decision(str, Enum):
    ANSWER = "answer"
    RESEARCH = "research"


@dataclass(frozen=True)
class DecisionInput:
    current_information_needed: bool = False
    explicit_research_requested: bool = False
    trusted_knowledge_available: bool = True
    conflicting_evidence: bool = False
    confidence: float = 1.0
    required_confidence: float = 0.7


@dataclass(frozen=True)
class DecisionResult:
    decision: Decision
    reasons: tuple[str, ...]


def choose_action(data: DecisionInput) -> DecisionResult:
    """Choose direct response or research using explicit V0.1 rules."""
    reasons: list[str] = []

    if data.current_information_needed:
        reasons.append("current information is required")
    if data.explicit_research_requested:
        reasons.append("research was explicitly requested")
    if not data.trusted_knowledge_available:
        reasons.append("trusted knowledge is unavailable")
    if data.conflicting_evidence:
        reasons.append("evidence conflicts")
    if data.confidence < data.required_confidence:
        reasons.append("confidence is below the required threshold")

    if reasons:
        return DecisionResult(Decision.RESEARCH, tuple(reasons))

    return DecisionResult(Decision.ANSWER, ("available knowledge is sufficient",))
