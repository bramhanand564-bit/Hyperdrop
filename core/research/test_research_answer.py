from core.research.engine import ResearchEngine
from core.research.provider import SearchResult
from core.research.verified_research import VerifiedResearchEngine
from core.research.research_answer import ResearchAnswerPipeline


class FakeProvider:
    def search(self, query, limit=5):
        return [SearchResult("Example", "https://example.gov/fact", "A useful fact about Hyperdrop.")]


def test_research_answer_pipeline_prepares_lesson(monkeypatch):
    monkeypatch.setattr(
        "core.research.verified_research.read_page",
        lambda url: "A useful fact about Hyperdrop.",
    )
    pipeline = ResearchAnswerPipeline(VerifiedResearchEngine(ResearchEngine(FakeProvider())))
    result = pipeline.run("t1", "Hyperdrop")
    assert result.draft.answer
    assert result.lesson is not None
    assert result.lesson.source_ids == ("t1:web:1",)
