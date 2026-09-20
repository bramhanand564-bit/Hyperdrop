"""Provider-neutral browser/computer-use hand contract with observable results."""
from dataclasses import dataclass, field
from enum import Enum

class BrowserAction(str, Enum):
    OPEN = "open"
    CLICK = "click"
    TYPE = "type"
    READ = "read"
    SCROLL = "scroll"
    UPLOAD = "upload"
    DOWNLOAD = "download"
    LOGIN = "login"

@dataclass(frozen=True)
class BrowserStep:
    action: BrowserAction
    target: str = ""
    value: str = ""
    sensitive: bool = False

@dataclass(frozen=True)
class BrowserPlan:
    task_id: str
    steps: tuple[BrowserStep, ...] = field(default_factory=tuple)

def validate_plan(plan: BrowserPlan) -> None:
    if not plan.task_id.strip():
        raise ValueError("task_id required")
    if not plan.steps:
        raise ValueError("browser plan cannot be empty")
    for step in plan.steps:
        if step.action in {BrowserAction.LOGIN, BrowserAction.UPLOAD, BrowserAction.DOWNLOAD} and not step.sensitive:
            raise ValueError("sensitive browser actions must be marked sensitive")

@dataclass(frozen=True)
class BrowserObservation:
    action: BrowserAction
    success: bool
    message: str = ""
    url: str = ""
    text: str = ""
    data: dict = field(default_factory=dict)

    def __getitem__(self, key: str):
        if key == "action":
            return self.action.value
        if key == "success":
            return self.success
        if key == "message":
            return self.message
        if key == "url":
            return self.url
        if key == "text":
            return self.text
        if key == "data":
            return self.data
        raise KeyError(key)
