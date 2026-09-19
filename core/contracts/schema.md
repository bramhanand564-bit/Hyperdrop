# V0.1 Core Contracts

These contracts define the smallest shared language between HyperMind, research, verification, planning, and memory.

## Task
- id: stable task identifier
- goal: user objective
- status: pending | researching | planning | executing | verifying | completed | failed
- created_at
- current_step
- uncertainty: 0..1
- requires_research: boolean

## Evidence
- id
- task_id
- source
- claim
- excerpt_or_note
- source_type
- reliability: 0..1
- retrieved_at

## Memory
- id
- type: working | episodic | semantic | procedural | meta
- content
- source
- confidence: 0..1
- importance: 0..1
- usefulness: 0..1
- use_count
- created_at
- last_used
- retention: keep | archive | delete

## Design rule
Contracts are intentionally small. Implementation details can evolve without changing the cognitive model.
