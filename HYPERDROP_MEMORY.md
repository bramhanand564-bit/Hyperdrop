# Hyperdrop — Project Memory (Short Form)

## STATUS
- Repo: bramhanand564-bit/Hyperdrop
- Branch: main
- Cognitive Core V0.5 is now a complete engineering pipeline through training/benchmark contracts: open-source teacher → cognitive probes → extraction/quality gate → trajectory evaluation → best-of-N → dedup → leakage-safe split → cognitive-only training export → optional SFT/LoRA launcher → held-out benchmark.
- Actual teacher-generated dataset, model training, adapter artifact, and held-out measurements still require an execution environment/model; do not claim those artifacts until observed.
- Every major Android push must still be checked for GitHub Actions/APK status. Current latest cognitive commit has not yet produced an observable workflow run through the available GitHub API.

## CORE IDEA
Hyperdrop should learn reusable Buddhi-like control behavior rather than copy a teacher's general knowledge, coding corpus, or long factual answers. Literal weight/neuron extraction is not assumed possible; behavioral distillation is the engineering route.

## COGNITIVE LOOP
Understand → intent/context → knowledge gap → next action → evidence → relevance → compression → self-correction → calibrated response → lesson/memory.

## COGNITIVE CORE IMPLEMENTED
- Structured trajectory extractor + quality gate.
- Six-category deterministic probe curriculum.
- Teacher batch runner for OpenAI-compatible local/open-source models.
- Trajectory evaluator and best-of-N selector.
- Near-duplicate filtering.
- Deterministic train/eval split and exact leakage guard.
- Cognitive-only SFT JSONL export.
- Reproducible train configuration and optional Hugging Face SFT/LoRA backend.
- Held-out cognitive benchmark + baseline/distilled metric comparison.
- Dedicated Cognitive Core GitHub Actions workflow running pytest -q core/cognition.

## 100% GATE
Code/pipeline readiness is complete. Empirical 100% requires:
1. Run probes through an actual open-source teacher.
2. Produce and inspect accepted dataset + manifest.
3. Create train/eval splits with zero exact overlap.
4. Train a small cognitive adapter/model.
5. Run held-out benchmark before/after training.
6. Preserve model/adaptor artifact and benchmark metrics.

## DESIGN RULE
Research and teacher inference are internal. The user should receive the useful result directly when possible; do not narrate unnecessary waiting/research.

## CONTROL
Sensitive actions require confirmation/handoff; credentials never go in tool arguments; OTP/2FA stays user-controlled; kill switch/checkpoints/audit trail remain required.


- 2026-09-21: User chose to drop the local-model dependency for the Cognitive Core training path. Added a curated 24-example cognitive seed dataset, OpenAI chat-format exporter, OpenAI fine-tuning launcher, and manual GitHub Actions workflow. The current design uses an OpenAI model as the training/teacher path; API keys are never committed. Actual fine-tuning still requires a connected OpenAI API secret and a supported fine-tunable base model, so no trained model artifact is claimed yet.