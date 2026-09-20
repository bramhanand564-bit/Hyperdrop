"""Compare held-out cognitive benchmark results without declaring a model winner."""
from __future__ import annotations
from dataclasses import dataclass

@dataclass(frozen=True)
class BenchmarkComparison:
    baseline_pass_rate: float
    distilled_pass_rate: float
    baseline_average_score: float
    distilled_average_score: float
    delta_pass_rate: float
    delta_average_score: float

def compare(baseline_pass_rate:float, distilled_pass_rate:float, baseline_average_score:float, distilled_average_score:float)->BenchmarkComparison:
    return BenchmarkComparison(baseline_pass_rate,distilled_pass_rate,baseline_average_score,distilled_average_score,round(distilled_pass_rate-baseline_pass_rate,3),round(distilled_average_score-baseline_average_score,3))
