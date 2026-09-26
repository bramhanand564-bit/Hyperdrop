# Hyperdrop / Nax Chat — Project Status & Change Lock

Last verified by repository scan: 2026-09-26 20:35 IST
Branch: feat/moments-working-ui

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
| Chat Power Center | NEW | 100 additional actions added; needs regression testing. |
| Voice call | PARTIAL | Signalling/media pipeline exists; audio cleanup was explicitly handled. |
| Video call | HARDENED / DEVICE VERIFICATION PENDING | Remote RTCView no longer force-remounts; video-call remote stream is published only after a video track exists; SDP/ICE diagnostics added. Still needs two-device APK verification. |
| Call cleanup / speaker restore | FIXED IN CODE | WebRTC tracks and Expo audio mode are restored on cleanup. |
| P2P transfer | PRESENT | Dedicated transfer rules/manager exist; full regression not completed in this scan. |
| Unified Experience platform | IMPLEMENTED / APK VERIFIED / DEVICE TEST PENDING | Legacy Portal UI/store is removed. Experience creator Studio, templates, custom actions/fields, rich native inputs/uploads, action rules/rewards, creator/admin access controls, runtime, secure HTTPS full-experience view + web bridge, Chat share cards with inline controls, per-user participation, atomic activity/state updates, creator analytics/participants/activity, edit/disable/delete, searchable sharing, native one-to-one P2P transfer, and Firestore query indexes are implemented. The release APK build passes; two-device runtime testing is still required for final acceptance. |

## Unified Experience platform

The old Portal module was removed and replaced by a single Experience model. `ExperienceHome` is now the main Portals tab, with templates for tasks, rewards, games, quizzes, forms, community, media, P2P transfer, and custom experiences. `ExperienceBuilder` publishes a reusable schema of fields/actions/rules. `ExperienceRuntime` executes the published experience, and `ExperienceSharePicker` sends a live experience reference into Chat. `MessageBubble` renders `experience` messages with an Open Experience action. Firestore rules isolate the public experience definition from per-user `participants/{uid}` state.

This is now a broad creator-ready implementation. Remaining product-level work is limited to deeper condition/logic blocks, production-grade cash monetization/payouts behind trusted backend infrastructure, and larger-scale analytics/audience controls. Native image/file response uploads and one-to-one P2P transfer are already integrated.

## Latest Experience platform commits

Recent implementation commits on `feat/moments-working-ui` include Experience API/runtime/builder/dashboard work, legacy Portal removal, rich fields/uploads, action access controls, inline Chat actions, native P2P transfer, analytics, and Experience security rules/indexes. Release APK workflow run #562 for code SHA `35876b5bcdac747a2fad2eb49a0f7c4a3792a048` completed successfully: dependencies installed, Android project generated, release APK built, APK verified, and artifact uploaded. Two-device Android runtime testing remains the final acceptance step.

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