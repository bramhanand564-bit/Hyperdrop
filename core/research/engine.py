"""Research orchestration independent of any specific search engine."""

from dataclasses import dataclass

from core.research.provider import SearchProvider, SearchResult


@dataclass(frozen=True)
class ResearchResponse:
    query: str
    results: tuple[SearchResult, ...]


class ResearchEngine:
    def __init__(self, provider: SearchProvider):
        self.provider = provider

    def run(self, query: str, limit: int = 5) -> ResearchResponse:
        clean_query = query.strip()
        if not clean_query:
            raise ValueError("research query cannot be empty")

        results = self.provider.search(clean_query, limit=limit)
        return ResearchResponse(clean_query, tuple(results))
