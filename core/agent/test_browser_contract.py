import pytest
from core.agent.browser_contract import BrowserAction,BrowserPlan,BrowserStep,validate_plan

def test_browser_plan_accepts_basic_navigation():
    validate_plan(BrowserPlan("t1",(BrowserStep(BrowserAction.OPEN,"https://example.com"),)))
def test_sensitive_actions_are_explicit():
    with pytest.raises(ValueError):
        validate_plan(BrowserPlan("t1",(BrowserStep(BrowserAction.LOGIN,"site"),)))
