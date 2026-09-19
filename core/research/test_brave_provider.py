import json

from core.research.brave_provider import BraveSearchProvider


class FakeResponse:
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass
    def read(self):
        return json.dumps({"web": {"results": [
            {"title": "Example", "url": "https://example.com", "description": "A result"}
        ]}}).encode()


def test_brave_provider_parses_results(monkeypatch):
    monkeypatch.setattr("core.research.brave_provider.urlopen", lambda *a, **k: FakeResponse())
    provider = BraveSearchProvider("key")
    results = provider.search("hello", limit=1)
    assert results[0].title == "Example"
