"""Minimal capability permission policy."""
from dataclasses import dataclass

@dataclass(frozen=True)
class Permission:
    tool: str
    allowed: bool = False
    reason: str = ""

class PermissionStore:
    def __init__(self):
        self._permissions: dict[str, Permission] = {}

    def set(self, tool: str, allowed: bool, reason: str = "") -> None:
        self._permissions[tool] = Permission(tool, allowed, reason)

    def grant(self, tool: str, reason: str = "") -> None:
        self.set(tool, True, reason)

    def revoke(self, tool: str, reason: str = "") -> None:
        self.set(tool, False, reason)

    def allowed(self, tool: str) -> bool:
        return self._permissions.get(tool, Permission(tool)).allowed
