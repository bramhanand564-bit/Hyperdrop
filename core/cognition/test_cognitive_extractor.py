import json
from core.cognition.cognitive_extractor import CognitiveTrajectory, build_teacher_prompt, extract_record, normalize_teacher_output, quality_score

def good():
    return {"question":"How should I investigate an unknown topic?","intent":"understand the user's actual information goal","context":"reliable explanation is needed","known":"not established","knowledge_gap":"reliable evidence","next_action":"research authoritative sources","evidence_needed":"independent supporting evidence","relevant_information":"claims directly answering the question","compression":"retain the central explanation and key evidence","self_correction":"recheck conflicts and uncertainty","response_strategy":"concise explanation"}

def test_filters_non_cognitive_payload():
    item=extract_record({**good(),"huge_fact_dump":"REMOVE","code_corpus":"REMOVE"})
    assert item and item.is_useful() and not hasattr(item,"huge_fact_dump") and quality_score(item)>=.65

def test_low_quality_is_rejected():
    assert extract_record({"question":"Q","intent":"I don't know","next_action":"none","response_strategy":"n/a"}) is None

def test_prompt_targets_reusable_thinking():
    p=build_teacher_prompt("Explain an unknown subject.")
    assert "ONLY valid JSON" in p and "fact dump" in p

def test_normalization_is_bounded_and_serializable():
    item=normalize_teacher_output("Q",{"intent":"x"*5000,"next_action":"research","response_strategy":"answer"})
    assert isinstance(item,CognitiveTrajectory) and len(item.intent)<=1200
    assert json.dumps(item.__dict__,ensure_ascii=False)
