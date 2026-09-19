import pytest
from core.agent.browser_http import PublicHttpProvider

def test_http_provider_rejects_non_http():
    with pytest.raises(ValueError):
        PublicHttpProvider().fetch("file:///etc/passwd")
