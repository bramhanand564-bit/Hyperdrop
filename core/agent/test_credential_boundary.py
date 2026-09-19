import pytest
from core.agent.credential_boundary import reject_inline_secret

def test_inline_secret_is_rejected():
    with pytest.raises(ValueError):
        reject_inline_secret({"password":"secret"})
