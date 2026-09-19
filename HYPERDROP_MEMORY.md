# Hyperdrop — Project Memory (Short Form)

> Purpose: Persistent handoff memory for Hyperdrop. Keep this file short, factual, and updated after meaningful work so another chat/AI can continue without losing project context.

## STATUS
- Repo: bramhanand564-bit/Hyperdrop
- Branch: main
- Current repo state: V0.1 structure, cognitive/task contracts, knowledge-state routing, Baymax-inspired behavior, research planning, real web-search adapter, bounded page reader, Evidence conversion, provenance verification, contradiction detection, verified research pipeline, compact answer builder, and compressed Lesson preparation, persistent MemoryStore/MemoryManager, LiveController, checkpoints, reflection, memory relevance/forgetting policy, ToolRegistry, permissions, TaskRunner, runtime lifecycle/configuration, ExecutionEngine, provider factory, knowledge gate, health snapshot, LiveOrchestrator, and Android runtime architecture.
- Development target: Android phone + GitHub; no PC assumed.
- Phone target: Vivo Y75 5G, Android 14, Dimensity 700, 8 GB physical RAM + 8 GB extended RAM, 128 GB storage.

## VISION
Build a persistent, human-inspired "Living AGI" agent:
- Not a knowledge-only chatbot.
- Detects what it does/doesn't know.
- Researches when needed.
- Plans, acts, verifies, learns from outcomes.
- Retains useful compressed memories.
- Forgets/deletes unnecessary raw data.
- Can perform browser/computer tasks and long-running work.
- 24x7 AVAILABLE via wake/idle lifecycle, not 24x7 full CPU usage.
- Human cognition is design inspiration, not a claim of literal brain/consciousness replication.

## COGNITIVE MODEL
Inspired conceptually by Hindu philosophical psychology:
- Manas: perception, possibilities, doubt, curiosity.
- Buddhi: discrimination, reasoning, decision.
- Ahamkara: self/identity/goals.
- Citta: memory/impressions/experiences.
- Meta-cognition: knows uncertainty, knowledge gaps, confidence.
Treat these as engineering inspiration, not scientific proof of how the brain works.

## CORE LOOP
Goal → Understand → Knowledge-gap check → Research → Verify → Plan → Act → Observe → Compare → Reflect → Learn → Compress/Forget → Memory.

## MEMORY
Types:
- Working: current task.
- Episodic: what happened.
- Semantic: what was learned.
- Procedural: how to do it.
- Meta-memory: confidence/reliability.

Memory policy:
- Raw task data is temporary.
- After completion: keep useful lesson/procedure; compress useful details; delete unnecessary raw data.
- Repeatedly useful knowledge becomes stronger.
- Duplicate/obsolete knowledge is merged/archived/deleted.
- Do not train model weights after every task; fast learning = memory/procedures, slow learning = later model improvement.

## FIRST PRODUCT MILESTONES
1. HyperChat
2. HyperMind controller
3. Research engine: search → read → compare → verify → answer
4. Memory + compression/forgetting
5. Planner + tool system
6. Browser/computer-use "hands"
7. Long-running task manager: checkpoints + resume
8. Learn from successful/failed actions
9. Android APK
10. Later: model fine-tuning/training from curated experiences.

## SAFETY
- Permissions, sandboxing, secure credentials.
- Sensitive actions require appropriate user confirmation/handoff.
- OTP/2FA should be user-controlled.
- Kill switch + task checkpoints + audit trail.

## DO NOT DO YET
- Do not train a huge/billion-parameter model from scratch.
- Do not attempt literal brain simulation.
- Do not store every research page/experience permanently.
- Do not make the agent blindly trust the first search result.
- Do not assume consciousness.

## CURRENT NEXT ACTION
Next: connect the provider-backed search and ExecutionEngine into a single runtime composition, add Android background/task APIs, then harden memory retrieval and long-running recovery. User-facing design rule: research is internal; return the useful result directly when possible.

## REPO STRUCTURE CREATED
- README.md
- docs/ARCHITECTURE.md
- core/mind/README.md
- core/memory/README.md
- core/research/README.md
- core/verification/README.md
- core/planner/README.md
- core/agent/README.md
- core/learning/README.md
- android/README.md

## CHANGE LOG
- 2026-09-19: Project vision and architecture discussed.
- 2026-09-19: Confirmed target repo is Hyperdrop, not Hyperdropv2.
- 2026-09-19: Confirmed GitHub + Android phone are the initial development setup.
- 2026-09-19: Confirmed adaptive memory/forgetting is a core requirement.
- 2026-09-19: Confirmed browser/computer-use and long-running task execution as future core capabilities.
- 2026-09-19: Created persistent handoff memory file.
- 2026-09-19: Created initial V0.1 repository structure and architecture docs.
- 2026-09-19: Added Task, Evidence, Memory contracts and an explicit HyperMind research decision policy.
- 2026-09-19: Added executable HyperMind answer-vs-research decision logic with V0.1 tests.
- 2026-09-19: Added Baymax-inspired calm/helpful/honest conversational behavior profile and explicit KNOWN/UNKNOWN/UNCERTAIN/CONFLICTING/LEARNED knowledge states.
- 2026-09-19: Added Task contract and HyperMind task router connecting knowledge-gap decisions to task state.
- 2026-09-19: Added research-plan, Evidence contract, basic evidence verification, and tests.
- 2026-09-19: Added provider-independent ResearchEngine and SearchProvider interface with tests.
- 2026-09-19: Added ConversationLoop and ResponsePolicy so unknown questions trigger internal research without a mandatory user-facing waiting message; task resumes in ANSWERING state.
- 2026-09-19: Added Brave Search adapter, bounded page reader, search-result-to-Evidence conversion, provenance-aware verification, VerifiedResearchEngine, and compact verified AnswerDraft builder.
- 2026-09-19: Added contradiction detection, compressed Lesson representation, and end-to-end ResearchAnswerPipeline that refuses to turn conflicting evidence into a confident fact and prepares useful verified lessons for memory.
- 2026-09-19: Added persistent JSON MemoryStore, MemoryManager confidence gate, LiveController, long-running CheckpointStore, Reflection records, and relevance/forgetting policy.
- 2026-09-19: Added ToolRegistry, default-deny PermissionStore, checkpointed TaskRunner, runtime lifecycle/config, HyperdropRuntime composition, Android runtime architecture docs.
- 2026-09-19: Added permission-aware ExecutionEngine, provider factory/config, fast knowledge gate, runtime health snapshot, and unified LiveOrchestrator with end-to-end test.
