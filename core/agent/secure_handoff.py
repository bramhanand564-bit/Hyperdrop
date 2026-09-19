from dataclasses import dataclass
from enum import Enum

class HandoffReason(str, Enum):
    OTP = "otp"
    LOGIN = "login"
    AMBIGUOUS = "ambiguous"
    SENSITIVE = "sensitive"

@dataclass(frozen=True)
class HandoffRequest:
    task_id: str
    reason: HandoffReason
    message: str

def requires_human_handoff(reason: HandoffReason) -> bool:
    return reason in set(HandoffReason)
