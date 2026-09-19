from core.contracts.task import Task, TaskStatus
from core.mind.task_router import route_task


def test_unknown_goal_routes_to_research():
    task = Task(id="t1", goal="find a fact")
    result = route_task(task, trusted_knowledge_available=False)
    assert result.status == TaskStatus.RESEARCHING
    assert result.current_step == "research"


def test_known_goal_routes_to_answer():
    task = Task(id="t2", goal="answer a stable question")
    result = route_task(task, trusted_knowledge_available=True, confidence=0.95)
    assert result.status == TaskStatus.ANSWERING
    assert result.current_step == "answer"
