"""Compose Hyperdrop's phone-friendly runtime services."""
from core.agent.checkpoint import CheckpointStore
from core.agent.permissions import PermissionStore
from core.agent.task_runner import TaskRunner
from core.memory.memory_manager import MemoryManager
from core.memory.store import MemoryStore
from core.runtime.config import RuntimeConfig
from core.runtime.lifecycle import Lifecycle


class HyperdropRuntime:
    def __init__(self, config: RuntimeConfig | None = None):
        self.config = config or RuntimeConfig()
        self.lifecycle = Lifecycle()
        self.permissions = PermissionStore()
        self.memory = MemoryManager(MemoryStore(self.config.memory_path))
        self.checkpoints = CheckpointStore(self.config.checkpoint_path)
        self.tasks = TaskRunner(self.checkpoints)
