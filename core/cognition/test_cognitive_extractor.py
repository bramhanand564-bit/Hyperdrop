import json

from core.cognition.cognitive_extractor import (
    CognitiveTrajectory,
    build_teacher_prompt,
    extract_record,
    normalize_teacher_output,
)


def test_extract_record_keeps_cognitive_fields_only():
    item = extract_record({
        "question": "How should I investigate this unknown topic?",
        "intent": "understand the topic",
        "context": "user needs a reliable explanation",
        "known": "not established",
        "knowledge_gap": "reliable facts",
        "next_action": "research authoritative sources",
        "evidence_needed": "independent supporting sources",
        "relevant_information": "claims directly answering the question",
        "compression": "retain the central explanation and key evidence",
        "self_correction": "recheck conflicting evidence",
        "response_strategy": "concise explanation",
        "huge_fact_dump": "REMOVE ME",
        "code_corpus": "REMOVE ME",
    })
    assert item is not None
    assert item.is_useful()
    assert not hasattr(item, "huge_fact_dump")


def test_incomplete_teacher_record_is_rejected():
    assert extract_record({
        "question": "What should I do?",
        "intent": "",
        "next_action": "research",
        "response_strategy": "answer",
    }) is None


def test_prompt_requests_structured_cognition_not_answer_dump():
    prompt = build_teacher_prompt("Explain an unknown subject.")
    assert "ONLY valid JSON" in prompt
    assert "long factual answer" in prompt


def test_normalize_bounds_text():
    item = normalize_teacher_output("Q", {"intent": "x" * 5000, "next_action": "research", "response_strategy": "short"})
    assert isinstance(item, CognitiveTrajectory)
    assert len(item.intent) <= 1200


def test_output_is_json_serializable():
    item = normalize_teacher_output(
        "Q",
        {"intent": "understand", "next_action": "research", "response_strategy": "answer"},
    )
    assert json.dumps(item.__dict__, ensure_ascii=False)
