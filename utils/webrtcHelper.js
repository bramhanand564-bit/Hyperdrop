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

  const pc = new RTCPeerConnection(
    ICE_SERVERS
  );

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

  // We keep our own remote MediaStream because
  // some React Native WebRTC versions may send
  // ontrack without event.streams.
  let remoteMediaStream = null;

  pc.ontrack = (event) => {
    try {
      console.log(
        '📥 Remote track received:',
        event.track?.kind
      );

      // --------------------------------------
      // If browser/RN gives us a stream,
      // use it directly.
      // --------------------------------------
      if (
        event.streams &&
        event.streams.length > 0 &&
        event.streams[0]
      ) {
        const remoteStream =
          event.streams[0];

        console.log(
          '🎥 Remote stream received directly'
        );

        if (onTrack) {
          onTrack(remoteStream);
        }

        return;
      }

      // --------------------------------------
      // Fallback:
      // Build MediaStream from individual tracks.
      // --------------------------------------
      if (!remoteMediaStream) {
        remoteMediaStream =
          new MediaStream();
      }

      if (event.track) {
        try {
          remoteMediaStream.addTrack(
            event.track
          );
        } catch (addTrackError) {
          console.log(
            '⚠️ Remote track already added or could not be added:',
            addTrackError
          );
        }
      }

      console.log(
        '📺 Remote MediaStream built from track'
      );

      if (onTrack) {
        onTrack(remoteMediaStream);
      }
    } catch (error) {
      console.log(
        '❌ Remote Track Error:',
        error
      );
    }
  };

  // ========================================
  // OLD REACT-NATIVE FALLBACK
  // ========================================
  pc.onaddstream = (event) => {
    try {
      if (event.stream) {
        console.log(
          '📥 Remote stream received via onaddstream'
        );

        if (onTrack) {
          onTrack(event.stream);
        }
      }
    } catch (error) {
      console.log(
        '❌ onaddstream Error:',
        error
      );
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

    console.log(
      '🧊 Local ICE candidate generated'
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
