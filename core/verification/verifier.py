"""Small V0.1 evidence verifier.

V0.1 does not pretend that source reliability can be fully automated.
It only applies transparent, testable checks.
"""

from core.contracts.evidence import Evidence


def verify_evidence(evidence: Evidence) -> Evidence:
    reliable = 0.0 <= evidence.reliability <= 1.0
    nonempty = bool(evidence.source.strip()) and bool(evidence.claim.strip())
    return Evidence(
        id=evidence.id,
        task_id=evidence.task_id,
        source=evidence.source,
        claim=evidence.claim,
        note=evidence.note,
        source_type=evidence.source_type,
        reliability=evidence.reliability,
        verified=reliable and nonempty and evidence.reliability >= 0.7,
    )
