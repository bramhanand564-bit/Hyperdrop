# Cognitive Core

Hyperdrop's Cognitive Core (Buddhi) is a behavioral-distillation pipeline. It does not claim that reasoning neurons or a clean intelligence layer can be physically separated from an LLM. Instead, an open-source teacher generates reusable cognitive trajectories that are filtered, evaluated, deduplicated, split, and exported for later training.

## Target capability

The core is trained around the reusable sequence:

Understand intent/context → detect knowledge gap → choose next action → gather/compare evidence → select relevant information → compress/summarize → self-correct → respond with calibrated uncertainty.

The dataset intentionally avoids copying long factual answers, coding solutions, credentials, or unrelated teacher knowledge into the cognitive target.

## Pipeline

probes → teacher batch → extraction/quality gate → trajectory evaluation → best-of-N selection → deduplication → train/eval split → leakage guard → SFT/LoRA export → held-out benchmark → manifest

## Current modules

- cognitive_extractor.py: structured teacher trajectory extraction and deterministic quality filtering.
- probe_engine.py: six-category probe curriculum.
- teacher_batch.py: OpenAI-compatible teacher batching.
- trajectory_evaluator.py: coverage, probe alignment, action, correction and compression scoring.
- teacher_selector.py: best-of-N selection per probe.
- deduplicator.py: deterministic near-duplicate removal.
- dataset_split.py: deterministic train/eval partitioning.
- dataset_guard.py: exact train/eval leakage check.
- training_export.py: cognitive-only SFT-style JSONL.
- train_config.py: reproducible SFT/LoRA configuration contract.
- train_launcher.py + hf_train.py: optional Hugging Face training backend.
- benchmark.py: held-out cognitive benchmark runner.
- benchmark_compare.py: baseline-vs-distilled metric comparison without hard-coding a winner.
- dataset_manifest.py: SHA-256 and reproducibility metadata.

## Training

The core repository remains dependency-light. The optional training backend requires transformers, datasets, peft, and accelerate in the execution environment. No model weights or API keys are stored in GitHub by this pipeline.

Example configuration fields:

base_model, train_path, eval_path, output_dir, method, epochs, learning_rate, batch_size, max_length, seed.

A real training run is considered complete only after the model/adaptor artifact is produced and the held-out benchmark is executed.