"""Failure recovery and retry policy."""
from dataclasses import dataclass

@dataclass(frozen=True)
class RecoveryDecision:
    retry: bool
    next_step: str
    reason: str

def recover(error: str, attempts: int, *, max_attempts: int = 3) -> RecoveryDecision:
    if attempts >= max_attempts:
        return RecoveryDecision(False, "handoff", "maximum retry attempts reached")
    text = error.casefold()
    if "permission" in text:
        return RecoveryDecision(False, "request_permission", "tool permission is required")
    if "timeout" in text or "connection" in text:
        return RecoveryDecision(True, "retry", "transient network failure")
    return RecoveryDecision(True, "retry", "recoverable tool failure")
