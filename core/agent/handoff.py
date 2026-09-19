"""Explicit human handoff contract for sensitive or ambiguous work.

The agent pauses instead of guessing when a user-controlled step is required.
"""
from dataclasses import dataclass
from enum import Enum

class HandoffReason(str, Enum):
    LOGIN = "login"
    OTP = "otp"
    AMBIGUOUS = "ambiguous"
    SENSITIVE = "sensitive"
    CONFIRMATION = "confirmation"

@dataclass(frozen=True)
class HandoffRequest:
    task_id: str
    reason: HandoffReason
    message: str
    step: str = ""

def request_handoff(task_id: str, reason: HandoffReason, message: str, step: str = "") -> HandoffRequest:
    if not task_id.strip() or not message.strip():
        raise ValueError("task_id and message are required")
    return HandoffRequest(task_id, reason, message, step)
