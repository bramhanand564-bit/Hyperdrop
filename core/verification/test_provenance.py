from core.contracts.evidence import Evidence
from core.verification.verifier import verify_evidence


def test_primary_source_gets_provenance_boost():
    item = Evidence(
        id="1",
        task_id="t",
        source="https://example.gov/fact",
        claim="A fact",
        reliability=0.65,
    )
    verified = verify_evidence(item)
    assert verified.reliability == 0.75
    assert verified.verified is True


def test_invalid_reliability_is_not_verified():
    item = Evidence(
        id="1",
        task_id="t",
        source="https://example.com",
        claim="A fact",
        reliability=1.5,
    )
    assert verify_evidence(item).verified is False
