import { useRef, useState, useCallback } from 'react';

const CHUNK_SIZE = 64 * 1024; // 64KB

export const useWebRTC = (signalingUrl: string) => {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const ws = useRef<WebSocket | null>(null);
  
  // Receiver ke streaming variables
  const fileStream = useRef<FileSystemWritableFileStream | null>(null);
  const receivedSize = useRef<number>(0);
  const expectedSize = useRef<number>(0);

  const [status, setStatus] = useState<string>('disconnected');
  const [progress, setProgress] = useState<number>(0);
  const [roomCode, setRoomCode] = useState<string>('');
  const [incomingFile, setIncomingFile] = useState<{name: string, size: number} | null>(null);

  const init = useCallback((roomToJoin?: string) => {
    ws.current = new WebSocket(signalingUrl);
    
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

  const createOffer = async (room: string) => {
    dataChannel.current = peerConnection.current!.createDataChannel('hyperdrop-transfer', { ordered: true });
    setupDataChannel();
    const offer = await peerConnection.current?.createOffer();
    await peerConnection.current?.setLocalDescription(offer);
    ws.current?.send(JSON.stringify({ type: 'signal', room, payload: { sdp: offer } }));
  };

  peerConnection.current?.addEventListener('datachannel', (event) => {
    dataChannel.current = event.channel;
    setupDataChannel();
  });

  const setupDataChannel = () => {
    if (!dataChannel.current) return;
    dataChannel.current.binaryType = 'arraybuffer';
    
    dataChannel.current.onopen = () => setStatus('ready_to_transfer');
    dataChannel.current.onclose = () => setStatus('disconnected');
    
    dataChannel.current.onmessage = async (event) => {
      // 1. Agar text data hai (Metadata ya commands)
      if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);
        if (data.type === 'metadata') {
          setIncomingFile({ name: data.name, size: data.size });
          expectedSize.current = data.size;
          setStatus('incoming_file');
        } else if (data.type === 'transfer_ready') {
          // Sender ko pata chal gaya ki receiver ne 'Save' par click kar diya hai
          setStatus('transferring');
        } else if (data.type === 'transfer_complete') {
          await fileStream.current?.close();
          setStatus('success');
        }
      } 
      // 2. Agar binary data hai (File chunks)
      else {
        if (fileStream.current) {
          await fileStream.current.write(event.data);
          receivedSize.current += event.data.byteLength;
          setProgress(Math.round((receivedSize.current / expectedSize.current) * 100));
        }
      }
    };
  };

  // Receiver jab 'Save' click karega
  const acceptDownload = async () => {
    if (!incomingFile || !dataChannel.current) return;
    
    try {
      // File save karne ke liye storage permission aur location mangna
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: incomingFile.name
      });
      fileStream.current = await handle.createWritable();
      
      setStatus('transferring');
      // Sender ko batao ki stream open ho gayi hai, file bhejajani shuru karo
      dataChannel.current.send(JSON.stringify({ type: 'transfer_ready' }));
    } catch (err) {
      console.error("Download cancelled or failed", err);
      setStatus('ready_to_transfer'); // Reset
    }
  };

  const sendFile = async (file: File) => {
    if (!dataChannel.current || dataChannel.current.readyState !== 'open') return;

    // Pehle metadata bhejo
    dataChannel.current.send(JSON.stringify({ type: 'metadata', name: file.name, size: file.size }));
    setStatus('waiting_for_receiver_accept');

    // Chunks bhejne ka function humne setupDataChannel me 'transfer_ready' aane par start karna hai
    const startChunking = () => {
      let offset = 0;
      dataChannel.current!.bufferedAmountLowThreshold = CHUNK_SIZE * 2;

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
          dataChannel.current!.send(JSON.stringify({ type: 'transfer_complete' }));
          setStatus('success');
        }
      };

      readSlice(0);
    };

    // Listen for receiver ready
    const handleReceiverReady = (event: MessageEvent) => {
      if (typeof event.data === 'string' && JSON.parse(event.data).type === 'transfer_ready') {
        startChunking();
        dataChannel.current?.removeEventListener('message', handleReceiverReady as any);
      }
    };
    dataChannel.current.addEventListener('message', handleReceiverReady as any);
  };

  return { init, sendFile, acceptDownload, status, progress, roomCode, incomingFile };
};
