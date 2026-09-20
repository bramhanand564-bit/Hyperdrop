import json
from core.cognition.dataset_split import split_records,category_counts
from core.cognition.train_config import CognitiveTrainConfig
from core.cognition.benchmark import run_benchmark
from core.cognition.probe_engine import CognitiveProbe

def record(i):
    return {"instruction":f"question {i}","target":{"intent":"understand","next_action":"check","response_strategy":"summarize"},"metadata":{"category":"intent"}}

def test_split_is_deterministic_and_nonempty():
    rows=[record(i) for i in range(12)]
    a,b=split_records(rows,.25); c,d=split_records(rows,.25)
    assert a==c and b==d and a and b

def test_category_counts():
    assert category_counts([record(1),record(2)])=={"intent":2}

def test_train_config_validation():
    CognitiveTrainConfig("model","train.jsonl","eval.jsonl","out").validate()

def test_benchmark_scores_structured_prediction():
    probe=CognitiveProbe("How should an agent verify evidence?","verification",2,("evidence_needed","self_correction"))
    def predictor(_):
        return {"intent":"verify","context":"uncertain","known":"partial","knowledge_gap":"evidence","next_action":"compare sources","evidence_needed":"independent primary sources","relevant_information":"supported claims","compression":"keep key findings","self_correction":"recheck conflicts","response_strategy":"state evidence and uncertainty"}
    result=run_benchmark([probe],predictor)
    assert result.total==1 and result.passed==1 and result.pass_rate==1.0
