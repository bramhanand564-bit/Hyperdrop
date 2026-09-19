from core.agent.handoff import HandoffReason, request_handoff

def test_handoff_requires_user_context():
    req=request_handoff("t1", HandoffReason.OTP, "Enter the OTP shown on your device", "verify")
    assert req.reason is HandoffReason.OTP
    assert req.step == "verify"

def test_handoff_rejects_empty_context():
    try:
        request_handoff("", HandoffReason.LOGIN, "Sign in")
    except ValueError:
        return
    assert False
