"""Minimal runtime health snapshot."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Health:
    lifecycle: str
    memory_available: bool
    checkpoints_available: bool
    tools_registered: int


def snapshot(runtime) -> Health:
    return Health(
        lifecycle=runtime.lifecycle.state.value,
        memory_available=runtime.memory is not None,
        checkpoints_available=runtime.checkpoints is not None,
        tools_registered=0,
    )
