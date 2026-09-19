from core.runtime.lifecycle import Lifecycle, RuntimeState


def test_lifecycle_states():
    runtime = Lifecycle()
    assert runtime.state == RuntimeState.IDLE
    runtime.start_task()
    assert runtime.state == RuntimeState.ACTIVE
    runtime.pause()
    assert runtime.state == RuntimeState.PAUSED
