"""Execution boundary for browser providers and dry-run observation."""
from core.agent.browser_contract import BrowserPlan, BrowserObservation, validate_plan

class BrowserAdapter:
    def execute(self, plan: BrowserPlan) -> list[BrowserObservation]:
        raise NotImplementedError("browser provider not configured")

class DryRunBrowserAdapter(BrowserAdapter):
    def execute(self, plan: BrowserPlan) -> list[BrowserObservation]:
        validate_plan(plan)
        return [BrowserObservation(s.action, True, f"dry-run: {s.action.value}", data={"target":s.target,"value":s.value}) for s in plan.steps]
