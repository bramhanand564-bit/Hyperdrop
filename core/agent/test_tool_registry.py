from core.agent.tool_registry import Tool, ToolRegistry


def test_registry_registers_and_lists_tools():
    registry = ToolRegistry()
    registry.register(Tool("search", lambda q: q))
    assert registry.list() == ("search",)
    assert registry.get("search").handler("x") == "x"
