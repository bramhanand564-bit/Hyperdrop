from core.runtime.config import RuntimeConfig


def test_phone_friendly_defaults():
    config = RuntimeConfig()
    assert config.max_research_results == 5
    assert config.idle_timeout_seconds == 300
