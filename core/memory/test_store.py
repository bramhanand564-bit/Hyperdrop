from core.memory.lesson import Lesson
from core.memory.store import MemoryStore


def test_store_remember_recall_and_forget(tmp_path):
    store = MemoryStore(str(tmp_path / "memory.json"))
    store.remember(Lesson("Python", "A programming language", .9, ("s1",)))
    assert store.recall("what is Python")[0].topic == "Python"
    store.remember(Lesson("Python", "A high-level programming language", .95, ("s2",)))
    item = store.recall("Python")[0]
    assert item.confidence == .95
    assert item.use_count == 1
    assert item.source_ids == ("s1", "s2")
    assert store.forget("Python") is True
    assert store.recall("Python") == []
