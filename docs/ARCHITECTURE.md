# Hyperdrop V0.1 Architecture

## 1. Cognitive loop
Input → Understand → Knowledge-gap check → Research → Verify → Plan → Act → Observe → Reflect → Learn → Memory

Not every task needs every stage.

## 2. Cognitive roles
### Manas
Generates possibilities, notices ambiguity, gathers observations, and raises questions.

### Buddhi
Discriminates between options, evaluates evidence, plans, and makes decisions.

### Ahamkara
Maintains task identity, goals, ownership of the current objective, and continuity.

### Citta
Stores and retrieves useful experience, learned facts, procedures, and impressions.

These are conceptual engineering inspiration from Hindu philosophical models, not claims about literal neuroscience.

## 3. Research policy
Research when information may be current, confidence is low, external evidence is required, or a knowledge gap blocks progress.

Research should compare relevant sources, prefer primary or authoritative sources, preserve provenance, and expose meaningful uncertainty.

## 4. Memory policy
Raw research and task traces are temporary by default.
- useful lesson → compress and retain
- reusable procedure → procedural memory
- uncertain but potentially useful → archive
- redundant or useless → delete

Memory optimizes for future usefulness, not maximum storage.

## 5. Long-running tasks
Future agent execution will use checkpoints containing objective, current state, completed steps, next step, observations, errors, and recovery strategy.

## 6. Safety
Future computer-use capabilities should include explicit permissions, secure credential handling, user-controlled OTP/2FA, confirmation for sensitive actions, audit logs, a kill switch, and sandboxing where possible.

## 7. V0.1 boundary
Do not start with autonomous browser control or model training. First build small, testable primitives for task representation, knowledge-gap decisions, evidence records, confidence, memory records, and reflection/consolidation.
