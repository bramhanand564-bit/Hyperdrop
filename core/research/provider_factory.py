"""Create a search provider without coupling HyperMind to a vendor."""
from core.research.brave_provider import BraveSearchProvider
from core.research.provider import NoOpSearchProvider


def create_search_provider(provider: str = "brave"):
    if provider == "brave":
        return BraveSearchProvider()
    if provider == "noop":
        return NoOpSearchProvider()
    raise ValueError(f"unsupported search provider: {provider}")
