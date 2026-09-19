from core.agent.recovery import recover

def test_transient_error_retries():
    assert recover("connection timeout", 0).retry is True

def test_permission_failure_hands_off():
    decision = recover("permission denied", 0)
    assert decision.retry is False
    assert decision.next_step == "request_permission"

def test_retry_limit_hands_off():
    assert recover("error", 3).next_step == "handoff"
