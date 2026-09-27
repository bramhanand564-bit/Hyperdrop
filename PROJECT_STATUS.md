# Hyperdrop / Nax Chat — Project Status & Change Lock

Last verified by repository scan: 2026-09-27
Branch: main

## Goal
Build a stable Nax Chat / Hyperdrop app with reliable private chat and media messaging, working voice/video calls, Moments/Stories/Clips, stable Google identity/usernames, Circle/Connect, safe Firebase permissions, and no regressions.

## Current health
| Area | State | Notes |
|---|---|---|
| Firebase auth persistence | WORKING | AsyncStorage persistence is configured. |
| Google username persistence | WORKING | Existing users/{uid} username is preserved on repeat Google login. |
| Firestore rules | LOCKED / WORKING | Dedicated chat/call/Moments/Stories/P2P rules are present. |
| Moments publishing | WORKING | Previous permissions issue was fixed. |
| Moments media viewer | WORKING | Full-screen vertical viewer and Clips UI are present. |
| Moments Connect/Circle | WORKING | followingIds update with rollback. |
| Chat core | WORKING | Existing messaging/media/reply/forward flows retained. |
| Voice call | PARTIAL | Signalling/media pipeline exists; audio cleanup was explicitly handled. |
| Video call | HARDENED / DEVICE VERIFICATION PENDING | Remote RTCView no longer force-remounts; video-call remote stream is published only after a video track exists; SDP/ICE diagnostics added. Still needs two-device APK verification. |
| Call cleanup / speaker restore | FIXED IN CODE | WebRTC tracks and Expo audio mode are restored on cleanup. |
| P2P transfer | PRESENT | Dedicated transfer rules/manager exist; full regression not completed in this scan. |
| Unified Experience platform | IMPLEMENTED / LATEST AI CREATOR CHANGES CODE-VERIFIED / DEVICE BUILD PENDING | Legacy Portal UI/store is removed. Universal Experience creator flow, templates, custom actions/fields, rich native inputs/uploads, action rules/rewards, creator/admin access controls, runtime, secure HTTPS full-experience view + web bridge, Chat share cards with inline controls, per-user participation, atomic activity/state updates, creator analytics/participants/activity, edit/disable/delete, searchable sharing, native one-to-one P2P transfer, and Firestore query indexes are implemented. The release APK build passes; two-device runtime testing is still required for final acceptance. |

## Unified Experience platform

The old Portal module was removed and replaced by a single Experience model. `ExperienceHome` is now the main Portals tab, with templates for tasks, rewards, games, quizzes, forms, community, media, P2P transfer, and custom experiences. `ExperienceBuilder` publishes a reusable schema of fields/actions/rules. `ExperienceRuntime` executes the published experience, and `ExperienceSharePicker` sends a live experience reference into Chat. `MessageBubble` renders `experience` messages with an Open Experience action. Firestore rules isolate the public experience definition from per-user `participants/{uid}` state.

This is now a broad creator-ready implementation. The legacy Mini App Studio stack is removed; the active creation path is ExperienceHome → ExperienceBuilder → ExperienceRuntime, with Store, Dashboard, Gateway and Chat sharing around the same Experience. Remaining product-level work is deeper condition/logic blocks, production-grade cash monetization/payouts behind trusted backend infrastructure, larger-scale analytics/audience controls, and final device regression. Native image/file response uploads and one-to-one P2P transfer are already integrated.

## Latest Experience platform commits

Recent implementation commits on `main` include Experience API/runtime/builder/dashboard work, legacy Portal removal and legacy Mini App/Studio removal, rich fields/uploads, action access controls, inline Chat actions, native P2P transfer, analytics, and Experience security rules/indexes. Release APK workflow run #562 for code SHA `35876b5bcdac747a2fad2eb49a0f7c4a3792a048` completed successfully: dependencies installed, Android project generated, release APK built, APK verified, and artifact uploaded. Two-device Android runtime testing remains the final acceptance step.

## Video-call scan findings

Architecture: CallScreen renders RTCView; useMediaStream obtains camera/mic; useCallLogic owns Firebase signalling, SDP and ICE; webrtcHelper owns RTCPeerConnection and ontrack; CallManager opens incoming calls; Firestore has dedicated call and candidate rules.

