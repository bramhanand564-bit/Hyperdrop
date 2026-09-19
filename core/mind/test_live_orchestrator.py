from core.agent.checkpoint import CheckpointStore
from core.agent.executor import ExecutionEngine
from core.agent.permissions import PermissionStore
from core.agent.task_runner import TaskRunner
from core.agent.tool_registry import ToolRegistry
from core.memory.memory_manager import MemoryManager
from core.memory.store import MemoryStore
from core.mind.live_controller import LiveController
from core.mind.live_orchestrator import LiveOrchestrator
from core.research.engine import ResearchEngine
from core.research.provider import SearchResult
from core.contracts.task import Task


class Provider:
    def search(self, query, limit=5):
        return [SearchResult("Fact", "https://example.gov", "Hyperdrop fact.")]


def test_orchestrator_returns_direct_result(monkeypatch, tmp_path):
    monkeypatch.setattr("core.research.verified_research.read_page", lambda url: "Hyperdrop fact.")
    memory=MemoryManager(MemoryStore(str(tmp_path/"m.json")))
    controller=LiveController(ResearchEngine(Provider()), memory)
    executor=ExecutionEngine(ToolRegistry(), PermissionStore(), TaskRunner(CheckpointStore(str(tmp_path/"c.json"))))
    result=LiveOrchestrator(controller, executor, memory).ask(Task("t", "Hyperdrop"))
    assert result.answer == "Hyperdrop fact."
    assert result.researched is True
