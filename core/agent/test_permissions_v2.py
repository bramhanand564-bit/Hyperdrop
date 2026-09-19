from core.agent.permissions_v2 import decide

def test_sensitive_action_requires_confirmation():
    d=decide("browser_login",True,False)
    assert d.allowed is False and d.requires_confirmation is True

def test_granted_non_sensitive_action_runs():
    assert decide("search",True).allowed is True
