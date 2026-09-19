from core.agent.execution_policy import authorize

def test_safe_tool_can_be_authorized():
    d=authorize("echo", {"x":1}, True)
    assert d.allowed is True

def test_sensitive_tool_needs_confirmation():
    d=authorize("browser_login", {}, True)
    assert d.requires_confirmation is True
