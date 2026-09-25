// ==========================================
// FILE: hooks/useCallLogic.js
// ==========================================
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
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
  const [remoteStreamVersion, setRemoteStreamVersion] = useState(0);

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
  const callRef = useRef(null);

  const cleanupListenersRef = useRef([]);

  const mountedRef = useRef(true);
  const cleanupDoneRef = useRef(false);
  const navigationHandledRef = useRef(false);

  const timerRef = useRef(null);

  // ICE candidates received before remote SDP
  const iceCandidateQueue = useRef([]);

  // Prevent concurrent ICE candidate processing
  const iceProcessingRef = useRef(Promise.resolve());

  // Prevent answer from being applied more than once
  const answerAppliedRef = useRef(false);

  // Prevent offer from being processed more than once
  const offerProcessedRef = useRef(false);

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

        setRemoteStream(remote);
        // Force RTCView to remount when audio/video tracks arrive
        // separately (common on Android WebRTC).
        setRemoteStreamVersion((value) => value + 1);
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

          await addDoc(
            collection(
              db,
              'calls',
              callId,
              collectionName
            ),
            candidate.toJSON()
          );

          console.log(
            `🧊 Local ICE candidate saved: ${collectionName}`
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

    await pc.setLocalDescription(
      offer
    );

    console.log(
      '📤 Local offer created'
    );

    // ----------------------------------------
    // SAVE OFFER
    // ----------------------------------------
    await updateDoc(callDoc, {
      offer: {
        type: offer.type,
        sdp: offer.sdp,
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
            '📥 Applying remote answer'
          );

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
      // GET CALL DOCUMENT
      // ----------------------------------------
      const snap =
        await getDoc(callDoc);

      const data =
        snap.data();

      if (!data) {
        throw new Error(
          'Call no longer exists.'
        );
      }

      if (!data.offer) {
        throw new Error(
          'Caller offer not found.'
        );
      }

      if (
        offerProcessedRef.current
      ) {
        return;
      }

      offerProcessedRef.current =
        true;

      // ----------------------------------------
      // SET REMOTE OFFER
      // ----------------------------------------
      console.log(
        '📥 Applying caller offer'
      );

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
      await pc.setLocalDescription(
        answer
      );

      console.log(
        '📤 Local answer created'
      );

      // ----------------------------------------
      // SAVE ANSWER
      // ----------------------------------------
      await updateDoc(
        callDoc,
        {
          answer: {
            type: answer.type,
            sdp: answer.sdp,
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
    if (mountedRef.current) {
      setRemoteStream(null);
      setRemoteStreamVersion(0);
      setConnected(false);
      setBusy(false);
    }

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
    remoteStreamVersion,

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
