"""Extract structured cognitive trajectories from an open-model teacher.

This is behavioral distillation, not physical weight/neuron extraction.
The extractor can operate on pre-generated teacher JSONL or call an
OpenAI-compatible chat-completions endpoint.
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


COGNITIVE_FIELDS = (
    "intent",
    "context",
    "known",
    "knowledge_gap",
    "next_action",
    "evidence_needed",
    "relevant_information",
    "compression",
    "self_correction",
    "response_strategy",
)


@dataclass(frozen=True)
class CognitiveTrajectory:
    question: str
    intent: str = ""
    context: str = ""
    known: str = ""
    knowledge_gap: str = ""
    next_action: str = ""
    evidence_needed: str = ""
    relevant_information: str = ""
    compression: str = ""
    self_correction: str = ""
    response_strategy: str = ""

    def is_useful(self) -> bool:
        required = (self.question, self.intent, self.next_action, self.response_strategy)
        return all(bool(str(x).strip()) for x in required)


def _clean(value: Any, limit: int = 1200) -> str:
    value = re.sub(r"\\s+", " ", str(value or "")).strip()
    return value[:limit]


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        value = json.loads(text)
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return {}
        try:
            value = json.loads(match.group(0))
            return value if isinstance(value, dict) else {}
        except json.JSONDecodeError:
            return {}


def normalize_teacher_output(question: str, payload: dict[str, Any]) -> CognitiveTrajectory:
    values = {field: _clean(payload.get(field)) for field in COGNITIVE_FIELDS}
    return CognitiveTrajectory(question=_clean(question), **values)


def extract_record(record: dict[str, Any]) -> CognitiveTrajectory | None:
    question = record.get("question") or record.get("prompt") or record.get("input")
    payload = record.get("cognition") or record.get("trajectory") or record
    if not question or not isinstance(payload, dict):
        return None
    trajectory = normalize_teacher_output(question, payload)
    return trajectory if trajectory.is_useful() else None


def build_teacher_prompt(question: str) -> str:
    fields = ", ".join(COGNITIVE_FIELDS)
    return (
        "Analyze the user's question as a cognitive teacher. Do not solve it with a "
        "long factual answer. Return ONLY valid JSON with these fields: "
        f"{fields}. Focus on what an agent should understand and do. "
        "Keep each field concise. question=" + question
    )


def call_teacher(endpoint: str, model: str, question: str, timeout: int = 60) -> dict[str, Any]:
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": build_teacher_prompt(question)}],
        "temperature": 0,
    }).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        data = json.loads(response.read().decode("utf-8"))
    content = data["choices"][0]["message"]["content"]
    return _extract_json(content)


def extract_jsonl(
    input_path: str,
    output_path: str,
    endpoint: str | None = None,
    model: str | None = None,
) -> int:
    accepted = 0
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    with Path(input_path).open("r", encoding="utf-8") as source, output.open("w", encoding="utf-8") as sink:
        for line in source:
            if not line.strip():
                continue
            record = json.loads(line)
            if endpoint and model:
                question = record.get("question") or record.get("prompt") or record.get("input")
                if not question:
                    continue
                trajectory = normalize_teacher_output(question, call_teacher(endpoint, model, question))
            else:
                trajectory = extract_record(record)
            if trajectory is None:
                continue
            sink.write(json.dumps(asdict(trajectory), ensure_ascii=False) + "\n")
            accepted += 1
    return accepted


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract Hyperdrop cognitive trajectories.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--endpoint")
    parser.add_argument("--model")
    args = parser.parse_args()
    if bool(args.endpoint) != bool(args.model):
        parser.error("--endpoint and --model must be supplied together")
    print(extract_jsonl(args.input, args.output, args.endpoint, args.model))


if __name__ == "__main__":
    main()
