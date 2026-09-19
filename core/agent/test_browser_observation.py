from core.agent.browser_adapter import DryRunBrowserAdapter
from core.agent.browser_contract import BrowserAction,BrowserPlan,BrowserStep

def test_dry_run_returns_observations():
    plan=BrowserPlan("t1",(BrowserStep(BrowserAction.OPEN,"https://example.com"),))
    obs=DryRunBrowserAdapter().execute(plan)
    assert obs[0].success is True
    assert obs[0].data["target"]=="https://example.com"
