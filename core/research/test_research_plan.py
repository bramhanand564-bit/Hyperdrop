from research_plan import build_plan


def test_research_plan_contains_goal_query():
    plan = build_plan("t1", "meaning of a word")
    assert plan.task_id == "t1"
    assert plan.steps[0].query == "meaning of a word"
