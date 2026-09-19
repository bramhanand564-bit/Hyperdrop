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
    """Plan -> permissioned execution -> durable progress between steps."""
    def __init__(self, queue: SQLiteJobStore, runtime: ToolRuntime):
        self.queue, self.runtime, self.planner = queue, runtime, TaskPlanner()

    def run(self, task: Task, *, research=False) -> LoopResult:
        plan = self.planner.plan(task, research=research)
        job = self.queue.next()
        if job is None:
            self.queue.put(DurableJob(task.id, task.id, {"steps": len(plan.steps)}))
            job = self.queue.next()
        done = 0
        for call in self.planner.to_tool_calls(plan, task.id):
            outcome = self.runtime.call(call)
            if not outcome.success:
                self.queue.update(DurableJob(job.id, job.task_id, {"steps": len(plan.steps), "done": done}, "paused", done/max(1,len(plan.steps))))
                return LoopResult(task.id, "paused", done)
            done += 1
            self.queue.update(DurableJob(job.id, job.task_id, {"steps": len(plan.steps), "done": done}, "paused", done/max(1,len(plan.steps))))
        self.queue.complete(job.id)
        return LoopResult(task.id, "completed", len(plan.steps))
