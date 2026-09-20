"""Hybrid-ready memory retrieval."""
from dataclasses import dataclass
import math
from core.memory.lesson import Lesson

@dataclass(frozen=True)
class MemoryHit:
    lesson: Lesson
    score: float

def score_memory(query: str, lesson: Lesson) -> float:
    query_cf = query.casefold().strip()
    if query_cf == lesson.topic.casefold():
        return 0.65 + 0.25 * max(0.0, min(1.0, lesson.confidence)) + 0.10 * (1.0 - math.exp(-lesson.use_count / 5.0))

    terms = {t.casefold() for t in query.split() if len(t) > 2}
    if not terms:
        return 0.0
    text = f"{lesson.topic} {lesson.summary}".casefold()
    overlap = sum(t in text for t in terms) / len(terms)
    if lesson.topic.casefold() in query_cf:
        overlap = 1.0
    confidence = max(0.0, min(1.0, lesson.confidence))
    usage = 1.0 - math.exp(-lesson.use_count / 5.0)
    return 0.65 * overlap + 0.25 * confidence + 0.10 * usage

def rank_memories(query: str, lessons: list[Lesson], limit: int = 5) -> list[MemoryHit]:
    hits = [MemoryHit(x, score_memory(query, x)) for x in lessons]
    hits = [x for x in hits if x.score > 0]
    hits.sort(key=lambda x: x.score, reverse=True)
    return hits[:limit]
