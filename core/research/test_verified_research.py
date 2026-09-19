from core.research.engine import ResearchEngine
from core.research.provider import SearchResult
from core.research.verified_research import VerifiedResearchEngine


class FakeProvider:
    def search(self, query, limit=5):
        return [SearchResult("Example", "https://example.com", "snippet")]


def test_verified_research_reads_and_returns_evidence(monkeypatch):
    monkeypatch.setattr(
        "core.research.verified_research.read_page",
        lambda url: "A page with useful facts.",
    )
    result = VerifiedResearchEngine(ResearchEngine(FakeProvider())).run("t1", "facts")
    assert len(result.evidence) == 1
    assert result.evidence[0].claim == "A page with useful facts."
