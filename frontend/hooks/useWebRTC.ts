import { useRef, useState, useCallback } from 'react';

const CHUNK_SIZE = 64 * 1024; // 64KB chunks taaki RAM overflow na ho

export const useWebRTC = (signalingUrl: string) => {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const ws = useRef<WebSocket | null>(null);

  const [status, setStatus] = useState<string>('disconnected');
  const [progress, setProgress] = useState<number>(0);
  const [roomCode, setRoomCode] = useState<string>('');

  // 1. WebSocket se Signaling Server se judna
  const init = useCallback((roomToJoin?: string) => {
    ws.current = new WebSocket(signalingUrl);
    
    // Google ka free STUN server use kar rahe hain
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        ws.current?.send(JSON.stringify({ type: 'signal', room: roomCode || roomToJoin, payload: { candidate: event.candidate } }));
      }
    };

    ws.current.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      
      if (data.type === 'room_created') {
        setRoomCode(data.room);
        setStatus('waiting_for_receiver');
      } else if (data.type === 'joined' || data.type === 'peer_joined') {
        setStatus('connected');
        if (data.type === 'peer_joined') createOffer(roomCode || roomToJoin!);
      } else if (data.type === 'signal') {
        if (data.payload.sdp) {
          await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.payload.sdp));
          if (data.payload.sdp.type === 'offer') {
            const answer = await peerConnection.current?.createAnswer();
            await peerConnection.current?.setLocalDescription(answer);
            ws.current?.send(JSON.stringify({ type: 'signal', room: roomCode || roomToJoin, payload: { sdp: answer } }));
          }
        } else if (data.payload.candidate) {
          await peerConnection.current?.addIceCandidate(new RTCIceCandidate(data.payload.candidate));
        }
      }
    };

    ws.current.onopen = () => {
      if (roomToJoin) {
        setRoomCode(roomToJoin);
        ws.current?.send(JSON.stringify({ type: 'join_room', room: roomToJoin }));
      } else {
        ws.current?.send(JSON.stringify({ type: 'create_room' }));
      }
    };
  }, [roomCode, signalingUrl]);

  // 2. Direct P2P Connection banana
  const createOffer = async (room: string) => {
    dataChannel.current = peerConnection.current!.createDataChannel('hyperdrop-transfer', { ordered: true });
    setupDataChannel();

    const offer = await peerConnection.current?.createOffer();
    await peerConnection.current?.setLocalDescription(offer);
    ws.current?.send(JSON.stringify({ type: 'signal', room, payload: { sdp: offer } }));
  };

  // Receiver ke liye Data Channel Setup
  peerConnection.current?.addEventListener('datachannel', (event) => {
    dataChannel.current = event.channel;
    setupDataChannel();
  });

  const setupDataChannel = () => {
    if (!dataChannel.current) return;
    dataChannel.current.binaryType = 'arraybuffer';
    
    dataChannel.current.onopen = () => setStatus('ready_to_transfer');
    dataChannel.current.onclose = () => setStatus('disconnected');
    
    dataChannel.current.onmessage = (event) => {
      // Yahan hum Receiver ka file download logic likhenge (Next step me)
      console.log("Data received", event.data);
    };
  };

  // 3. Sender ka file bhejne ka logic (with chunking)
  const sendFile = async (file: File) => {
    if (!dataChannel.current || dataChannel.current.readyState !== 'open') return;

    setStatus('transferring');
    dataChannel.current.send(JSON.stringify({ name: file.name, size: file.size, type: file.type }));

    let offset = 0;
    dataChannel.current.bufferedAmountLowThreshold = CHUNK_SIZE * 2;

    const readSlice = (o: number) => {
      const slice = file.slice(offset, o + CHUNK_SIZE);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (dataChannel.current!.bufferedAmount > dataChannel.current!.bufferedAmountLowThreshold) {
          dataChannel.current!.onbufferedamountlow = () => {
            dataChannel.current!.onbufferedamountlow = null;
            sendChunk(e.target!.result as ArrayBuffer);
          };
        } else {
          sendChunk(e.target!.result as ArrayBuffer);
        }
      };
      reader.readAsArrayBuffer(slice);
    };

    const sendChunk = (buffer: ArrayBuffer) => {
      dataChannel.current!.send(buffer);
      offset += buffer.byteLength;
      setProgress(Math.round((offset / file.size) * 100));

      if (offset < file.size) {
        readSlice(offset);
      } else {
        setStatus('success');
      }
    };

    readSlice(0);
  };

  return { init, sendFile, status, progress, roomCode };
};
