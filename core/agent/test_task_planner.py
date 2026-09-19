from core.agent.task_planner import TaskPlanner, PlanKind
from core.agent.browser_contract import BrowserAction, BrowserStep
from core.contracts.task import Task

def test_planner_builds_research_plan():
    plan=TaskPlanner().plan(Task("t1","find facts"), research=True)
    assert plan.steps[0].kind is PlanKind.RESEARCH

def test_browser_sensitive_step_requires_confirmation():
    step=BrowserStep(action=BrowserAction.LOGIN, target="site")
    plan=TaskPlanner().plan(Task("t2","login"), browser_steps=(step,))
    assert plan.steps[0].requires_confirmation is True
