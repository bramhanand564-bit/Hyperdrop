"""Compressed reusable lesson representation."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Lesson:
    topic: str
    summary: str
    confidence: float
    source_ids: tuple[str, ...] = ()
    use_count: int = 0


def compress_lesson(topic: str, summary: str, confidence: float, source_ids=()) -> Lesson:
    clean_topic = topic.strip()
    clean_summary = " ".join(summary.split())
    if not clean_topic or not clean_summary:
        raise ValueError("lesson topic and summary cannot be empty")
    return Lesson(
        topic=clean_topic,
        summary=clean_summary[:1000],
        confidence=max(0.0, min(1.0, confidence)),
        source_ids=tuple(source_ids),
    )
