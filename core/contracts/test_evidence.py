from evidence import Evidence


def test_evidence_starts_unverified():
    item = Evidence(id="e1", task_id="t1", source="example", claim="A claim")
    assert item.verified is False
