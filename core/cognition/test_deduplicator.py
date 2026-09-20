from core.cognition.cognitive_extractor import normalize_teacher_output
from core.cognition.deduplicator import deduplicate, similarity

def item(q): return normalize_teacher_output(q,{"intent":"understand","next_action":"research","response_strategy":"concise"})

def test_similarity_and_dedup():
    assert similarity("What is quantum computing?","What is quantum computing?")==1
    result=deduplicate([item("What is quantum computing?"),item("What is quantum computing?")])
    assert len(result)==1
