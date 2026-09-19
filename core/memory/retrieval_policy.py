"""Memory retrieval policy with confidence threshold and explainable hits."""
from dataclasses import dataclass
from core.memory.lesson import Lesson
from core.memory.retrieval import MemoryHit, rank_memories

@dataclass(frozen=True)
class RecallDecision:
    hit: MemoryHit | None
    should_use: bool
    reason: str

def choose_memory(query: str, lessons: list[Lesson], threshold: float=0.72) -> RecallDecision:
    hits=rank_memories(query,lessons,limit=1)
    if not hits:
        return RecallDecision(None,False,"no_relevant_memory")
    hit=hits[0]
    if hit.score < threshold:
        return RecallDecision(hit,False,"below_relevance_threshold")
    if hit.lesson.confidence < 0.7:
        return RecallDecision(hit,False,"below_confidence_threshold")
    return RecallDecision(hit,True,"trusted_relevant_memory")
