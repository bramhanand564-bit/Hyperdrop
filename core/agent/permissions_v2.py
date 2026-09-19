"""Scoped permission decisions for tools and sensitive actions."""
from dataclasses import dataclass

@dataclass(frozen=True)
class PermissionDecision:
    allowed: bool
    requires_confirmation: bool
    reason: str

SENSITIVE_TOOLS={"browser_login","upload","download","send_message","purchase","delete"}

def decide(tool: str, granted: bool, confirmed: bool=False) -> PermissionDecision:
    if tool in SENSITIVE_TOOLS and not confirmed:
        return PermissionDecision(False,True,"explicit confirmation required")
    if not granted:
        return PermissionDecision(False,False,"permission not granted")
    return PermissionDecision(True,False,"allowed")
