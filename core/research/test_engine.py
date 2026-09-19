from core.research.engine import ResearchEngine
from core.research.provider import SearchResult


class FakeProvider:
    def search(self, query, limit=5):
        return [SearchResult("Example", "https://example.com", "example")]


def test_engine_normalizes_query_and_collects_results():
    response = ResearchEngine(FakeProvider()).run("  what is this?  ")
    assert response.query == "what is this?"
    assert len(response.results) == 1


def test_engine_rejects_empty_query():
    try:
        ResearchEngine(FakeProvider()).run("   ")
        assert False
    except ValueError:
        assert True
