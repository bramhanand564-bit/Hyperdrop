"""Convert cognitive SFT JSONL to OpenAI chat fine-tuning JSONL."""
from __future__ import annotations
import json
from pathlib import Path

SYSTEM = (
    "You are the Hyperdrop Cognitive Core. "
    "Return only a compact, reusable cognitive control structure. "
    "Focus on understanding intent, knowledge gaps, next action, evidence, relevance, compression, self-correction and response strategy; "
    "do not reproduce long factual answers or code."
)

def convert(input_path: str, output_path: str) -> int:
    src=Path(input_path); dst=Path(output_path)
    dst.parent.mkdir(parents=True,exist_ok=True)
    count=0
    with src.open(encoding="utf-8") as source, dst.open("w",encoding="utf-8") as out:
        for line in source:
            if not line.strip(): continue
            row=json.loads(line)
            record={
                "messages":[
                    {"role":"system","content":SYSTEM},
                    {"role":"user","content":str(row["instruction"])},
                    {"role":"assistant","content":json.dumps(row["target"],ensure_ascii=False,separators=(",",":"))},
                ]
            }
            out.write(json.dumps(record,ensure_ascii=False,separators=(",",":"))+"\n")
            count+=1
    return count
