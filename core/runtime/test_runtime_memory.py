from core.memory.lesson import Lesson
from core.runtime.config import RuntimeConfig
from core.runtime.system import HyperdropRuntime


def test_runtime_reuses_persistent_memory(tmp_path):
    config = RuntimeConfig(
        provider="noop",
        memory_path=str(tmp_path / "memory.json"),
        checkpoint_path=str(tmp_path / "checkpoints.json"),
    )
    first = HyperdropRuntime(config)
    first.memory.learn(Lesson("Python", "Python is a programming language.", .95))
    second = HyperdropRuntime(config)
    result = second.ask("What is Python?", "t2")
    assert result.researched is False
    assert result.answer.answer == "Python is a programming language."
