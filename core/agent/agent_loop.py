from dataclasses import dataclass

from core.agent.persistent_queue import DurableJob, SQLiteJobStore
from core.agent.task_planner import TaskPlanner
from core.agent.tool_runtime import ToolRuntime
from core.contracts.task import Task

@dataclass(frozen=True)
class LoopResult:
    task_id: str
    status: str
    completed_steps: int

class AgentLoop:
    """Plan -> permissioned execution -> durable checkpoint between steps."""

    def __init__(self, queue: SQLiteJobStore, runtime: ToolRuntime):
        self.queue = queue
        self.runtime = runtime
        self.planner = TaskPlanner()

    def run(self, task: Task, *, research: bool = False) -> LoopResult:
        plan = self.planner.plan(task, research=research)
        job = self.queue.next()
        if job is None:
            job = DurableJob(task.id, task.id, {"steps": len(plan.steps)})
            self.queue.put(job)
            job = self.queue.next()
        done = 0
        for step in plan.steps:
            if step.tool_name:
                self.runtime.execute(step.tool_name, step.args, task.id)
            done += 1
            self.queue.update(DurableJob(job.id, job.task_id, {"steps": len(plan.steps), "done": done}, "paused", done/len(plan.steps)))
        self.queue.complete(job.id)
        return LoopResult(task.id, "completed", done)
