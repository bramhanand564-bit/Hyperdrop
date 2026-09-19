"""Boundary for credentials: secrets never belong in task arguments."""
from dataclasses import dataclass

@dataclass(frozen=True)
class CredentialRef:
    provider: str
    key: str

def reject_inline_secret(arguments: dict) -> None:
    secret_keys={"password","passwd","token","api_key","secret","otp","code"}
    leaked=secret_keys.intersection(arguments)
    if leaked:
        raise ValueError("inline credentials are forbidden; use a secure credential provider")
