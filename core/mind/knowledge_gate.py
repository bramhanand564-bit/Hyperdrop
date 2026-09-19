"""Fast local knowledge gate before expensive external research."""
from core.mind.knowledge_state import KnowledgeState


def classify_knowledge(*, known: bool, confidence: float, conflicting: bool = False) -> KnowledgeState:
    if conflicting:
        return KnowledgeState.CONFLICTING
    if known and confidence >= 0.8:
        return KnowledgeState.KNOWN
    if known and confidence >= 0.5:
        return KnowledgeState.UNCERTAIN
    return KnowledgeState.UNKNOWN
