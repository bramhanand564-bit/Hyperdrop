from core.runtime.metrics import RuntimeMetrics

def test_metrics_completion_rate():
    m=RuntimeMetrics(); m.record_start(); m.record_complete(); assert m.completion_rate == 1.0
