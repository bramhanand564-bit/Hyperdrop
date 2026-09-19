from core.mind.response_policy import ResponsePolicy


def test_default_policy_does_not_make_user_wait():
    policy = ResponsePolicy()
    assert policy.pre_research_message("meaning") == ""


def test_optional_research_acknowledgement():
    policy = ResponsePolicy(acknowledge_research=True)
    assert "चेक" in policy.pre_research_message("meaning")


def test_empty_result_is_honest():
    assert "जानकारी नहीं मिली" in ResponsePolicy().no_result_message()
