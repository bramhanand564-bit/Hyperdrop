"""Runtime configuration for selectable search providers."""
from dataclasses import dataclass


@dataclass(frozen=True)
class SearchConfig:
    provider: str = "brave"
    limit: int = 5
    country: str = "IN"
    language: str = "en"
