from core.agent.browser_adapter import DryRunBrowserAdapter
from core.agent.browser_contract import BrowserAction,BrowserPlan,BrowserStep

def test_dry_run_browser_adapter():
    plan=BrowserPlan("t1",(BrowserStep(BrowserAction.OPEN,"https://example.com"),))
    assert DryRunBrowserAdapter().execute(plan)[0]["action"]=="open"
