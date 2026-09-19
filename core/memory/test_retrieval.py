from core.memory.lesson import Lesson
from core.memory.retrieval import rank_memories

def test_retrieval_ranks_relevant_memory():
    hits=rank_memories("python language",[Lesson("Python","A programming language.",.9),Lesson("France","A country.",.9)])
    assert hits[0].lesson.topic=="Python"
    assert hits[0].score>0.5
