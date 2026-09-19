from core.agent.checkpoint import CheckpointStore
from core.agent.task_runner import TaskRunner


def test_task_runner_clamps_and_resumes(tmp_path):
    runner = TaskRunner(CheckpointStore(str(tmp_path / "c.json")))
    runner.checkpoint("t", "act", "running", 2)
    assert runner.resume("t").progress == 1.0
