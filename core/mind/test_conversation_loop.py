from core.contracts.task import Task, TaskStatus
from core.mind.conversation_loop import ConversationLoop
from core.research.engine import ResearchEngine
from core.research.provider import SearchResult


class FakeProvider:
    def search(self, query: str, limit: int = 5):
        return [SearchResult(title="Example", url="https://example.com", snippet=query)]


def test_unknown_question_researches_without_user_wait_message():
    task = Task(id="t1", goal="what does this word mean?")
    turn = ConversationLoop(ResearchEngine(FakeProvider())).handle(task)
    assert turn.task.status == TaskStatus.ANSWERING
    assert turn.task.current_step == "answer"
    assert turn.research is not None
    assert len(turn.research.results) == 1
