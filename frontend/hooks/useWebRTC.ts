import { useRef, useState, useCallback, useEffect } from 'react';

const CHUNK_SIZE = 64 * 1024;
const MAX_BUFFERED_AMOUNT = CHUNK_SIZE * 8;
const LOW_BUFFERED_AMOUNT = CHUNK_SIZE * 2;

type IncomingFile = { name: string; size: number; mimeType: string };
type TransferStats = { speed: number; eta: number; transferred: number; total: number };

const formatIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  if (turnUrl) servers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential });
  return servers;
};

export const useWebRTC = (signalingUrl: string) => {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const fileStream = useRef<FileSystemWritableFileStream | null>(null);
  const receivedSize = useRef(0);
  const expectedSize = useRef(0);
  const senderFile = useRef<File | null>(null);
  const senderOffset = useRef(0);
  const sending = useRef(false);
  const joinedRoom = useRef('');
  const listenersReady = useRef(false);
  const transferStartedAt = useRef(0);
  const transferStartedBytes = useRef(0);

  const [status, setStatus] = useState('disconnected');
  const [progress, setProgress] = useState(0);
  const [roomCode, setRoomCode] = useState('');
  const [incomingFile, setIncomingFile] = useState<IncomingFile | null>(null);
  const [stats, setStats] = useState<TransferStats>({ speed: 0, eta: 0, transferred: 0, total: 0 });

  const resetStats = useCallback((total = 0) => {
    transferStartedAt.current = 0;
    transferStartedBytes.current = 0;
    setStats({ speed: 0, eta: 0, transferred: 0, total });
  }, []);

  const cleanup = useCallback(async () => {
    try { await fileStream.current?.abort(); } catch {}
    fileStream.current = null;
    sending.current = false;
    senderFile.current = null;
    dataChannel.current?.close();
    peerConnection.current?.close();
    ws.current?.close();
    dataChannel.current = null;
    peerConnection.current = null;
    ws.current = null;
    joinedRoom.current = '';
    receivedSize.current = 0;
    expectedSize.current = 0;
    senderOffset.current = 0;
    listenersReady.current = false;
    resetStats();
  }, [resetStats]);

  const cancelTransfer = useCallback(() => {
    const channel = dataChannel.current;
    sending.current = false;
    senderFile.current = null;
    try { channel?.send(JSON.stringify({ type: 'transfer_cancelled' })); } catch {}
    try { fileStream.current?.abort(); } catch {}
    fileStream.current = null;
    setIncomingFile(null);
    setProgress(0);
    resetStats();
    setStatus(channel?.readyState === 'open' ? 'ready_to_transfer' : 'disconnected');
  }, [resetStats]);

  const updateStats = useCallback((transferred: number, total: number) => {
    if (!transferStartedAt.current) {
      transferStartedAt.current = performance.now();
      transferStartedBytes.current = transferred;
    }
    const elapsed = Math.max((performance.now() - transferStartedAt.current) / 1000, 0.001);
    const speed = Math.max(0, (transferred - transferStartedBytes.current) / elapsed);
    const remaining = Math.max(0, total - transferred);
    setStats({ speed, eta: speed > 0 ? remaining / speed : 0, transferred, total });
  }, []);

  const sendNextChunk = useCallback(async () => {
    const channel = dataChannel.current;
    const file = senderFile.current;
    if (!channel || !file || !sending.current || channel.readyState !== 'open') return;

    while (sending.current && senderOffset.current < file.size && channel.readyState === 'open' && channel.bufferedAmount <= MAX_BUFFERED_AMOUNT) {
      const start = senderOffset.current;
      const chunk = await file.slice(start, start + CHUNK_SIZE).arrayBuffer();
      if (!sending.current || channel.readyState !== 'open') return;
      channel.send(chunk);
      senderOffset.current += chunk.byteLength;
      setProgress(Math.round((senderOffset.current / file.size) * 100));
      updateStats(senderOffset.current, file.size);
    }

    if (senderOffset.current >= file.size && sending.current) {
      sending.current = false;
      channel.send(JSON.stringify({ type: 'transfer_complete' }));
      setProgress(100);
      setStatus('success');
    }
  }, [updateStats]);

  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    if (listenersReady.current && dataChannel.current === channel) return;
    listenersReady.current = true;
    dataChannel.current = channel;
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = LOW_BUFFERED_AMOUNT;
    channel.onopen = () => setStatus('ready_to_transfer');
    channel.onclose = () => { sending.current = false; setStatus('disconnected'); };
    channel.onerror = () => setStatus('error');
    channel.onbufferedamountlow = () => { void sendNextChunk(); };

    channel.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        let data: any;
        try { data = JSON.parse(event.data); } catch { return; }
        if (data.type === 'metadata') {
          receivedSize.current = 0;
          expectedSize.current = Number(data.size) || 0;
          setIncomingFile({ name: String(data.name || 'download'), size: expectedSize.current, mimeType: String(data.mimeType || 'application/octet-stream') });
          setProgress(0);
          resetStats(expectedSize.current);
          setStatus('incoming_file');
        } else if (data.type === 'transfer_ready') {
          setStatus('transferring');
          if (!sending.current) {
            sending.current = true;
            senderOffset.current = 0;
            transferStartedAt.current = performance.now();
            transferStartedBytes.current = 0;
            void sendNextChunk();
          }
        } else if (data.type === 'transfer_cancelled') {
          sending.current = false;
          senderFile.current = null;
          setIncomingFile(null);
          resetStats();
          setStatus('ready_to_transfer');
        } else if (data.type === 'transfer_complete' && fileStream.current) {
          try {
            await fileStream.current.close();
            fileStream.current = null;
            setProgress(100);
            updateStats(expectedSize.current, expectedSize.current);
            setStatus('success');
          } catch (error) {
            console.error('Failed to finalize downloaded file', error);
            setStatus('error');
          }
        }
        return;
      }

      const chunk = event.data instanceof ArrayBuffer ? event.data : event.data instanceof Blob ? await event.data.arrayBuffer() : null;
      if (!chunk || !fileStream.current || expectedSize.current <= 0) return;
      try {
        await fileStream.current.write(chunk);
        receivedSize.current += chunk.byteLength;
        setProgress(Math.min(100, Math.round((receivedSize.current / expectedSize.current) * 100)));
        updateStats(receivedSize.current, expectedSize.current);
      } catch (error) {
        console.error('Failed to write received chunk', error);
        setStatus('error');
        try { await fileStream.current.abort(); } catch {}
        fileStream.current = null;
      }
    };
  }, [resetStats, sendNextChunk, updateStats]);

  const createOffer = useCallback(async (room: string) => {
    const pc = peerConnection.current;
    if (!pc) return;
    const channel = pc.createDataChannel('hyperdrop-transfer', { ordered: true });
    setupDataChannel(channel);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.current?.send(JSON.stringify({ type: 'signal', room, payload: { sdp: pc.localDescription } }));
  }, [setupDataChannel]);

  const init = useCallback((roomToJoin?: string) => {
    void (async () => {
      await cleanup();
      const pc = new RTCPeerConnection({ iceServers: formatIceServers() });
      const socket = new WebSocket(signalingUrl);
      peerConnection.current = pc;
      ws.current = socket;
      joinedRoom.current = roomToJoin || '';
      pc.onicecandidate = (event) => {
        if (!event.candidate || socket.readyState !== WebSocket.OPEN) return;
        const room = joinedRoom.current;
        if (room) socket.send(JSON.stringify({ type: 'signal', room, payload: { candidate: event.candidate } }));
      };
      pc.ondatachannel = (event) => setupDataChannel(event.channel);
      socket.onopen = () => {
        if (roomToJoin) { setRoomCode(roomToJoin); socket.send(JSON.stringify({ type: 'join_room', room: roomToJoin })); }
        else socket.send(JSON.stringify({ type: 'create_room' }));
      };
      socket.onmessage = async (message) => {
        let data: any;
        try { data = JSON.parse(message.data); } catch { return; }
        if (data.type === 'room_created') { joinedRoom.current = data.room; setRoomCode(data.room); setStatus('waiting_for_receiver'); }
        else if (data.type === 'joined') setStatus('connected');
        else if (data.type === 'peer_joined') { setStatus('connected'); await createOffer(joinedRoom.current); }
        else if (data.type === 'peer_left') setStatus('disconnected');
        else if (data.type === 'error') { console.error(data.message); setStatus('error'); }
        else if (data.type === 'signal') {
          const payload = data.payload;
          if (payload?.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            if (payload.sdp.type === 'offer') {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.send(JSON.stringify({ type: 'signal', room: joinedRoom.current, payload: { sdp: pc.localDescription } }));
            }
          } else if (payload?.candidate) {
            try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch (error) { console.error('Failed to add ICE candidate', error); }
          }
        }
      };
      socket.onerror = () => setStatus('error');
      socket.onclose = () => setStatus('disconnected');
    })();
  }, [cleanup, createOffer, signalingUrl, setupDataChannel]);

  const acceptDownload = useCallback(async () => {
    const file = incomingFile;
    const channel = dataChannel.current;
    if (!file || !channel || channel.readyState !== 'open') return;
    try {
      if (!('showSaveFilePicker' in window)) throw new Error('This browser does not support direct file saving.');
      const extension = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
      const handle = await (window as any).showSaveFilePicker({ suggestedName: file.name, types: [{ description: 'File', accept: { [file.mimeType || 'application/octet-stream']: extension ? [extension] : [] } }] });
      fileStream.current = await handle.createWritable();
      receivedSize.current = 0;
      expectedSize.current = file.size;
      resetStats(file.size);
      setProgress(0);
      setStatus('transferring');
      channel.send(JSON.stringify({ type: 'transfer_ready' }));
    } catch (error) {
      console.error('Download cancelled or failed', error);
      setStatus('ready_to_transfer');
    }
  }, [incomingFile, resetStats]);

  const sendFile = useCallback((file: File) => {
    const channel = dataChannel.current;
    if (!channel || channel.readyState !== 'open' || !file) return;
    senderFile.current = file;
    senderOffset.current = 0;
    sending.current = false;
    resetStats(file.size);
    setProgress(0);
    setStatus('waiting_for_receiver_accept');
    channel.send(JSON.stringify({ type: 'metadata', name: file.name, size: file.size, mimeType: file.type || 'application/octet-stream' }));
  }, [resetStats]);

  return { init, sendFile, acceptDownload, cancelTransfer, status, progress, roomCode, incomingFile, stats };
};
