# Hyperdrop — Project Memory

> Short project memory. Read this before making changes.

## What is Hyperdrop?
Hyperdrop / Nax Chat is a React Native + Expo app focused on private communication, media sharing, social Moments/Stories, and peer-to-peer features.

## Why?
Build one stable communication app where chat, media, identity, social sharing, and calls work together without breaking existing features.

## Main Goal
**Reliable Android-to-Android voice/video calling + stable chat/social features with no regressions.**

## Main Areas
- **Chat:** messaging, media, reply, forward, Power Center actions.
- **Calls:** WebRTC voice/video, Firebase signalling, ICE/STUN/TURN, call cleanup.
- **Moments:** publishing, viewer, Stories/Clips, Connect/Circle.
- **Identity:** Firebase Auth + persistent Google username/profile.
- **P2P:** peer-to-peer file/media transfer.
- **Firebase:** Firestore data + security rules.

## Current Focus
1. **Video call first:** remote video must connect and render on two Android devices.
2. Verify ICE/signalling and remote video-track delivery before changing RTCView/native rendering.
3. Keep working chat, Moments, auth, username and Firebase rules locked unless directly required.
4. After every WebRTC change, test a fresh APK on **two Android devices**.

## Video Call Flow
CallScreen → useMediaStream → useCallLogic → webrtcHelper → RTCPeerConnection → Firebase signalling/ICE → remote RTCView

## Known Status
- Chat: working
- Auth/username persistence: working
- Moments: working
- Firebase rules: locked/current
- P2P: present; deeper regression testing pending
- Video call: hardened, **two-device runtime verification pending**

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

## Current Branch
feat/moments-working-ui

**Priority:** Fix and verify Android video calling without causing regressions elsewhere.
