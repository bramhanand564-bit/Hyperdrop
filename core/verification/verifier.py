"""Transparent V0.1 evidence verifier.

Reliability is intentionally explicit. Search discovery alone never marks a
claim verified. Primary-source URLs receive a small provenance boost; the
system still requires a caller-supplied reliability score.
"""
from dataclasses import replace
from urllib.parse import urlparse

from core.contracts.evidence import Evidence


PRIMARY_HINTS = (".gov", ".edu", "who.int", "un.org", "python.org", "wikipedia.org")


def _provenance_boost(source: str) -> float:
    host = urlparse(source).netloc.lower()
    return 0.1 if any(hint in host for hint in PRIMARY_HINTS) else 0.0


def verify_evidence(evidence: Evidence) -> Evidence:
    reliable = 0.0 <= evidence.reliability <= 1.0
    nonempty = bool(evidence.source.strip()) and bool(evidence.claim.strip())
    score = min(1.0, evidence.reliability + _provenance_boost(evidence.source))
    return replace(
        evidence,
        reliability=score,
        verified=nonempty and reliable and score >= 0.7,
    )
