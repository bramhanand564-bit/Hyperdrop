"""Lightweight persistent semantic/procedural memory store."""
import json
from dataclasses import asdict
from pathlib import Path

from core.memory.lesson import Lesson


class MemoryStore:
    def __init__(self, path: str = "data/memory.json"):
        self.path = Path(path)

    def _load(self) -> list[Lesson]:
        if not self.path.exists():
            return []
        data = json.loads(self.path.read_text(encoding="utf-8"))
        return [
            Lesson(**{**item, "source_ids": tuple(item.get("source_ids", ()))})
            for item in data
        ]

    def _save(self, lessons: list[Lesson]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps([asdict(x) for x in lessons], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def remember(self, lesson: Lesson) -> Lesson:
        lessons = self._load()
        lesson = lesson.__class__(**{**asdict(lesson), "source_ids": tuple(lesson.source_ids)})
        for i, old in enumerate(lessons):
            if old.topic.casefold() == lesson.topic.casefold():
                merged = Lesson(
                    topic=old.topic,
                    summary=lesson.summary,
                    confidence=max(old.confidence, lesson.confidence),
                    source_ids=tuple(dict.fromkeys(tuple(old.source_ids) + tuple(lesson.source_ids))),
                    use_count=old.use_count + 1,
                )
                lessons[i] = merged
                self._save(lessons)
                return merged
        lessons.append(lesson)
        self._save(lessons)
        return lesson

    def recall(self, query: str, limit: int = 5) -> list[Lesson]:
        query_cf = query.casefold().strip()
        terms = {x.casefold() for x in query.split() if len(x) > 2}
        scored = []
        for lesson in self._load():
            haystack = f"{lesson.topic} {lesson.summary}".casefold()
            if not terms:
                score = 1 if query_cf == lesson.topic.casefold() else 0
            else:
                score = sum(term in haystack for term in terms)
                if lesson.topic.casefold() in query_cf:
                    score += len(terms)
            if score:
                scored.append((score, lesson))
        scored.sort(key=lambda item: (item[0], item[1].confidence, item[1].use_count), reverse=True)
        return [lesson for _, lesson in scored[:limit]]

    def forget(self, topic: str) -> bool:
        lessons = self._load()
        kept = [x for x in lessons if x.topic.casefold() != topic.casefold()]
        changed = len(kept) != len(lessons)
        if changed:
            self._save(kept)
        return changed
