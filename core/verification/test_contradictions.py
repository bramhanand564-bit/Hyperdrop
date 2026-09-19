from core.contracts.evidence import Evidence
from core.verification.contradictions import detect_contradictions


def test_similar_verified_claims_are_flagged_for_review():
    items = [
        Evidence("1","t","https://a.gov","Python was created in 1991 by Guido",reliability=.9,verified=True),
        Evidence("2","t","https://b.edu","Python was created in 1991 by Guido van Rossum",reliability=.9,verified=True),
    ]
    report = detect_contradictions(items)
    assert report.conflicting is True


def test_single_source_has_no_conflict():
    item = Evidence("1","t","https://a.gov","Python was created in 1991",reliability=.9,verified=True)
    assert detect_contradictions([item]).conflicting is False
