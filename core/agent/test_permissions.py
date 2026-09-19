from core.agent.permissions import PermissionStore


def test_permissions_default_deny():
    store = PermissionStore()
    assert store.allowed("browser") is False
    store.set("browser", True, "user granted")
    assert store.allowed("browser") is True
