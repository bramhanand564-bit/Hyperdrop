# Hyperdrop — Project Memory

> Short project memory. Read this before making changes.

## VIDEO CALL — WORKING
**Android-to-Android video call is working.** Remote video, signalling/ICE, RTCView and call cleanup are considered working. Do not rewrite the video-call system unless a new regression is specifically reported.

## UNIFIED EXPERIENCE PLATFORM — NEW
The legacy Portal/store layer on this branch has been removed from the main product path. A single Experience model now powers creator-built interactive experiences, templates, runtime, Chat sharing, inline actions/forms, per-user state, immutable activity events, and creator analytics.

Key files:
- api/ExperienceAPI.js
- screens/ExperienceHome.js
- screens/ExperienceBuilder.js
- screens/ExperienceRuntime.js
- screens/ExperienceSharePicker.js
- screens/ExperienceDashboard.js
- firestore.rules

Creator flow: Create → customize fields/actions/rules → Publish → Share to Chat → users interact → participant state/events update → creator dashboard.

## What is Hyperdrop?
Hyperdrop / Nax Chat is a React Native + Expo app focused on private communication, media sharing, social Moments/Stories, and peer-to-peer features.

## Why?
Build one stable communication app where chat, media, identity, social sharing, and calls work together without breaking existing features.

## Main Goal
**Keep the working video-call system stable while improving the rest of Hyperdrop without regressions.**

## Main Areas
- **Chat:** messaging, media, reply, forward, Power Center actions.
- **Calls:** WebRTC voice/video, Firebase signalling, ICE/STUN/TURN, call cleanup.
- **Moments:** publishing, viewer, Stories/Clips, Connect/Circle.
- **Identity:** Firebase Auth + persistent Google username/profile.
- **P2P:** peer-to-peer file/media transfer.
- **Firebase:** Firestore data + security rules.
- **Experiences:** universal shareable interactive objects for tasks, games, rewards, forms, media, workflows and P2P-oriented experiences.

## Current Focus
1. **Protect video call:** don't change working WebRTC code without a specific bug.
2. Improve/test other Hyperdrop features without breaking chat, Moments, auth or calls.
3. Keep Firebase rules and working data flows locked unless directly required.
4. Test important native changes with a fresh APK on Android devices.

## Video Call Flow
CallScreen → useMediaStream → useCallLogic → webrtcHelper → RTCPeerConnection → Firebase signalling/ICE → remote RTCView

## Known Status
- Video call: **WORKING**
- Chat: working
- Auth/username persistence: working
- Moments: working
- Firebase rules: locked/current
- P2P: present; deeper regression testing pending

## Important Rules
- Inspect exact current code before editing.
- Make the smallest targeted change.
- Do not rewrite known-working features to fix an unrelated bug.
- Native react-native-webrtc changes require a new native APK build.
- Update PROJECT_STATUS.md when a meaningful fix/status change is made.

## Video Call Acceptance
A → B call → offer/answer saved → ICE candidates present → ICE connected/completed → remote video track exists → remote RTCView shows moving video → hang up → speaker/audio restored → second call works.

## Key Files
- hooks/useCallLogic.js — signalling/SDP/ICE
- hooks/useMediaStream.js — camera/mic
- utils/webrtcHelper.js — RTCPeerConnection/ontrack
- screens/CallScreen.js — call UI/RTCView
- managers/CallManager.js — incoming calls
- firestore.rules — Firebase permissions
- PROJECT_STATUS.md — detailed project status
- MEMORY.md — short project memory

## Current Branch
feat/moments-working-ui

**Priority:** Preserve the working video call and make targeted improvements elsewhere.
