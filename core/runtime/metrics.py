from dataclasses import dataclass

@dataclass
class RuntimeMetrics:
    tasks_started: int = 0
    tasks_completed: int = 0
    tasks_failed: int = 0
    tool_calls: int = 0
    research_runs: int = 0

    def record_start(self): self.tasks_started += 1
    def record_complete(self): self.tasks_completed += 1
    def record_failure(self): self.tasks_failed += 1
    def record_tool(self): self.tool_calls += 1
    def record_research(self): self.research_runs += 1

    @property
    def completion_rate(self) -> float:
        return self.tasks_completed / self.tasks_started if self.tasks_started else 0.0
