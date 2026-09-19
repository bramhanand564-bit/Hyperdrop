"""Execution boundary for future browser providers."""
from core.agent.browser_contract import BrowserPlan

class BrowserAdapter:
    def execute(self, plan: BrowserPlan):
        raise NotImplementedError("browser provider not configured")

class DryRunBrowserAdapter(BrowserAdapter):
    def execute(self, plan: BrowserPlan):
        return [{"action":s.action.value,"target":s.target,"value":s.value} for s in plan.steps]
