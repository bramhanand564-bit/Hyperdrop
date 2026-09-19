from core.memory.lesson import Lesson
from core.memory.relevance import memory_score, should_forget


def test_relevance_and_forgetting():
    item = Lesson("Python", "language", .9)
    assert memory_score(item, "Python") > .6
    assert should_forget(Lesson("x", "weak", .2)) is True
