"""Batch-run cognitive probes against an OpenAI-compatible teacher endpoint."""
from __future__ import annotations
import json, time, urllib.request
from pathlib import Path
from .cognitive_extractor import build_teacher_prompt, _extract_json, normalize_teacher_output

def run_batch(input_path:str, output_path:str, endpoint:str, model:str, timeout:int=60, delay:float=0.0)->int:
    count=0; out=Path(output_path); out.parent.mkdir(parents=True,exist_ok=True)
    with Path(input_path).open(encoding="utf-8") as source,out.open("w",encoding="utf-8") as sink:
        for line in source:
            if not line.strip(): continue
            probe=json.loads(line); question=probe["question"]
            body=json.dumps({"model":model,"messages":[{"role":"user","content":build_teacher_prompt(question)}],"temperature":0}).encode()
            req=urllib.request.Request(endpoint,data=body,headers={"Content-Type":"application/json"},method="POST")
            with urllib.request.urlopen(req,timeout=timeout) as response:data=json.loads(response.read().decode())
            item=normalize_teacher_output(question,_extract_json(data["choices"][0]["message"]["content"]))
            sink.write(json.dumps({"probe":probe,"trajectory":item.__dict__},ensure_ascii=False)+"\n"); count+=1
            if delay: time.sleep(delay)
    return count
