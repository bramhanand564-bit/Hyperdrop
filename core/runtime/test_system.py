from core.runtime.system import HyperdropRuntime


def test_runtime_composes_services(tmp_path):
    runtime = HyperdropRuntime(runtime_config := None)
    assert runtime.memory is not None
    assert runtime.tasks is not None
    assert runtime.permissions.allowed("browser") is False
