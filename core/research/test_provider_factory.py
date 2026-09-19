import pytest
from core.research.provider_factory import create_search_provider


def test_noop_provider_factory():
    assert create_search_provider("noop").search("x") == []


def test_unknown_provider_rejected():
    with pytest.raises(ValueError):
        create_search_provider("missing")
