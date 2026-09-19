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

    def set(self, tool: str, allowed: bool, reason: str = ""):
        self._permissions[tool] = Permission(tool, allowed, reason)

    def allowed(self, tool: str) -> bool:
        return self._permissions.get(tool, Permission(tool)).allowed
