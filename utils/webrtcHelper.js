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
  // Keep one stable MediaStream and add every
  // remote track to it. On Android, audio can
  // arrive before video; handing the first stream
  // object directly to RTCView can leave the video
  // surface black when the video track is attached later.
  const remoteMediaStream = new MediaStream();
  const remoteTrackIds = new Set();

  const publishRemoteStream = (source) => {
    try {
      if (source?.getTracks) {
        source.getTracks().forEach((track) => {
          if (!track || !track.id || remoteTrackIds.has(track.id)) {
            return;
          }

          try {
            if (track.enabled === false) {
              track.enabled = true;
            }
          } catch (trackError) {
            console.log('⚠️ Remote track enable error:', trackError);
          }

          try {
            remoteMediaStream.addTrack(track);
            remoteTrackIds.add(track.id);
            console.log(
              '✅ Remote track attached:',
              track.kind,
              track.id
            );
          } catch (addTrackError) {
            console.log(
              '⚠️ Remote track attach error:',
              addTrackError
            );
          }
        });
      }

      if (onTrack && remoteMediaStream.getTracks().length > 0) {
        onTrack(remoteMediaStream);
      }
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

      if (event.track) {
        publishRemoteStream(new MediaStream([event.track]));
      }

      if (event.streams && event.streams[0]) {
        publishRemoteStream(event.streams[0]);
      }
    } catch (error) {
      console.log('❌ Remote Track Error:', error);
    }
  };

  // Older RN WebRTC builds may still expose
  // onaddstream; keep it as a compatibility path.
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
