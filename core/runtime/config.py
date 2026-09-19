"""Small runtime configuration suitable for a phone-first prototype."""
from dataclasses import dataclass


@dataclass(frozen=True)
class RuntimeConfig:
    provider: str = "brave"
    memory_path: str = "data/memory.json"\n    memory_backend: str = "json"
    checkpoint_path: str = "data/checkpoints.json"
    max_research_results: int = 5
    max_page_chars: int = 12000
    idle_timeout_seconds: int = 300
