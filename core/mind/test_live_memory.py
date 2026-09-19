from core.contracts.task import Task
from core.memory.lesson import Lesson
from core.memory.memory_manager import MemoryManager
from core.memory.store import MemoryStore
from core.mind.live_controller import LiveController
from core.research.engine import ResearchEngine
from core.research.provider import NoOpSearchProvider

def test_live_controller_uses_ranked_memory(tmp_path):
    memory=MemoryManager(MemoryStore(str(tmp_path/"m.json")))
    memory.learn(Lesson("Python","Python is a programming language.",.95))
    controller=LiveController(ResearchEngine(NoOpSearchProvider()),memory)
    result=controller.handle(Task("t1","What is Python language?"))
    assert result.researched is False
    assert "programming language" in result.answer.answer
