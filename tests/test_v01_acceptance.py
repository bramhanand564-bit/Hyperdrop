from core.memory.lesson import Lesson
from core.runtime.config import RuntimeConfig
from core.runtime.system import HyperdropRuntime


def test_v01_offline_acceptance(tmp_path):
    runtime = HyperdropRuntime(RuntimeConfig(
        provider="noop",
        memory_path=str(tmp_path / "memory.json"),
        checkpoint_path=str(tmp_path / "checkpoints.json"),
    ))
    unknown = runtime.ask("What is a completely unknown thing?", "unknown")
    assert unknown.researched is True
    assert "भरोसेमंद" in unknown.answer.answer
    assert runtime.checkpoints.load("unknown").progress == 1.0
    runtime.memory.learn(Lesson("Hyperdrop", "A persistent tool-using AI prototype.", .95))
    known = runtime.ask("Tell me about Hyperdrop", "known")
    assert known.researched is False
    assert known.answer.answer == "A persistent tool-using AI prototype."