The screenshots show the small top-right preview, which is the local stream. The large remote surface remains black/waiting and status stays Connecting. Therefore local camera permission is working; the primary failure is downstream in signalling/ICE/remote-track delivery or native WebRTC runtime.

### High-priority blockers to verify
1. Native WebRTC version: package.json pins react-native-webrtc 118.0.7 while Expo 51 / React Native 0.74.5 is used. Upstream has newer releases and Android fixes. Any version change requires a native rebuild.
2. ICE path: STUN/TURN is configured, but the code does not expose candidate counts/types in the UI. A call can have a local preview while peer connectivity still fails.
3. Remote-track arrival: ontrack is wired, but we need diagnostics for video-track count, ICE state, SDP media sections and candidate types before changing RTCView again.
4. Android RTCView lifecycle: upstream has Android black-screen reports involving remote streams, ICE failure, z-order and lifecycle/re-render behavior. Rendering should be changed only after confirming that a remote video track exists.
5. Native build parity: react-native-webrtc contains native code and needs a custom/development native build, not Expo Go. Native dependency/config changes require a fresh build.

### Fixes applied in latest pass

- utils/webrtcHelper.js: video calls now wait for an actual remote video track before publishing the native stream to RTCView; ICE candidate type logging was added.
- screens/CallScreen.js: removed the forced remote RTCView remount key, reducing Android black/freeze risk during track arrival.
- hooks/useCallLogic.js: added offer/answer m=audio / m=video checks, local/remote ICE counters and candidate-type diagnostics, plus receiver diagnostics when ICE connects.
- No Firebase rules, auth, Moments, Stories, or chat-core code was changed in this pass.
- CI APK build was triggered automatically from commit febd7a13a7ba5f993ba246f5f7035c269837f706; runtime two-device verification is still required.

## Change lock
LOCKED — do not modify unless the task specifically concerns it:
- Firebase rules
- Firebase auth persistence
- Google username persistence
- Moments publishing permissions
- Existing Moments data model/storage/query behavior
- Existing working chat send/receive pipeline
- Existing Stories/Moments media behavior

Change only when requested/tested:
- WebRTC native dependency version
- ICE/TURN configuration
- call signalling schema
- call cleanup/audio routing
- CallScreen RTCView layering
- Firestore call rules

## Update protocol
1. Read this file before editing.
2. Inspect the exact current implementation.
3. Change the smallest affected files.
4. Verify the targeted behavior.
5. Update this file with changed, working, remaining, and commit SHA.
6. Never rewrite a known-working feature just because another feature is broken.

## Primary goal
Make Android-to-Android video calls reach Connected and render remote video reliably without breaking speaker/audio cleanup.

## Acceptance test
Two fresh/current APK installs: call A to B; both grant camera/mic; both local previews appear; offer and answer save; ICE candidates exist; ICE reaches connected/completed; remote video track count is at least 1; remote RTCView shows moving video; end call; normal speaker audio works; start a second call without reinstalling.

Failure mapping: steps before offer/answer = signalling; ICE failure = connectivity; no remote video track = SDP/peer negotiation; remote track exists but black = RTCView/native rendering; speaker fails after hangup = audio cleanup.

## Regression rule
WORKING = LOCKED. BROKEN = ISOLATED. New work must not rewrite unrelated working code.

## Universal Experience Gateway & Store — IMPLEMENTED IN MAIN
- Nax Store apps now carry persistent Gateway metadata, can be shared from Store to real user chats as `app_invite` messages, render as compact Chat cards, and open through `NaxAppRuntime` with a native Gateway bridge (`window.Nax.shareToChat()` / `window.Nax.close()`). The Chat share picker reads real `users/{uid}/user_chats` and sends through `MessagingService`; no demo/fake chat selection was added.
- Added a permanent Gateway contract to Experiences with stable gateway IDs, visibility, Chat presentation, entrypoints, and capability scopes.
- Added an Experience Store for published creator-made tools/apps with search/category filters, direct use, and one-tap customizable cloning.
- Added Store and Creator Dashboard entry points in Experience Home and Settings.
- Shared Experience Chat messages now carry Gateway/package metadata while retaining the same Experience identity for compact Chat and full-screen runtime entry.
- Removed the legacy Chat Power Center / 100-feature Chat toolkit entrypoint and its dedicated component; normal Chat Toolkit filters and controls remain.
- Fixed the atomic Experience action result path so participant state/action results are returned correctly.
- Important limitation: the existing native WebRTC file-transfer helper is still capped at 15 MB and is not yet a production 100 GB resumable transfer engine. A true 100 GB Big File Transfer requires streaming/resumable chunks, receiver-side disk streaming, recovery, and device/network hardening before that claim is made.


