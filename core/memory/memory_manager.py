"""Policy layer deciding what research should become durable memory."""
from core.memory.lesson import Lesson
from core.memory.store import MemoryStore


class MemoryManager:
    def __init__(self, store: MemoryStore):
        self.store = store

    def learn(self, lesson: Lesson) -> Lesson | None:
        if lesson.confidence < 0.7:
            return None
        return self.store.remember(lesson)

    def recall(self, query: str, limit: int = 5) -> list[Lesson]:
        return self.store.recall(query, limit)

    def forget(self, topic: str) -> bool:
        return self.store.forget(topic)
