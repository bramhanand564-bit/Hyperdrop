"""V0.1 tests for HyperMind's knowledge-gap decision."""

from decision import Decision, DecisionInput, choose_action


def test_research_for_current_information():
    result = choose_action(DecisionInput(current_information_needed=True))
    assert result.decision == Decision.RESEARCH


def test_research_when_knowledge_is_missing():
    result = choose_action(DecisionInput(trusted_knowledge_available=False))
    assert result.decision == Decision.RESEARCH


def test_research_when_confidence_is_low():
    result = choose_action(DecisionInput(confidence=0.4, required_confidence=0.7))
    assert result.decision == Decision.RESEARCH


def test_answer_when_knowledge_is_sufficient():
    result = choose_action(DecisionInput())
    assert result.decision == Decision.ANSWER
