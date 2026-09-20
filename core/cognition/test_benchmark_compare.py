from core.cognition.benchmark_compare import compare

def test_compare_calculates_deltas():
    result=compare(.40,.60,.45,.70)
    assert result.delta_pass_rate==.20 and result.delta_average_score==.25
