"""Cheap memory relevance and forgetting policy."""
from core.memory.lesson import Lesson


def memory_score(lesson: Lesson, query: str) -> float:
    terms = [x.casefold() for x in query.split() if len(x) > 2]
    matches = sum(term in f"{lesson.topic} {lesson.summary}".casefold() for term in terms)
    return min(1.0, matches / max(1, len(terms))) * .7 + lesson.confidence * .3


def should_forget(lesson: Lesson, *, min_confidence: float = .4, max_uses: int = 0) -> bool:
    return lesson.confidence < min_confidence and lesson.use_count <= max_uses
