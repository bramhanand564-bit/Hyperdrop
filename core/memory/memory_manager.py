"""Memory policy with ranked recall and durable learning."""
from core.memory.lesson import Lesson
from core.memory.retrieval import rank_memories

class MemoryManager:
    def __init__(self, store, recall_threshold: float=0.72):
        self.store=store
        self.recall_threshold=recall_threshold
    def learn(self, lesson: Lesson) -> Lesson | None:
        if lesson.confidence < 0.7: return None
        return self.store.remember(lesson)
    def recall(self, query: str, limit: int=5) -> list[Lesson]:
        candidates=self.store.recall(query,limit=max(limit,10))
        return [h.lesson for h in rank_memories(query,candidates,limit=limit) if h.score >= self.recall_threshold]
    def forget(self, topic: str) -> bool:
        return self.store.forget(topic)
