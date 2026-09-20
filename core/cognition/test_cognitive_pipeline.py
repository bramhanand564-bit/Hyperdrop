import json
from core.cognition.probe_engine import generate
from core.cognition.curriculum import coverage, curriculum

def test_curriculum_and_coverage():
    probes=generate(["x","y"],1)
    levels=curriculum(probes)
    assert set(levels)=={1,2,3}
    assert sum(coverage(probes).values())==len(probes)

def test_manifest_hash(tmp_path):
    from core.cognition.dataset_manifest import write_manifest
    dataset=tmp_path/"d.jsonl"; dataset.write_text('{"x":1}\n',encoding="utf-8")
    manifest=tmp_path/"manifest.json"
    result=write_manifest(str(dataset),str(manifest),version="0.1",teacher="test",probe_count=1,accepted_count=1)
    assert result["sha256"] and json.loads(manifest.read_text())["version"]=="0.1"
