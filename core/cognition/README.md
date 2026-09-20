# Cognitive Extraction Tool

Cognitive Extraction is a teacher-model distillation utility for Hyperdrop's Buddhi/Core work.

It does **not** claim to physically separate reasoning neurons from an LLM. Instead it extracts structured cognitive trajectories from an open-source teacher model through an OpenAI-compatible chat endpoint.

Target signals:
- intent understanding
- context interpretation
- knowledge-gap detection
- next-action selection
- evidence requirements
- information selection
- compression/synthesis
- self-correction
- response strategy

It deliberately supports payload filtering so factual/code-heavy answer content can be excluded from the training dataset.

## CLI

```bash
python -m core.cognition.cognitive_extractor --input examples.jsonl --output cognitive.jsonl
```

For a live teacher endpoint:

```bash
python -m core.cognition.cognitive_extractor \
  --input examples.jsonl \
  --output cognitive.jsonl \
  --endpoint http://localhost:11434/v1/chat/completions \
  --model <model-name>
```

The tool emits one JSON object per accepted trajectory and never stores API keys in the dataset.

## Quality filtering
Each trajectory receives a deterministic quality score. Records with missing core cognition or generic non-answers are rejected. The emitted JSONL contains only the cognitive schema plus `quality_score`, so factual/code-heavy teacher payload fields are discarded.
