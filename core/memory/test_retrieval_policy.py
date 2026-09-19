from core.memory.lesson import Lesson
from core.memory.retrieval_policy import choose_memory

def test_low_relevance_memory_is_not_used():
    d=choose_memory("quantum computing",[Lesson("Python","A programming language.",.95)])
    assert d.should_use is False

def test_relevant_high_confidence_memory_is_used():
    d=choose_memory("Python language",[Lesson("Python","A programming language.",.95)])
    assert d.should_use is True
