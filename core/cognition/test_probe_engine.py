from core.cognition.probe_engine import generate, write_jsonl

def test_generate_covers_core_cognitive_categories():
    probes=generate(["quantum computing"],per_category=1)
    assert len(probes)==6
    assert {p.category for p in probes}=={"knowledge_gap","compression","decision","verification","self_correction","intent"}

def test_generation_is_deterministic():
    assert generate(["x"],2,11)==generate(["x"],2,11)

def test_jsonl_writer(tmp_path):
    path=tmp_path/"probes.jsonl"
    assert write_jsonl(generate(["x"],1),str(path))==6
    assert path.read_text(encoding="utf-8").count("\\n")==6
