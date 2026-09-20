"""Training contract for a future cognitive SFT/LoRA run."""
from __future__ import annotations
from dataclasses import asdict, dataclass
import json
from pathlib import Path

@dataclass(frozen=True)
class CognitiveTrainConfig:
    base_model: str
    train_path: str
    eval_path: str
    output_dir: str
    method: str = "lora"
    epochs: int = 2
    learning_rate: float = 2e-5
    batch_size: int = 2
    max_length: int = 1024
    seed: int = 7

    def validate(self)->None:
        if self.method not in {"sft","lora"}: raise ValueError("method must be sft or lora")
        if self.epochs < 1 or self.batch_size < 1 or self.max_length < 128: raise ValueError("invalid training hyperparameters")
        if self.learning_rate <= 0: raise ValueError("learning_rate must be positive")

def write_config(config:CognitiveTrainConfig,path:str)->None:
    config.validate()
    Path(path).write_text(json.dumps(asdict(config),indent=2)+"\n",encoding="utf-8")

def load_config(path:str)->CognitiveTrainConfig:
    data=json.loads(Path(path).read_text(encoding="utf-8"))
    config=CognitiveTrainConfig(**data); config.validate(); return config
