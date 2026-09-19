from core.research.evidence_builder import results_to_evidence
from core.research.provider import SearchResult


def test_search_results_become_evidence():
    evidence = results_to_evidence(
        "task-1",
        [SearchResult(title="Python", url="https://python.org", snippet="Python is a language.")],
    )
    assert evidence[0].id == "task-1:web:1"
    assert evidence[0].source == "https://python.org"
    assert evidence[0].claim == "Python is a language."
