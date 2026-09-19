from core.contracts.task import Task
from core.memory.memory_manager import MemoryManager
from core.memory.store import MemoryStore
from core.mind.live_controller import LiveController
from core.research.engine import ResearchEngine
from core.research.provider import SearchResult


class FakeProvider:
    def search(self, query, limit=5):
        return [SearchResult("Example", "https://example.gov", "Hyperdrop is a prototype.")]


def test_live_controller_researches_then_remembers(monkeypatch, tmp_path):
    monkeypatch.setattr("core.research.verified_research.read_page", lambda url: "Hyperdrop is a prototype.")
    controller = LiveController(
        ResearchEngine(FakeProvider()),
        MemoryManager(MemoryStore(str(tmp_path / "m.json"))),
    )
    result = controller.handle(Task("t1", "Hyperdrop"))
    assert result.researched is True
    assert result.remembered is True
    assert "Hyperdrop" in result.answer.answer


def test_live_controller_reuses_memory(tmp_path):
    memory = MemoryManager(MemoryStore(str(tmp_path / "m.json")))
    memory.learn(__import__("core.memory.lesson", fromlist=["Lesson"]).Lesson("Hyperdrop", "Saved answer", .9))
    controller = LiveController(ResearchEngine(FakeProvider()), memory)
    result = controller.handle(Task("t2", "Hyperdrop"))
    assert result.researched is False
    assert result.answer.answer == "Saved answer"
