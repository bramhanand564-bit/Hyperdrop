from core.runtime.health import snapshot
from core.runtime.system import HyperdropRuntime


def test_health_snapshot():
    health = snapshot(HyperdropRuntime())
    assert health.memory_available is True
    assert health.checkpoints_available is True
