"""Extract and quality-filter structured cognitive trajectories from a teacher model."""
from __future__ import annotations
import argparse, json, re, urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

COGNITIVE_FIELDS=("intent","context","known","knowledge_gap","next_action","evidence_needed","relevant_information","compression","self_correction","response_strategy")
GENERIC_BAD={"i don't know","unknown","n/a","none","not applicable"}

@dataclass(frozen=True)
class CognitiveTrajectory:
    question:str; intent:str=""; context:str=""; known:str=""; knowledge_gap:str=""; next_action:str=""; evidence_needed:str=""; relevant_information:str=""; compression:str=""; self_correction:str=""; response_strategy:str=""
    def is_useful(self)->bool:
        return all(bool(str(x).strip()) for x in (self.question,self.intent,self.next_action,self.response_strategy))

def _clean(value:Any,limit:int=1200)->str:
    return re.sub(r"\s+"," ",str(value or "")).strip()[:limit]

def _extract_json(text:str)->dict[str,Any]:
    try:
        value=json.loads(text.strip()); return value if isinstance(value,dict) else {}
    except json.JSONDecodeError: pass
    match=re.search(r"\{.*\}",text,re.DOTALL)
    if not match:return {}
    try:
        value=json.loads(match.group(0)); return value if isinstance(value,dict) else {}
    except json.JSONDecodeError:return {}

def normalize_teacher_output(question:str,payload:dict[str,Any])->CognitiveTrajectory:
    return CognitiveTrajectory(question=_clean(question),**{f:_clean(payload.get(f)) for f in COGNITIVE_FIELDS})

def quality_score(item:CognitiveTrajectory)->float:
    if not item.is_useful(): return 0.0
    vals=[getattr(item,f) for f in COGNITIVE_FIELDS]
    filled=sum(bool(v) and v.lower() not in GENERIC_BAD for v in vals)/len(vals)
    diversity=len(set(v.lower() for v in vals if v))/max(1,len([v for v in vals if v]))
    return round(min(1.0,0.75*filled+0.25*diversity),3)

def extract_record(record:dict[str,Any],min_score:float=0.65)->CognitiveTrajectory|None:
    question=record.get("question") or record.get("prompt") or record.get("input")
    payload=record.get("cognition") or record.get("trajectory") or record
    if not question or not isinstance(payload,dict): return None
    item=normalize_teacher_output(question,payload)
    return item if quality_score(item)>=min_score else None

def build_teacher_prompt(question:str)->str:
    return ("Analyze the user's question as a cognitive teacher. Do not solve it with a long factual answer. "
            "Return ONLY valid JSON with these fields: "+", ".join(COGNITIVE_FIELDS)+". "
            "Describe the reusable thinking process, not a fact dump or code solution. Keep each field concise. question="+question)

def call_teacher(endpoint:str,model:str,question:str,timeout:int=60)->dict[str,Any]:
    body=json.dumps({"model":model,"messages":[{"role":"user","content":build_teacher_prompt(question)}],"temperature":0}).encode()
    req=urllib.request.Request(endpoint,data=body,headers={"Content-Type":"application/json"},method="POST")
    with urllib.request.urlopen(req,timeout=timeout) as response:data=json.loads(response.read().decode())
    return _extract_json(data["choices"][0]["message"]["content"])

def extract_jsonl(input_path:str,output_path:str,endpoint:str|None=None,model:str|None=None,min_score:float=0.65)->int:
    accepted=0; out=Path(output_path); out.parent.mkdir(parents=True,exist_ok=True)
    with Path(input_path).open(encoding="utf-8") as source,out.open("w",encoding="utf-8") as sink:
        for line in source:
            if not line.strip():continue
            record=json.loads(line); question=record.get("question") or record.get("prompt") or record.get("input")
            if not question:continue
            if endpoint and model:item=normalize_teacher_output(question,call_teacher(endpoint,model,question))
            else:item=extract_record(record,min_score)
            if item is None:continue
            sink.write(json.dumps({**asdict(item),"quality_score":quality_score(item)},ensure_ascii=False)+"\n"); accepted+=1
    return accepted

def main()->None:
    p=argparse.ArgumentParser(); p.add_argument("--input",required=True); p.add_argument("--output",required=True); p.add_argument("--endpoint"); p.add_argument("--model"); p.add_argument("--min-score",type=float,default=.65); a=p.parse_args()
    if bool(a.endpoint)!=bool(a.model):p.error("--endpoint and --model must be supplied together")
    print(extract_jsonl(a.input,a.output,a.endpoint,a.model,a.min_score))
if __name__=="__main__":main()
