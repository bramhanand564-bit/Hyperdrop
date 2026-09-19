from core.memory.lesson import Lesson
from core.memory.sqlite_store import SQLiteMemoryStore

def test_sqlite_memory_round_trip(tmp_path):
    store=SQLiteMemoryStore(str(tmp_path/"memory.db"))
    lesson=store.remember(Lesson("Python","A programming language.",0.9,("src",)))
    assert lesson.confidence==0.9
    assert store.recall("Python")[0].summary=="A programming language."
    assert store.forget("Python") is True
    assert store.recall("Python")==[]
