from core.cognition.cognitive_extractor import CognitiveTrajectory
from core.cognition.probe_engine import CognitiveProbe
from core.cognition.trajectory_evaluator import evaluate
from core.cognition.teacher_selector import select_best
from core.cognition.training_export import export_sft
import json

def probe():
    return CognitiveProbe("How should an agent verify climate claims?","verification",2,("evidence_needed","relevant_information","self_correction"))

def good():
    return CognitiveTrajectory("How should an agent verify climate claims?","verification","conflicting sources","some claims","identify missing evidence","compare primary and independent sources","source quality and dates","retain supported claims only","recheck against stronger evidence","summarize only verified points","answer with confidence and uncertainty")

def test_evaluator_accepts_cognitive_trajectory():
    result=evaluate(probe(),good())
    assert result.accepted and result.score >= .70

def test_selector_chooses_best_candidate():
    p=probe()
    weak=CognitiveTrajectory(p.question,"","","","","","","","","")
    chosen=select_best([(p,weak),(p,good())])
    assert len(chosen)==1 and chosen[0][1]==good()

def test_export_excludes_question_from_target(tmp_path):
    p=probe(); path=tmp_path/"train.jsonl"
    export_sft([(p,good(),.91)],str(path))
    row=json.loads(path.read_text())
    assert row["metadata"]["quality_score"]==.91
    assert "question" not in row["target"]
    assert "answer" not in row["target"]
