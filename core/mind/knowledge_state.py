"""V0.1 knowledge-state model.

Knowledge is deliberately separated from conversational behavior.
"""

from enum import Enum


class KnowledgeState(str, Enum):
    KNOWN = "known"
    UNKNOWN = "unknown"
    UNCERTAIN = "uncertain"
    CONFLICTING = "conflicting"
    LEARNED = "learned"


def should_research(state: KnowledgeState, explicit_request: bool = False) -> bool:
    """Return whether HyperMind should enter the research path."""
    return explicit_request or state in {
        KnowledgeState.UNKNOWN,
        KnowledgeState.UNCERTAIN,
        KnowledgeState.CONFLICTING,
    }
