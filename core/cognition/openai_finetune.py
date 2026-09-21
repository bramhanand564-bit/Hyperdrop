"""Start and monitor an OpenAI fine-tuning job without storing API keys."""
from __future__ import annotations
import argparse,json,os,time,urllib.request
from pathlib import Path

API="https://api.openai.com/v1"

def _request(url:str,key:str,method:str="GET",data:bytes|None=None,headers:dict[str,str]|None=None)->dict:
    h={"Authorization":"Bearer "+key}
    if headers: h.update(headers)
    req=urllib.request.Request(url,data=data,headers=h,method=method)
    with urllib.request.urlopen(req,timeout=120) as response:
        return json.loads(response.read().decode())

def upload_jsonl(path:str,key:str)->str:
    boundary="----HyperdropBoundary7b9d"
    content=Path(path).read_bytes()
    body=(f"--{boundary}\r\nContent-Disposition: form-data; name=\"purpose\"\r\n\r\nfine-tune\r\n"
          f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"training.jsonl\"\r\nContent-Type: application/jsonl\r\n\r\n").encode()+content+f"\r\n--{boundary}--\r\n".encode()
    data=_request(API+"/files",key,"POST",body,{"Content-Type":"multipart/form-data; boundary="+boundary})
    return str(data["id"])

def create_job(file_id:str,model:str,key:str)->str:
    payload=json.dumps({"model":model,"training_file":file_id,"method":{"type":"supervised"}}).encode()
    data=_request(API+"/fine_tuning/jobs",key,"POST",payload,{"Content-Type":"application/json"})
    return str(data["id"])

def wait_job(job_id:str,key:str,poll_seconds:int=20,timeout_seconds:int=7200)->dict:
    start=time.time()
    while time.time()-start < timeout_seconds:
        data=_request(API+"/fine_tuning/jobs/"+job_id,key)
        status=data.get("status")
        if status in {"succeeded","failed","cancelled"}: return data
        time.sleep(poll_seconds)
    raise TimeoutError("fine-tuning job did not finish before timeout")

def train(path:str,model:str|None=None,key:str|None=None)->dict:
    api_key=key or os.environ.get("OPENAI_API_KEY")
    if not api_key: raise RuntimeError("OPENAI_API_KEY is required via environment/secret; never commit it")
    base_model=model or os.environ.get("OPENAI_FINE_TUNE_MODEL","gpt-4.1-mini-2025-04-14")
    file_id=upload_jsonl(path,api_key)
    job_id=create_job(file_id,base_model,api_key)
    return wait_job(job_id,api_key)

def main()->None:
    p=argparse.ArgumentParser()
    p.add_argument("training_jsonl")
    p.add_argument("--model")
    p.add_argument("--output",default="fine_tune_result.json")
    a=p.parse_args()
    result=train(a.training_jsonl,a.model)
    Path(a.output).write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print(result.get("id"),result.get("status"),result.get("fine_tuned_model"))

if __name__=="__main__": main()
