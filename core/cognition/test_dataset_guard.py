from core.cognition.dataset_guard import validate_train_eval

def test_guard_rejects_exact_leakage():
    ok,reasons=validate_train_eval([{"instruction":"same"}],[{"instruction":"same"}])
    assert not ok and "train_eval_exact_overlap" in reasons

def test_guard_accepts_clean_split():
    ok,reasons=validate_train_eval([{"instruction":"train"}],[{"instruction":"eval"}])
    assert ok and not reasons
