"""Compact answer preparation from verified research evidence."""
from dataclasses import dataclass
from core.contracts.evidence import Evidence


@dataclass(frozen=True)
class AnswerDraft:
    answer: str
    sources: tuple[str, ...]


def build_answer(goal: str, evidence: list[Evidence] | tuple[Evidence, ...]) -> AnswerDraft:
    usable = [item for item in evidence if item.verified]
    if not usable:
        return AnswerDraft(
            answer="मुझे अभी भरोसेमंद जानकारी नहीं मिली।",
            sources=tuple(item.source for item in evidence[:3]),
        )

    # Keep the factual payload small; a language model can rewrite this naturally.
    lines = [item.claim.strip() for item in usable[:3] if item.claim.strip()]
    answer = " ".join(lines)
    return AnswerDraft(answer=answer, sources=tuple(item.source for item in usable[:3]))
