"""Brave Search API adapter.

Uses Python's standard library so the Android prototype does not need a heavy
HTTP dependency. The API key is supplied at runtime via constructor or
BRAVE_SEARCH_API_KEY environment variable.
"""
import json
import os
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from core.research.provider import SearchResult


class BraveSearchProvider:
    def __init__(self, api_key: str | None = None, *, country: str = "IN", search_lang: str = "en"):
        self.api_key = api_key or os.getenv("BRAVE_SEARCH_API_KEY")
        self.country = country
        self.search_lang = search_lang

    def search(self, query: str, limit: int = 5) -> list[SearchResult]:
        if not self.api_key:
            raise RuntimeError("BRAVE_SEARCH_API_KEY is not configured")
        if not query.strip():
            raise ValueError("query cannot be empty")

        params = urlencode({
            "q": query.strip(),
            "count": max(1, min(limit, 20)),
            "country": self.country,
            "search_lang": self.search_lang,
        })
        request = Request(
            f"https://api.search.brave.com/res/v1/web/search?{params}",
            headers={
                "Accept": "application/json",
                "X-Subscription-Token": self.api_key,
            },
        )
        with urlopen(request, timeout=15) as response:
            payload = json.load(response)

        results = payload.get("web", {}).get("results", [])
        return [
            SearchResult(
                title=item.get("title", ""),
                url=item.get("url", ""),
                snippet=item.get("description", ""),
            )
            for item in results
            if item.get("url")
        ]
