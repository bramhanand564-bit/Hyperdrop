"""Bounded memory decay policy."""
from dataclasses import replace
from core.memory.lesson import Lesson

def decay(lesson: Lesson, *, unused_cycles: int = 0) -> Lesson:
    if unused_cycles <= 0:
        return lesson
    penalty = min(0.5, unused_cycles * 0.05)
    return replace(lesson, confidence=max(0.0, lesson.confidence - penalty))

def should_archive(lesson: Lesson) -> bool:
    return lesson.confidence < 0.45 and lesson.use_count == 0
