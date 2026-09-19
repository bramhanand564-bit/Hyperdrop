"""Search-provider interface for HyperResearch V0.1."""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class SearchResult:
    title: str
    url: str
    snippet: str = ""


class SearchProvider(Protocol):
    def search(self, query: str, limit: int = 5) -> list[SearchResult]:
        ...


class NoOpSearchProvider:
    """Safe default until a real provider is connected."""

    def search(self, query: str, limit: int = 5) -> list[SearchResult]:
        return []
