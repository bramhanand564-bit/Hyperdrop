import json
from core.agent.audit import AuditLog

def test_audit_appends_event(tmp_path):
    log=AuditLog(str(tmp_path/"audit.jsonl"))
    log.record("tool_called",tool="search",task_id="t1")
    row=json.loads((tmp_path/"audit.jsonl").read_text())
    assert row["event"]=="tool_called"
    assert row["tool"]=="search"