## Latest AI simplification pass — main
- Offline AI model picker was simplified to a small verified default catalog: Qwen3 0.6B (fast everyday), Qwen3 1.7B (stronger general), Qwen2.5-Coder 1.5B (coding), Gemma 3 1B (balanced), and SmolLM2 1.7B (lightweight).
- The defaults use practical Q4_K_M GGUF builds instead of exposing many confusing quantization variants. A dynamic Hugging Face GGUF discovery path remains available for advanced users.
- Offline model cards now show purpose, size, compatibility and a simple Download / Use & test action.
- Added ExperienceAICreatorScreen: prompt → validated native Experience draft → existing ExperienceBuilder → creator review → publish. No raw code, secrets or external URLs are generated by the creator.
- Experience Home now has a single Create with AI entry point.
- Removed stale Mini App dependencies from DeveloperDashboardScreen by routing it to the unified Experience Dashboard.
- Legacy Mini App/Studio symbol search remains clean on main.
- Latest changes are code-verified from GitHub; a fresh Android build and real-device regression are still required before claiming runtime acceptance.


## AI App Builder — automatic single-file/advanced routing
- Added `AIAppBuilderScreen` with chat-first creation and live WebView preview.
- Added `AIAppBuilderService` with automatic `SINGLE_HTML` vs `ADVANCED_PROJECT` routing, real HTML generation/editing, version snapshots, undo, and project memory.
- Single-file apps keep `index.html` as the canonical runtime and carry `MEMORY.md` in project metadata/version snapshots.
- Advanced projects are the foundation for native Android/source builds; APK/AAB packaging remains a follow-up build stage.
- Create → Build an App with AI is now the primary AI creator entry point.

## Nax Store redesign — latest

- `screens/NaxStoreScreen.js` now uses the premium dark Nax Store layout based on the provided reference: branded header, search, category pills, AI hero, four creator actions, Popular horizontal cards, Featured/Latest two-column cards, and bottom navigation.
- Store content remains backed by `NaxAppStoreAPI`; the redesign does not introduce fake published-app records or fake ratings.
- Import/Create/My Apps/Use/Share actions remain connected to the existing builder/store flows.
- Latest redesign commit: `e0410ceaf06abe0253a3a04158d1fed2c5eb8836`.
- Fresh Android build/device verification is still required after this UI change.

## Nax Store publishing metadata — latest
- Publish is now a listing editor instead of an immediate one-tap live action.
- Listing fields: app name, Store title, description, icon picker/custom emoji, category, version, and up to 6 screenshots.
- Screenshots are resized/compressed on-device and uploaded to Firebase Storage before the public listing is written.
- `NaxAppStoreAPI.publish` now stores title, icon/iconUrl, screenshots, category, description, and version metadata.
- Firebase Storage rules are configured in `storage.rules` and referenced by `firebase.json`; deployment remains manual/explicit per the project's Firebase deployment policy.
- Latest related commits: `977246be619c6f5872de618dc27a0ebb93de0469`, `d7dc238a7cc1207886d5e6f82c10d1cc1f46421a`.

## Nax Store publish fixes — latest
- Publish now loads the complete local project with `AIAppBuilderService.getProject` before publishing, so `index.html` is not lost when My Apps metadata is passed to the publisher.
- Publisher accepts both `index.html` and `src/index.html` as a valid HTML entry.
- React Native media publishing no longer uses Firebase Web SDK Blob/ArrayBuffer uploads. App screenshots are compressed on-device and stored as dedicated Firestore media documents; custom icons are stored with the listing and displayed in Nax Store.
- Publish listing now supports a gallery-selected custom icon as well as emoji fallback.
- Nax Store app cards no longer show the separate share icon.
- Latest fixes: `b022011a1a9a469d6129869e730675c8f591d7c7`, `7847a0c2bab6da41ecf63878db06923f9d11d633`, `f4d454b254b839cec0d0811673e32d2194a75b92`, `1bcfd1109541f997b91e2becb41a7f55c2f155c1`, `021d7e16b207f772f2459ed394874694822e751b`.
- Fresh Android build/device verification is required.
