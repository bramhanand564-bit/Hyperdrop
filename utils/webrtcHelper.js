// ==========================================
// FILE: utils/webrtcHelper.js
// ==========================================

import {
  RTCPeerConnection,
  RTCIceCandidate,
  MediaStream,
} from 'react-native-webrtc';

// ==========================================
// ICE SERVERS
// ==========================================
const ICE_SERVERS = {
  iceServers: [
    // STUN
    {
      urls: 'stun:stun.l.google.com:19302',
    },
    {
      urls: 'stun:stun1.l.google.com:19302',
    },

    // TURN - UDP/TCP
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turns:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

// ==========================================
// CREATE PEER CONNECTION
// ==========================================
export function createPeerConnection(
  stream,
  type,
  onTrack,
  onIceCandidate
) {
  console.log(
    '🚀 Creating WebRTC PeerConnection:',
    type
  );

  const pc = new RTCPeerConnection({
    ...ICE_SERVERS,
    sdpSemantics: 'unified-plan',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  });

  // ========================================
  // LOCAL CAMERA + MICROPHONE
  // ========================================
  if (stream) {
    const tracks = stream.getTracks();

    console.log(
      '🎥 Local tracks:',
      tracks.map((track) => ({
        kind: track.kind,
        id: track.id,
        enabled: track.enabled,
      }))
    );

    tracks.forEach((track) => {
      try {
        pc.addTrack(track, stream);

        console.log(
          `✅ Local ${track.kind} track added`
        );
      } catch (error) {
        console.log(
          `❌ Failed to add ${track.kind} track:`,
          error
        );
      }
    });
  } else {
    console.log(
      '⚠️ No local stream supplied'
    );
  }

  // ========================================
  // REMOTE STREAM
  // ========================================
  // Prefer the native stream supplied by WebRTC in event.streams[0].
  // RTCView resolves streamURL through the native WebRTC module, so
  // keeping that native stream avoids black surfaces on Android.
  let fallbackRemoteStream = null;

  const publishRemoteStream = (stream) => {
    if (!stream || !onTrack) {
      return;
    }

    try {
      const videoTracks = stream.getVideoTracks?.() || [];
      const audioTracks = stream.getAudioTracks?.() || [];
      console.log(
        '🎥 Publishing native remote stream:',
        stream.toURL?.(),
        {
          audio: audioTracks.length,
          video: videoTracks.length,
        }
      );

      // On video calls, do not mount RTCView for an audio-only ontrack event.
      // Mounting too early can leave Android RTCView stuck on a black surface.
      // Wait until the native stream actually contains a video track.
      if (type === 'video' && videoTracks.length === 0) {
        console.log(
          '⏳ Waiting for remote video track before publishing stream'
        );
        return;
      }

      onTrack(stream);
    } catch (error) {
      console.log('❌ Remote stream publish error:', error);
    }
  };

  pc.ontrack = (event) => {
    try {
      console.log(
        '📥 Remote track received:',
        event.track?.kind,
        event.track?.id
      );

      // Primary path: use the native MediaStream sent with the track.
      if (event.streams && event.streams.length > 0 && event.streams[0]) {
        publishRemoteStream(event.streams[0]);
        return;
      }

      // Compatibility fallback when the platform does not provide streams.
      if (!fallbackRemoteStream) {
        fallbackRemoteStream = new MediaStream();
      }

      if (event.track) {
        const alreadyThere = (fallbackRemoteStream.getTracks?.() || [])
          .some((track) => track.id === event.track.id);

        if (!alreadyThere) {
          fallbackRemoteStream.addTrack(event.track);
        }
      }

      publishRemoteStream(fallbackRemoteStream);
    } catch (error) {
      console.log('❌ Remote Track Error:', error);
    }
  };

  pc.onaddstream = (event) => {
    try {
      if (event.stream) {
        console.log('📥 Remote stream received via onaddstream');
        publishRemoteStream(event.stream);
      }
    } catch (error) {
      console.log('❌ onaddstream Error:', error);
    }
  };

  // ========================================
  // LOCAL ICE CANDIDATES
  // ========================================
  pc.onicecandidate = (event) => {
    if (!event.candidate) {
      console.log(
        '🧊 ICE gathering completed'
      );
      return;
    }

    const candidate = event.candidate;
    const candidateLine = candidate.candidate || '';
    const candidateType =
      candidateLine.match(/ typ ([a-z0-9]+)/i)?.[1] || 'unknown';

    console.log(
      '🧊 Local ICE candidate generated:',
      {
        type: candidateType,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
      }
    );

    if (onIceCandidate) {
      try {
        onIceCandidate(
          event.candidate
        );
      } catch (error) {
        console.log(
          '❌ ICE callback error:',
          error
        );
      }
    }
  };

  // ========================================
  // ICE GATHERING STATE
  // ========================================
  pc.onicegatheringstatechange = () => {
    console.log(
      '🧊 ICE Gathering State:',
      pc.iceGatheringState
    );
  };

  // ========================================
  // ICE CONNECTION STATE
  // ========================================
  pc.oniceconnectionstatechange = () => {
    console.log(
      '🧊 ICE Connection State:',
      pc.iceConnectionState
    );
  };

  // ========================================
  // CONNECTION STATE
  // ========================================
  pc.onconnectionstatechange = () => {
    console.log(
      '📡 WebRTC Connection State:',
      pc.connectionState
    );
  };

  // ========================================
  // SIGNALING STATE
  // ========================================
  pc.onsignalingstatechange = () => {
    console.log(
      '📶 Signaling State:',
      pc.signalingState
    );
  };

  // ========================================
  // ICE CANDIDATE ERROR
  // ========================================
  pc.onicecandidateerror = (event) => {
    console.log(
      '❌ ICE Candidate Error:',
      event
    );
  };

  console.log(
    '✅ WebRTC PeerConnection ready'
  );

  return pc;
}

// ==========================================
// PROCESS QUEUED ICE CANDIDATES
// ==========================================
export async function processIceQueue(
  pc,
  queueRef
) {
  if (!pc) {
    console.log(
      '⚠️ Cannot process ICE queue: PC missing'
    );
    return;
  }

  if (!pc.remoteDescription) {
    console.log(
      '⏳ Remote description not ready; keeping ICE queue'
    );
    return;
  }

  while (
    queueRef.current &&
    queueRef.current.length > 0
  ) {
    const candidateData =
      queueRef.current.shift();

    if (!candidateData) {
      continue;
    }

    try {
      await pc.addIceCandidate(
        new RTCIceCandidate(
          candidateData
        )
      );

      console.log(
        '✅ Queued ICE candidate added'
      );
    } catch (error) {
      console.log(
        '❌ Queued ICE candidate error:',
        error
      );
    }
  }
}
