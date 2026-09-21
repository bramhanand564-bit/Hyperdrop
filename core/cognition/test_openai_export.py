import json
from core.cognition.openai_export import convert

def test_convert_to_chat_format(tmp_path):
    src=tmp_path/"sft.jsonl"; dst=tmp_path/"openai.jsonl"
    src.write_text(json.dumps({"instruction":"How should an agent verify claims?","target":{"next_action":"compare sources"}})+"\n")
    assert convert(str(src),str(dst))==1
    row=json.loads(dst.read_text())
    assert [m["role"] for m in row["messages"]]==["system","user","assistant"]
    assert "fact" not in row["messages"][0]["content"].lower()
