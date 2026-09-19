from core.mind.knowledge_gate import classify_knowledge
from core.mind.knowledge_state import KnowledgeState


def test_knowledge_gate():
    assert classify_knowledge(known=True, confidence=.9) == KnowledgeState.KNOWN
    assert classify_knowledge(known=True, confidence=.6) == KnowledgeState.UNCERTAIN
    assert classify_knowledge(known=False, confidence=0) == KnowledgeState.UNKNOWN
    assert classify_knowledge(known=True, confidence=.9, conflicting=True) == KnowledgeState.CONFLICTING
