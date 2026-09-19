from core.contracts.evidence import Evidence
from core.verification.verifier import verify_evidence


def test_reliable_evidence_can_be_verified():
    item = Evidence(
        id="e1",
        task_id="t1",
        source="official.example",
        claim="A claim",
        reliability=0.9,
    )
    assert verify_evidence(item).verified is True


def test_weak_evidence_is_not_verified():
    item = Evidence(
        id="e2",
        task_id="t1",
        source="unknown.example",
        claim="A claim",
        reliability=0.3,
    )
    assert verify_evidence(item).verified is False
