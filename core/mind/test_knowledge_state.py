from knowledge_state import KnowledgeState, should_research


def test_unknown_requires_research():
    assert should_research(KnowledgeState.UNKNOWN)


def test_uncertain_requires_research():
    assert should_research(KnowledgeState.UNCERTAIN)


def test_conflicting_requires_research():
    assert should_research(KnowledgeState.CONFLICTING)


def test_known_does_not_require_research():
    assert not should_research(KnowledgeState.KNOWN)


def test_user_can_explicitly_request_research():
    assert should_research(KnowledgeState.KNOWN, explicit_request=True)
