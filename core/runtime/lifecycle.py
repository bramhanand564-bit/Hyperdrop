"""Runtime lifecycle state for Android/cloud execution."""
from enum import Enum


class RuntimeState(str, Enum):
    IDLE = "idle"
    ACTIVE = "active"
    SLEEPING = "sleeping"
    PAUSED = "paused"
    STOPPED = "stopped"


class Lifecycle:
    def __init__(self):
        self.state = RuntimeState.IDLE

    def start_task(self):
        self.state = RuntimeState.ACTIVE

    def pause(self):
        self.state = RuntimeState.PAUSED

    def sleep(self):
        self.state = RuntimeState.SLEEPING

    def stop(self):
        self.state = RuntimeState.STOPPED
