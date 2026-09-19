from task import Task, TaskStatus


def test_task_starts_pending():
    task = Task(id="t1", goal="find meaning")
    assert task.status == TaskStatus.PENDING
    assert task.knowledge_state == "unknown"
