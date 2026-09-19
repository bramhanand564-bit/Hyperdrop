from core.agent.secure_handoff import HandoffReason, requires_human_handoff
def test_sensitive_boundaries_require_handoff():
    assert requires_human_handoff(HandoffReason.OTP)
    assert requires_human_handoff(HandoffReason.SENSITIVE)
