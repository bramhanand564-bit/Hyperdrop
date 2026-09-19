from core.memory.semantic_retrieval import score

def test_semanticish_retrieval_rewards_overlap_and_confidence():
    low=score("python language", "python", 0.4)
    high=score("python language", "python language", 0.9)
    assert high > low
