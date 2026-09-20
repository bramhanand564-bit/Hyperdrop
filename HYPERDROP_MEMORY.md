# Hyperdrop — Project Memory (Short Form)
> Purpose: Persistent handoff memory for Hyperdrop. Keep this file short, factual, and updated after meaningful work so another chat/AI can continue without losing project context.

## STATUS
- Repo: bramhanand564-bit/Hyperdrop
- Branch: main
- Current repo state: V0.2 foundation started: SQLite-backed memory, durable background worker, tool-call/audit contracts, and Android app shell added on top of the V0.1 runtime. V0.1 structure, cognitive/task contracts, knowledge-state routing, Baymax-inspired behavior, research planning, real web-search adapter, bounded page reader, Evidence conversion, provenance verification, contradiction detection, verified research pipeline, compact answer builder, and compressed Lesson preparation, persistent MemoryStore/MemoryManager, LiveController, checkpoints, reflection, memory relevance/forgetting policy, ToolRegistry, permissions, TaskRunner, runtime lifecycle/configuration, ExecutionEngine, provider factory, knowledge gate, health snapshot, LiveOrchestrator, recovery policy, memory decay, background Job/Queue, and Android bridge contract.
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
V0.1 COMPLETE. Next milestone is V0.2: Android implementation/build, stronger retrieval, richer tools, browser/computer hands, and production-grade long-running workers. User-facing design rule: research is internal; return the useful result directly when possible.

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

- 2026-09-19: V0.2 execution/resume hardening: SQLiteJobStore gained direct non-consuming job lookup; ResumeManager now inspects and loads a specific durable job without disturbing queue order; added stronger resume tests. Added explicit HandoffRequest/HandoffReason contract for login/OTP/ambiguous/sensitive/confirmation user-controlled steps. ToolCall now carries explicit confirmation state, and ToolRuntime now enforces the centralized credential/permission/confirmation policy before handlers execute, with audit events for denials and confirmation requirements. CI verification was checked on the latest known commit; the commit-scoped workflow-run endpoint returned no runs, so APK/Python success is not claimed until an observable run/status exists.

- 2026-09-19: V0.2 completion push: browser layer now has observable action results and validated dry-run execution; runtime composition now exposes audited ToolRuntime. Remaining gap is provider-specific real browser automation and externally observed CI/APK runs.

- 2026-09-20: V0.3 started: Android foreground runtime now accepts start/pause/resume/stop/kill commands, exposes a basic start/kill UI, and declares Android 14 foreground-service data-sync + notification permissions. APK CI now verifies the debug APK exists and records its SHA-256 before artifact upload. Real CI execution still must be observed from GitHub.

- 2026-09-20: V0.3 next batch: Android task state now persists locally across activity/process lifecycle via TaskStore; TaskController uses task IDs consistently for start/pause/resume/stop. Latest commit was checked for CI/APK status; GitHub returned no observable workflow runs/statuses, so build success remains unverified.

- 2026-09-20: V0.3 runtime persistence batch: Android foreground service now writes start/pause/resume/stop/kill transitions into TaskStore, notifications expose persisted task progress/state, TaskStore clamps progress and provides an update helper, and TaskController uses the same persistence path. This keeps Android task state aligned across service/activity process boundaries; real APK CI remains unverified until an observable GitHub Actions run/status exists.

- 2026-09-20: CI/APK verification was explicitly completed and fixed. Commit 5287175 had Android APK failure from duplicate AppTheme resources and Python CI had 6 test failures (browser observation compatibility, memory source_ids JSON tuple handling, and memory retrieval threshold/topic matching). Commit 351c1e fixed those; Python CI passed. APK then exposed JVM target mismatch (Java 1.8 vs Kotlin 17); commit f5ce9b2 fixed Android compileOptions/JVM toolchain. Latest GitHub Actions run for f5ce9b2: Hyperdrop CI SUCCESS and Hyperdrop Android APK SUCCESS; debug APK exists, verified, and uploaded as artifact hyperdrop-debug-apk. APK SHA-256: ebc23019d374381d838e8d83c884cd49b9606767715f7ab5f2753428f3ca1efe.

- 2026-09-20: V0.4 Android cognition UI was added. APK initially failed due to malformed Kotlin string escaping in CognitiveEngine; the failure was read from GitHub Actions logs and fixed in commit c97dd0059a076463ca8fd5598582246124ee2841. Latest Hyperdrop CI and Android APK workflows are SUCCESS; APK build, existence verification, and artifact upload all passed. Artifact: hyperdrop-debug-apk (2,291,212 bytes). The APK now visibly exposes goal input, THINK & ANSWER, cognition steps, source, local memory reuse, deterministic calculation, and public Wikipedia lookup. This is an Android-side cognitive prototype, not yet the full Python core/LLM runtime.

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
- 2026-09-19: Added retry/handoff recovery policy, memory decay/archive policy, background Job/JobQueue primitives, and Android bridge command/event contract.
- 2026-09-19: Completed V0.1 end-to-end runtime wiring and acceptance suite. V0.1 is marked COMPLETE; V0.2 foundation expanded with ranked recall integrated into MemoryManager, Android foreground runtime shell, browser/computer-use contracts with dry-run adapter, and versioned resume state. Runtime can select JSON or SQLite memory backend.
- 2026-09-19: V0.2 high-throughput batch: added pure TaskPlanner with research/tool/browser planning, durable SQLiteJobStore for crash-surviving jobs, human-handoff boundary for OTP/login/ambiguous/sensitive flows, AgentLoop orchestration with per-step durable progress, runtime metrics, and GitHub Actions Python CI workflow. These are foundational contracts; real browser automation and production Android execution still require provider/build verification.
- 2026-09-19: Added Android APK CI with Java/Gradle setup and debug APK artifact upload; fixed a malformed AndroidManifest newline issue found during pre-build inspection. Going forward, each major Android push should be checked for CI/APK success/failure and failures fixed while continuing feature development rather than stopping feature work.
- 2026-09-19: Continued V0.2 with lightweight semantic-style memory scoring, explicit credential boundary rejecting inline secrets, centralized execution authorization, and repaired runtime source formatting discovered during inspection. Feature work continues alongside CI/APK verification.
- 2026-09-19: V0.2 next batch: added bounded public HTTP provider boundary, durable ResumeManager, tests, and upgraded Android foreground service from a bare START_STICKY shell to notification-channel/startForeground lifecycle. Real browser interaction remains provider-gated; this HTTP layer is for public pages only.


- 2026-09-20: Started Cognitive Core V0.5. Added `core/cognition/cognitive_extractor.py` and tests. The extractor treats an open-source LLM as a cognitive teacher and distills structured Buddhi-style behavior (intent, context, knowledge gap, next action, evidence requirements, relevance, compression, self-correction, response strategy) rather than pretending reasoning neurons can be cleanly separated from mixed LLM weights. It can process teacher JSONL or query an OpenAI-compatible chat endpoint. Factual/code-heavy payload fields are not part of the emitted schema.
