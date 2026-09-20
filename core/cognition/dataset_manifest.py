"""Versioned manifest for reproducible cognitive datasets."""
from __future__ import annotations
import hashlib, json
from pathlib import Path

def sha256(path:str)->str:
    h=hashlib.sha256()
    with Path(path).open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""): h.update(chunk)
    return h.hexdigest()

def write_manifest(dataset_path:str,manifest_path:str,*,version:str,teacher:str,probe_count:int,accepted_count:int)->dict:
    data={"version":version,"teacher":teacher,"dataset":str(dataset_path),"sha256":sha256(dataset_path),"probe_count":probe_count,"accepted_count":accepted_count}
    Path(manifest_path).write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    return data
