// ==========================================
// FILE: hooks/useCallLogic.js
// ==========================================
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import {
  RTCSessionDescription,
  RTCIceCandidate,
} from 'react-native-webrtc';

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';

import { auth, db } from '../firebaseConfig';
import useMediaStream from './useMediaStream';
import {
  createPeerConnection,
  processIceQueue,
} from '../utils/webrtcHelper';

export default function useCallLogic(route, navigation) {
  const params = route?.params || {};

  const type = params.type === 'voice' ? 'voice' : 'video';
  const name = params.name || 'Nax User';

  const friendId =
    params.friendId ||
    params.receiverId ||
    '';

  const isCaller = params.isCaller === true;
  const incomingCallId = params.callId || '';

  const currentUser = auth.currentUser;

  // ==========================================
  // MEDIA
  // ==========================================
  const {
    localStream,
    localStreamRef,
    isMuted,
    isCameraOff,
    facing,
    createLocalStream,
    toggleMute,
    toggleCamera,
    switchCamera,
    stopLocalStream,
  } = useMediaStream(type);

  // ==========================================
  // UI STATE
  // ==========================================
  const [remoteStream, setRemoteStream] = useState(null);

  const [status, setStatus] = useState(
    isCaller ? 'Calling...' : 'Incoming...'
  );

  const [connected, setConnected] = useState(false);
  const [timer, setTimer] = useState(0);
  const [busy, setBusy] = useState(true);

  // ==========================================
  // REFS
  // ==========================================
  const peerRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callRef = useRef(null);

  const cleanupListenersRef = useRef([]);

  const mountedRef = useRef(true);
  const cleanupDoneRef = useRef(false);
  const navigationHandledRef = useRef(false);

  const timerRef = useRef(null);

  // Android WebRTC can leave the global audio route in communication mode
  // after a call. Keep the app audio session explicitly on the main speaker
  // and restore it when the call is finished.
  const setCallAudioMode = async (active) => {
    try {
      await Audio.setIsEnabledAsync(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: active,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: active,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.log('🔊 Audio mode update error:', error);
    }
  };

  // ICE candidates received before remote SDP
  const iceCandidateQueue = useRef([]);

  // Prevent concurrent ICE candidate processing
  const iceProcessingRef = useRef(Promise.resolve());

  // Prevent answer from being applied more than once
  const answerAppliedRef = useRef(false);

  // Prevent offer from being processed more than once
  const offerProcessedRef = useRef(false);

  // Diagnostics for future call debugging without another full repo scan.
  const localIceCandidateCountRef = useRef(0);
  const remoteIceCandidateCountRef = useRef(0);

  const hasMediaSection = (sdp, media) =>
    new RegExp(`(?:^|\\r?\\n)m=${media} `, 'i').test(sdp || '');

  const getCandidateType = (candidate) => {
    const value = candidate?.candidate || '';
    return value.match(/ typ ([a-z0-9]+)/i)?.[1] || 'unknown';
  };

  // Save a fully gathered SDP in addition to trickled candidates.
  // This makes call setup resilient when candidate subcollection delivery
  // is delayed or a deployed Firestore rule set is stale.
  const waitForIceGatheringComplete = (pc, timeoutMs = 8000) => {
    if (!pc || pc.iceGatheringState === 'complete') {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        pc.onicegatheringstatechange = null;
        resolve();
      };

      const timeout = setTimeout(finish, timeoutMs);

      pc.onicegatheringstatechange = () => {
        console.log('🧊 ICE Gathering State:', pc.iceGatheringState);
        if (pc.iceGatheringState === 'complete') {
          finish();
        }
      };
    });
  };

  // ==========================================
  // TIMER
  // ==========================================
  useEffect(() => {
    if (!connected) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      return undefined;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      if (mountedRef.current) {
        setTimer((value) => value + 1);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [connected]);

  // ==========================================
  // MAIN CALL START
  // ==========================================
  useEffect(() => {
    mountedRef.current = true;

    startCall();

    return () => {
      mountedRef.current = false;
      cleanupCall(false);
    };
  }, []);

  // ==========================================
  // SAFE NAVIGATION
  // ==========================================
  const safeGoBack = () => {
    if (navigationHandledRef.current) {
      return;
    }

    navigationHandledRef.current = true;

    try {
      navigation.goBack();
    } catch (error) {
      console.log('❌ Navigation Error:', error);
    }
  };

  // ==========================================
  // ADD REMOTE ICE CANDIDATE
  // ==========================================
  const addRemoteIceCandidate = async (pc, candidateData) => {
    if (!pc || !candidateData) {
      return;
    }

    iceProcessingRef.current = iceProcessingRef.current
      .catch(() => {})
      .then(async () => {
        try {
          if (!pc.remoteDescription) {
            iceCandidateQueue.current.push(candidateData);
            return;
          }

          await pc.addIceCandidate(
            new RTCIceCandidate(candidateData)
          );

          remoteIceCandidateCountRef.current += 1;

          console.log(
            '✅ Remote ICE candidate added:',
            {
              type: getCandidateType(candidateData),
              count: remoteIceCandidateCountRef.current,
            }
          );
        } catch (error) {
          console.log(
            '❌ Remote ICE Candidate Error:',
            error
          );
        }
      });

    return iceProcessingRef.current;
  };

  // ==========================================
  // INITIALIZE WEBRTC PEER
  // ==========================================
  const initializePeer = (stream) => {
    if (!stream) {
      throw new Error('Local media stream not available.');
    }

    const pc = createPeerConnection(
      stream,
      type,

      // ----------------------------------------
      // REMOTE STREAM
      // ----------------------------------------
      (remote) => {
        console.log('🎥 Remote stream received');

        if (!mountedRef.current || !remote) {
          return;
        }

        remoteStreamRef.current = remote;

        const videoTracks = remote.getVideoTracks?.() || [];
        const audioTracks = remote.getAudioTracks?.() || [];

        console.log(
          '🎥 Remote stream accepted:',
          {
            audio: audioTracks.length,
            video: videoTracks.length,
            streamUrl: remote.toURL?.(),
          }
        );

        // webrtcHelper only publishes a video-call stream once a video track
        // exists, so RTCView mounts against a stream that is already drawable.
        setRemoteStream(remote);
        setBusy(false);
      },

      // ----------------------------------------
      // LOCAL ICE CANDIDATE
      // ----------------------------------------
      async (candidate) => {
        const callId = callRef.current;

        if (!callId || !candidate) {
          return;
        }

        try {
          const collectionName = isCaller
            ? 'offerCandidates'
            : 'answerCandidates';

          const candidateData = candidate.toJSON();

          localIceCandidateCountRef.current += 1;

          await addDoc(
            collection(
              db,
              'calls',
              callId,
              collectionName
            ),
            candidateData
          );

          console.log(
            `🧊 Local ICE candidate saved: ${collectionName}`,
            {
              type: getCandidateType(candidateData),
              count: localIceCandidateCountRef.current,
            }
          );
        } catch (error) {
          console.log(
            '❌ Firebase ICE Write Error:',
            error
          );
        }
      }
    );

    // ========================================
    // ICE CONNECTION STATE
    // ========================================
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;

      console.log(
        '🧊 ICE Connection State:',
        state
      );

      if (!mountedRef.current) {
        return;
      }

      if (
        state === 'connected' ||
        state === 'completed'
      ) {
        setConnected(true);
        setBusy(false);
        setStatus('Connected');

        try {
          const receivers = pc.getReceivers?.() || [];
          console.log(
            '🎬 Remote receivers at ICE connected:',
            receivers.map((receiver) => ({
              kind: receiver?.track?.kind,
              readyState: receiver?.track?.readyState,
              enabled: receiver?.track?.enabled,
            }))
          );
        } catch (error) {
          console.log(
            'ℹ️ Receiver diagnostics unavailable:',
            error?.message || error
          );
        }

        // Tell the other side that WebRTC is actually connected.
        updateConnectedStatus();
      } else if (
        state === 'checking'
      ) {
        setBusy(true);
        setStatus('Connecting...');
      } else if (
        state === 'disconnected'
      ) {
        setStatus('Reconnecting...');
      } else if (
        state === 'failed'
      ) {
        setConnected(false);
        setBusy(false);
        setStatus('Connection failed');

        console.log(
          '❌ WebRTC ICE connection failed'
        );
      } else if (
        state === 'closed'
      ) {
        setConnected(false);
        setStatus('Call ended');
      }
    };

    // ========================================
    // PEER CONNECTION STATE
    // ========================================
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;

      console.log(
        '📡 Peer Connection State:',
        state
      );

      if (!mountedRef.current) {
        return;
      }

      if (state === 'connected') {
        setConnected(true);
        setBusy(false);
        setStatus('Connected');

        updateConnectedStatus();
      }

      if (state === 'connecting') {
        setBusy(true);
        setStatus('Connecting...');
      }

      if (state === 'disconnected') {
        setStatus('Reconnecting...');
      }

      if (state === 'failed') {
        setBusy(false);
        setStatus('Connection failed');
      }
    };

    // ========================================
    // SIGNALING STATE LOG
    // ========================================
    pc.onsignalingstatechange = () => {
      console.log(
        '📶 Signaling State:',
        pc.signalingState
      );
    };

    peerRef.current = pc;

    return pc;
  };

  // ==========================================
  // WRITE CONNECTED STATUS
  // ==========================================
  const updateConnectedStatus = async () => {
    const callId = callRef.current;

    if (!callId) {
      return;
    }

    try {
      await updateDoc(
        doc(db, 'calls', callId),
        {
          status: 'connected',
          connectedAt: serverTimestamp(),
        }
      );
    } catch (error) {
      // Call may already be ended.
      console.log(
        'ℹ️ Connected status update:',
        error?.message || error
      );
    }
  };

  // ==========================================
  // LISTEN REMOTE ICE CANDIDATES
  // ==========================================
  const listenForRemoteCandidates = (
    callId,
    pc,
    collectionName
  ) => {
    if (!callId || !pc) {
      return;
    }

    const candidatesRef = collection(
      db,
      'calls',
      callId,
      collectionName
    );

    const unsubscribe = onSnapshot(
      candidatesRef,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type !== 'added') {
            return;
          }

          const candidateData = change.doc.data();

          addRemoteIceCandidate(
            pc,
            candidateData
          );
        });
      },
      (error) => {
        console.log(
          '❌ ICE Listener Error:',
          error
        );
      }
    );

    cleanupListenersRef.current.push(
      unsubscribe
    );

    console.log(
      `👂 Listening for ${collectionName}`
    );
  };

  // ==========================================
  // PROCESS QUEUED ICE CANDIDATES
  // ==========================================
  const processQueuedIceCandidates = async (pc) => {
    if (!pc || !pc.remoteDescription) {
      return;
    }

    await processIceQueue(
      pc,
      iceCandidateQueue
    );

    console.log(
      '🧊 Queued ICE candidates processed'
    );
  };

  // ==========================================
  // LISTEN CALL STATUS
  // ==========================================
  const listenForCallStatus = (callId) => {
    const callDoc = doc(
      db,
      'calls',
      callId
    );

    const unsubscribe = onSnapshot(
      callDoc,
      (snapshot) => {
        const data = snapshot.data();

        if (!data || !mountedRef.current) {
          return;
        }

        // --------------------------------------
        // REJECTED
        // --------------------------------------
        if (data.status === 'rejected') {
          if (isCaller) {
            Alert.alert(
              'Call Declined',
              `${name} declined the call.`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    cleanupCall(true);
                  },
                },
              ],
              {
                cancelable: false,
              }
            );
          } else {
            cleanupCall(true);
          }

          return;
        }

        // --------------------------------------
        // ENDED
        // --------------------------------------
        if (data.status === 'ended') {
          if (mountedRef.current) {
            setStatus('Call ended');
          }

          cleanupCall(true);
          return;
        }

        // --------------------------------------
        // ANSWERED
        // --------------------------------------
        if (
          data.status === 'answered' &&
          mountedRef.current &&
          !connected
        ) {
          setBusy(false);
          setStatus('Connecting...');
        }

        // --------------------------------------
        // CONNECTED
        // --------------------------------------
        if (
          data.status === 'connected' &&
          mountedRef.current
        ) {
          setConnected(true);
          setBusy(false);
          setStatus('Connected');
        }
      },
      (error) => {
        console.log(
          '❌ Call Status Listener Error:',
          error
        );
      }
    );

    cleanupListenersRef.current.push(
      unsubscribe
    );
  };

  // ==========================================
  // OUTGOING CALL
  // ==========================================
  const startOutgoingCall = async () => {
    if (!friendId) {
      throw new Error('Friend ID missing.');
    }

    if (!currentUser?.uid) {
      throw new Error('Login required.');
    }

    cleanupDoneRef.current = false;
    navigationHandledRef.current = false;

    // ----------------------------------------
    // CREATE CALL DOCUMENT FIRST
    // ----------------------------------------
    const callDoc = doc(
      collection(db, 'calls')
    );

    callRef.current = callDoc.id;

    console.log(
      '📞 Creating outgoing call:',
      callDoc.id
    );

    // IMPORTANT:
    // Firebase parent call document is created BEFORE
    // WebRTC starts generating ICE candidates.
    await setDoc(callDoc, {
      callerId: currentUser.uid,
      receiverId: friendId,

      callerName:
        currentUser.displayName || 'User',

      receiverName: name,

      type,

      status: 'ringing',

      createdAt: serverTimestamp(),
    });

    // ----------------------------------------
    // LISTEN CALL STATUS EARLY
    // ----------------------------------------
    listenForCallStatus(
      callDoc.id
    );

    // ----------------------------------------
    // CREATE LOCAL CAMERA + MICROPHONE
    // ----------------------------------------
    const stream =
      await createLocalStream();

    if (!stream) {
      throw new Error(
        'Unable to access camera/microphone.'
      );
    }

    console.log(
      '🎥 Local camera + microphone ready'
    );

    // ----------------------------------------
    // CREATE PEER
    // ----------------------------------------
    const pc = initializePeer(stream);

    // ----------------------------------------
    // LISTEN ANSWER ICE
    // ----------------------------------------
    listenForRemoteCandidates(
      callDoc.id,
      pc,
      'answerCandidates'
    );

    // ----------------------------------------
    // CREATE OFFER
    // ----------------------------------------
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo:
        type === 'video',
    });

    await pc.setLocalDescription(offer);

    await waitForIceGatheringComplete(pc);

    const gatheredOffer = pc.localDescription || offer;

    console.log(
      '📤 Local offer created',
      {
        hasAudio: hasMediaSection(gatheredOffer.sdp, 'audio'),
        hasVideo: hasMediaSection(gatheredOffer.sdp, 'video'),
        sdpLength: gatheredOffer.sdp?.length || 0,
      }
    );

    if (type === 'video' && !hasMediaSection(gatheredOffer.sdp, 'video')) {
      throw new Error('Video offer was created without an m=video section.');
    }

    // ----------------------------------------
    // SAVE OFFER
    // ----------------------------------------
    await updateDoc(callDoc, {
      offer: {
        type: gatheredOffer.type,
        sdp: gatheredOffer.sdp,
      },
    });

    console.log(
      '📤 Offer saved to Firebase'
    );

    // ----------------------------------------
    // LISTEN ANSWER
    // ----------------------------------------
    listenForAnswer(
      callDoc.id,
      pc
    );

    if (mountedRef.current) {
      setBusy(false);
      setStatus('Ringing...');
    }
  };

  // ==========================================
  // LISTEN FOR ANSWER
  // ==========================================
  const listenForAnswer = (
    callId,
    pc
  ) => {
    const callDoc = doc(
      db,
      'calls',
      callId
    );

    const unsubscribe = onSnapshot(
      callDoc,
      async (snapshot) => {
        const data =
          snapshot.data();

        if (
          !data ||
          !mountedRef.current ||
          !pc
        ) {
          return;
        }

        // --------------------------------------
        // REJECTED
        // --------------------------------------
        if (
          data.status === 'rejected'
        ) {
          return;
        }

        // --------------------------------------
        // ENDED
        // --------------------------------------
        if (
          data.status === 'ended'
        ) {
          return;
        }

        // --------------------------------------
        // NO ANSWER YET
        // --------------------------------------
        if (!data.answer) {
          return;
        }

        // --------------------------------------
        // ANSWER ALREADY APPLIED
        // --------------------------------------
        if (
          answerAppliedRef.current ||
          pc.remoteDescription
        ) {
          return;
        }

        try {
          answerAppliedRef.current = true;

          console.log(
            '📥 Applying remote answer',
            {
              hasAudio: hasMediaSection(data.answer?.sdp, 'audio'),
              hasVideo: hasMediaSection(data.answer?.sdp, 'video'),
              sdpLength: data.answer?.sdp?.length || 0,
            }
          );

          if (
            type === 'video' &&
            !hasMediaSection(data.answer?.sdp, 'video')
          ) {
            throw new Error(
              'Remote answer was created without an m=video section.'
            );
          }

          await pc.setRemoteDescription(
            new RTCSessionDescription(
              data.answer
            )
          );

          console.log(
            '✅ Remote answer applied'
          );

          // ------------------------------------
          // ADD ICE RECEIVED BEFORE ANSWER
          // ------------------------------------
          await processQueuedIceCandidates(
            pc
          );

          if (mountedRef.current) {
            setStatus('Connecting...');
          }
        } catch (error) {
          answerAppliedRef.current = false;

          console.log(
            '❌ Answer Processing Error:',
            error
          );
        }
      },
      (error) => {
        console.log(
          '❌ Answer Listener Error:',
          error
        );
      }
    );

    cleanupListenersRef.current.push(
      unsubscribe
    );
  };

  // ==========================================
  // INCOMING CALL
  // ==========================================
  const startIncomingCall = async () => {
    if (!incomingCallId) {
      throw new Error(
        'Call ID missing.'
      );
    }

    callRef.current =
      incomingCallId;

    cleanupDoneRef.current = false;
    navigationHandledRef.current = false;

    if (mountedRef.current) {
      setStatus('Incoming...');
      setBusy(false);
    }

    const callDoc = doc(
      db,
      'calls',
      incomingCallId
    );

    // ----------------------------------------
    // LISTEN INCOMING CALL STATUS
    // ----------------------------------------
    const unsubscribe = onSnapshot(
      callDoc,
      (snapshot) => {
        const data =
          snapshot.data();

        if (
          !data ||
          !mountedRef.current
        ) {
          return;
        }

        if (
          data.status === 'ended' ||
          data.status === 'rejected'
        ) {
          if (mountedRef.current) {
            setStatus('Call ended');
          }

          cleanupCall(true);
          return;
        }

        if (
          data.status === 'answered'
        ) {
          setStatus('Connecting...');
        }

        if (
          data.status === 'connected'
        ) {
          setConnected(true);
          setBusy(false);
          setStatus('Connected');
        }
      },
      (error) => {
        console.log(
          '❌ Incoming Call Listener Error:',
          error
        );
      }
    );

    cleanupListenersRef.current.push(
      unsubscribe
    );
  };

  // ==========================================
  // ACCEPT INCOMING CALL
  // ==========================================
  const acceptCall = async () => {
    if (!incomingCallId) {
      return;
    }

    if (peerRef.current) {
      console.log(
        '⚠️ Peer already exists.'
      );
      return;
    }

    try {
      setBusy(true);
      setStatus('Connecting...');

      const callDoc = doc(
        db,
        'calls',
        incomingCallId
      );

      // ----------------------------------------
      // MARK AS ANSWERED
      // ----------------------------------------
      await updateDoc(
        callDoc,
        {
          status: 'answered',
          answeredAt: serverTimestamp(),
        }
      );

      // ----------------------------------------
      // GET CAMERA + MICROPHONE
      // ----------------------------------------
      const stream =
        await createLocalStream();

      if (!stream) {
        throw new Error(
          'Unable to access camera/microphone.'
        );
      }

      console.log(
        '🎥 Incoming local camera + microphone ready'
      );

      if (mountedRef.current) {
        setBusy(false);
        setStatus('Connecting...');
      }

      // ----------------------------------------
      // CREATE PEER
      // ----------------------------------------
      const pc =
        initializePeer(stream);

      // ----------------------------------------
      // LISTEN CALLER ICE
      // ----------------------------------------
      listenForRemoteCandidates(
        incomingCallId,
        pc,
        'offerCandidates'
      );

      // ----------------------------------------
      // WAIT FOR CALLER OFFER
      // ----------------------------------------
      // The receiver can tap Accept before the caller's
      // Firestore offer update arrives. Do not fail the
      // call in that race; wait for the offer briefly.
      const data = await new Promise((resolve, reject) => {
        let settled = false;
        let unsubscribe = () => {};
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          try { unsubscribe(); } catch (_) {}
          reject(new Error('Caller offer timed out. Please try again.'));
        }, 15000);

        unsubscribe = onSnapshot(
          callDoc,
          snapshot => {
            const next = snapshot.data();

            if (!next) {
              clearTimeout(timeout);
              settled = true;
              try { unsubscribe(); } catch (_) {}
              reject(new Error('Call no longer exists.'));
              return;
            }

            if (next.status === 'ended' || next.status === 'rejected') {
              clearTimeout(timeout);
              settled = true;
              try { unsubscribe(); } catch (_) {}
              reject(new Error('Call has ended.'));
              return;
            }

            if (next.offer && !settled) {
              clearTimeout(timeout);
              settled = true;
              try { unsubscribe(); } catch (_) {}
              resolve(next);
            }
          },
          error => {
            clearTimeout(timeout);
            settled = true;
            try { unsubscribe(); } catch (_) {}
            reject(error);
          }
        );

        cleanupListenersRef.current.push(() => {
          clearTimeout(timeout);
          try { unsubscribe(); } catch (_) {}
        });
      });

      if (offerProcessedRef.current) {
        return;
      }

      offerProcessedRef.current = true;

      // ----------------------------------------
      // SET REMOTE OFFER
      // ----------------------------------------
      console.log(
        '📥 Applying caller offer',
        {
          hasAudio: hasMediaSection(data.offer?.sdp, 'audio'),
          hasVideo: hasMediaSection(data.offer?.sdp, 'video'),
          sdpLength: data.offer?.sdp?.length || 0,
        }
      );

      if (
        type === 'video' &&
        !hasMediaSection(data.offer?.sdp, 'video')
      ) {
        throw new Error(
          'Caller offer was created without an m=video section.'
        );
      }

      await pc.setRemoteDescription(
        new RTCSessionDescription(
          data.offer
        )
      );

      console.log(
        '✅ Caller offer applied'
      );

      // ----------------------------------------
      // PROCESS ICE RECEIVED BEFORE OFFER
      // ----------------------------------------
      await processQueuedIceCandidates(
        pc
      );

      // ----------------------------------------
      // CREATE ANSWER
      // ----------------------------------------
      const answer =
        await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo:
            type === 'video',
        });

      // ----------------------------------------
      // SET LOCAL ANSWER
      // ----------------------------------------
      await pc.setLocalDescription(answer);

      await waitForIceGatheringComplete(pc);

      const gatheredAnswer = pc.localDescription || answer;

      console.log(
        '📤 Local answer created',
        {
          hasAudio: hasMediaSection(gatheredAnswer.sdp, 'audio'),
          hasVideo: hasMediaSection(gatheredAnswer.sdp, 'video'),
          sdpLength: gatheredAnswer.sdp?.length || 0,
        }
      );

      if (type === 'video' && !hasMediaSection(gatheredAnswer.sdp, 'video')) {
        throw new Error('Video answer was created without an m=video section.');
      }

      // ----------------------------------------
      // SAVE ANSWER
      // ----------------------------------------
      await updateDoc(
        callDoc,
        {
          answer: {
            type: gatheredAnswer.type,
            sdp: gatheredAnswer.sdp,
          },
        }
      );

      console.log(
        '📤 Answer saved to Firebase'
      );

      if (mountedRef.current) {
        setBusy(false);
        setStatus('Connecting...');
      }
    } catch (error) {
      console.log(
        '❌ Accept Call Error:',
        error
      );

      if (mountedRef.current) {
        setBusy(false);
        setStatus('Call failed');
      }

      try {
        await updateDoc(
          doc(
            db,
            'calls',
            incomingCallId
          ),
          {
            status: 'ended',
            endedAt: serverTimestamp(),
          }
        );
      } catch (updateError) {
        console.log(
          '❌ Failed to update call after accept error:',
          updateError
        );
      }

      cleanupCall(true);
    }
  };

  // ==========================================
  // DECLINE CALL
  // ==========================================
  const declineCall = async () => {
    const callId =
      callRef.current ||
      incomingCallId;

    try {
      if (callId) {
        await updateDoc(
          doc(db, 'calls', callId),
          {
            status: 'rejected',
            endedAt: serverTimestamp(),
          }
        );
      }
    } catch (error) {
      console.log(
        '❌ Decline Call Error:',
        error
      );
    }

    cleanupCall(true);
  };

  // ==========================================
  // START CALL
  // ==========================================
  const startCall = async () => {
    try {
      await setCallAudioMode(true);
      if (!currentUser?.uid) {
        throw new Error(
          'Login required.'
        );
      }

      if (isCaller) {
        await startOutgoingCall();
      } else {
        await startIncomingCall();
      }
    } catch (error) {
      console.log(
        '❌ Start Call Error:',
        error
      );

      if (!mountedRef.current) {
        return;
      }

      Alert.alert(
        'Call Error',
        error?.message ||
          'Unable to start call.',
        [
          {
            text: 'OK',
            onPress: () => {
              cleanupCall(true);
            },
          },
        ],
        {
          cancelable: false,
        }
      );
    }
  };

  // ==========================================
  // END CALL
  // ==========================================
  const endCall = async () => {
    const callId =
      callRef.current;

    try {
      if (callId) {
        await updateDoc(
          doc(db, 'calls', callId),
          {
            status: 'ended',
            endedAt: serverTimestamp(),
          }
        );
      }
    } catch (error) {
      console.log(
        '❌ End Call Firebase Error:',
        error
      );
    }

    cleanupCall(true);
  };

  // ==========================================
  // CLEANUP
  // ==========================================
  const cleanupCall = (
    goBack = false
  ) => {
    if (cleanupDoneRef.current) {
      if (
        goBack &&
        !navigationHandledRef.current
      ) {
        safeGoBack();
      }

      return;
    }

    cleanupDoneRef.current = true;

    console.log(
      '🧹 Cleaning WebRTC call resources'
    );

    // ----------------------------------------
    // FIREBASE LISTENERS
    // ----------------------------------------
    cleanupListenersRef.current.forEach(
      (unsubscribe) => {
        try {
          unsubscribe();
        } catch (error) {
          console.log(
            'Listener cleanup error:',
            error
          );
        }
      }
    );

    cleanupListenersRef.current = [];

    // ----------------------------------------
    // TIMER
    // ----------------------------------------
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // ----------------------------------------
    // ICE QUEUE
    // ----------------------------------------
    iceCandidateQueue.current = [];
    localIceCandidateCountRef.current = 0;
    remoteIceCandidateCountRef.current = 0;
    answerAppliedRef.current = false;
    offerProcessedRef.current = false;

    // ----------------------------------------
    // RESET ICE PROCESSING
    // ----------------------------------------
    iceProcessingRef.current =
      Promise.resolve();

    // ----------------------------------------
    // STOP CAMERA + MICROPHONE
    // ----------------------------------------
    try {
      stopLocalStream();
    } catch (error) {
      console.log(
        '❌ Media cleanup error:',
        error
      );
    }

    // ----------------------------------------
    // CLOSE PEER CONNECTION
    // ----------------------------------------
    if (peerRef.current) {
      try {
        peerRef.current.ontrack = null;
        peerRef.current.onicecandidate = null;
        peerRef.current.oniceconnectionstatechange =
          null;
        peerRef.current.onconnectionstatechange =
          null;
        peerRef.current.close();
      } catch (error) {
        console.log(
          '❌ Peer cleanup error:',
          error
        );
      }
    }

    peerRef.current = null;

    // ----------------------------------------
    // REMOTE STREAM
    // ----------------------------------------
    try {
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks?.().forEach((track) => {
          try { track.stop(); } catch (_) {}
        });
        remoteStreamRef.current = null;
      }
    } catch (error) {
      console.log('❌ Remote media cleanup error:', error);
    }

    if (mountedRef.current) {
      setRemoteStream(null);
      setConnected(false);
      setBusy(false);
    }

    // Explicitly restore normal app audio/speaker routing after WebRTC.
    setCallAudioMode(false);

    // ----------------------------------------
    // NAVIGATION
    // ----------------------------------------
    if (goBack) {
      safeGoBack();
    }
  };

  // ==========================================
  // FORMAT TIMER
  // ==========================================
  const formatTime = (value) => {
    const minutes = Math.floor(
      value / 60
    )
      .toString()
      .padStart(2, '0');

    const seconds = (
      value % 60
    )
      .toString()
      .padStart(2, '0');

    return `${minutes}:${seconds}`;
  };

  // ==========================================
  // RETURN API
  // ==========================================
  return {
    type,
    name,
    isCaller,

    localStream,
    localStreamRef,

    remoteStream,


    isMuted,
    isCameraOff,
    facing,

    status,
    connected,
    timer,
    busy,

    acceptCall,
    declineCall,
    endCall,

    toggleMute,
    toggleCamera,
    switchCamera,

    formatTime,
  };
}
