from core.memory.lesson import Lesson
from core.memory.memory_manager import MemoryManager
from core.memory.store import MemoryStore


def test_low_confidence_lesson_is_not_persisted(tmp_path):
    manager = MemoryManager(MemoryStore(str(tmp_path / "m.json")))
    assert manager.learn(Lesson("x", "uncertain", .5)) is None
    assert manager.recall("x") == []


def test_high_confidence_lesson_is_persisted(tmp_path):
    manager = MemoryManager(MemoryStore(str(tmp_path / "m.json")))
    assert manager.learn(Lesson("x", "known fact", .9)) is not None
    assert manager.recall("x")[0].summary == "known fact"
