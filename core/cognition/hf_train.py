"""Optional Hugging Face training backend; kept separate from the dependency-light core."""
from __future__ import annotations
import argparse, json
from pathlib import Path
from .train_config import load_config

def train(config_path:str)->None:
    config=load_config(config_path)
    try:
        from datasets import load_dataset
        from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer
    except ImportError as exc:
        raise RuntimeError("Install optional training dependencies: transformers datasets peft accelerate") from exc
    data=load_dataset("json",data_files={"train":config.train_path,"eval":config.eval_path})
    tokenizer=AutoTokenizer.from_pretrained(config.base_model)
    if tokenizer.pad_token is None: tokenizer.pad_token=tokenizer.eos_token
    model=AutoModelForCausalLM.from_pretrained(config.base_model)
    def tokenize(batch):
        texts=[f"Instruction: {x}\nCognitive target: {y}" for x,y in zip(batch["instruction"],[json.dumps(t,ensure_ascii=False) for t in batch["target"]])]
        return tokenizer(texts,truncation=True,max_length=config.max_length)
    tokenized=data.map(tokenize,batched=True)
    args=TrainingArguments(output_dir=config.output_dir,num_train_epochs=config.epochs,learning_rate=config.learning_rate,per_device_train_batch_size=config.batch_size,seed=config.seed,evaluation_strategy="epoch",save_strategy="epoch",report_to=[])
    trainer=Trainer(model=model,args=args,train_dataset=tokenized["train"],eval_dataset=tokenized["eval"],tokenizer=tokenizer)
    trainer.train()
    trainer.save_model(config.output_dir)
if __name__=="__main__":
    parser=argparse.ArgumentParser(); parser.add_argument("config"); train(parser.parse_args().config)
