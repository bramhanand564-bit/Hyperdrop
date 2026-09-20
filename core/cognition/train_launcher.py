"""Dependency-light launcher for a reproducible external SFT/LoRA backend."""
from __future__ import annotations
import argparse, subprocess, sys
from .train_config import load_config

def build_command(config_path:str)->list[str]:
    config=load_config(config_path)
    return [sys.executable,"-m","core.cognition.hf_train",config_path]

def launch(config_path:str)->int:
    command=build_command(config_path)
    return subprocess.run(command,check=False).returncode

def main()->None:
    p=argparse.ArgumentParser(); p.add_argument("config"); a=p.parse_args()
    raise SystemExit(launch(a.config))
if __name__=="__main__": main()
