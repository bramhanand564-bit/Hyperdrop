// ==========================================
// FILE: utils/webrtcFileTransfer.js
// ==========================================
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';

import { db } from '../firebaseConfig';

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate
} from 'react-native-webrtc';

import * as FileSystem from 'expo-file-system';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

const CHUNK_SIZE = 12 * 1024;
const MAX_P2P_FILE_SIZE = 15 * 1024 * 1024;

function getTransferRef(transferId) {
  return doc(db, 'file_transfers', transferId);
}

function getOfferCandidatesRef(transferId) {
  return collection(db, 'file_transfers', transferId, 'offerCandidates');
}

function getAnswerCandidatesRef(transferId) {
  return collection(db, 'file_transfers', transferId, 'answerCandidates');
}

export function canUseP2PFileTransfer(fileSize) {
  return Number.isFinite(fileSize) && fileSize > 0 && fileSize <= MAX_P2P_FILE_SIZE;
}

export function getP2PFileTransferLimit() {
  return MAX_P2P_FILE_SIZE;
}

function base64ToBytes(base64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let padding = 0;
  if (base64.endsWith('==')) padding = 2;
  else if (base64.endsWith('=')) padding = 1;

  const byteLength = Math.floor((base64.length * 3) / 4) - padding;
  const bytes = new Uint8Array(byteLength);
  let byteIndex = 0;

  for (let i = 0; i < base64.length; i += 4) {
    const a = chars.indexOf(base64[i]);
    const b = chars.indexOf(base64[i + 1]);
    const c = base64[i + 2] === '=' ? 0 : chars.indexOf(base64[i + 2]);
    const d = base64[i + 3] === '=' ? 0 : chars.indexOf(base64[i + 3]);

    if (byteIndex < bytes.length) bytes[byteIndex++] = (a << 2) | (b >> 4);
    if (byteIndex < bytes.length) bytes[byteIndex++] = ((b & 15) << 4) | (c >> 2);
    if (byteIndex < bytes.length) bytes[byteIndex++] = ((c & 3) << 6) | d;
  }
  return bytes;
}

function createPeerConnection() {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

// ==========================================
// 🚀 SENDER LOGIC (CREATE TRANSFER)
// ==========================================
export async function createP2PTransfer({ senderId, receiverId, chatId, fileName, mimeType, fileSize }) {
  if (!senderId || !receiverId) throw new Error('Sender and receiver are required.');
  if (!chatId) throw new Error('Chat ID is required.');
  if (!fileName) throw new Error('File name is required.');
  if (!canUseP2PFileTransfer(fileSize)) throw new Error('File is too large for P2P.');

  const transferRef = await addDoc(collection(db, 'file_transfers'), {
    senderId, receiverId, chatId, fileName,
    mimeType: mimeType || 'application/octet-stream',
    fileSize, status: 'offering', createdAt: serverTimestamp()
  });

  const transferId = transferRef.id;
  const peerConnection = createPeerConnection();
  const dataChannel = peerConnection.createDataChannel('file', { ordered: true });
  
  let stopped = false;
  const iceCandidateQueue = []; // 🚀 FIX: RACE CONDITION QUEUE

  peerConnection.onicecandidate = async (event) => {
    if (!event.candidate || stopped) return;
    try {
      await addDoc(getOfferCandidatesRef(transferId), event.candidate.toJSON());
    } catch (error) { console.log('Offer candidate error:', error); }
  };

  dataChannel.onopen = () => console.log('P2P DataChannel open:', transferId);
  dataChannel.onerror = (error) => console.log('P2P DataChannel error:', error);
  dataChannel.onclose = () => console.log('P2P DataChannel closed:', transferId);

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  await updateDoc(transferRef, {
    offer: { type: offer.type, sdp: offer.sdp },
    status: 'waiting_for_answer'
  });

  const unsubscribeAnswer = onSnapshot(transferRef, async (snapshot) => {
    const data = snapshot.data();
    if (!data || !data.answer || peerConnection.currentRemoteDescription) return;

    try {
      const answer = new RTCSessionDescription({ type: data.answer.type, sdp: data.answer.sdp });
      await peerConnection.setRemoteDescription(answer);
      
      // 🚀 FIX: Process queued candidates ONLY AFTER Remote Description is set
      while (iceCandidateQueue.length > 0) {
        const candidate = iceCandidateQueue.shift();
        await peerConnection.addIceCandidate(candidate).catch(e => console.log(e));
      }

      await updateDoc(transferRef, { status: 'connected' });
    } catch (error) { console.log('Answer error:', error); }
  });

  const unsubscribeCandidates = onSnapshot(getAnswerCandidatesRef(transferId), async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type !== 'added') continue;
      try {
        const candidate = new RTCIceCandidate(change.doc.data());
        // 🚀 FIX: Queue candidates if remote description isn't ready
        if (!peerConnection.currentRemoteDescription) {
          iceCandidateQueue.push(candidate);
        } else {
          await peerConnection.addIceCandidate(candidate);
        }
      } catch (error) { console.log('Answer candidate error:', error); }
    }
  });

  return {
    transferId, peerConnection, dataChannel,
    cleanup: () => {
      stopped = true;
      unsubscribeAnswer();
      unsubscribeCandidates();
      try { dataChannel.close(); } catch (error) {}
      try { peerConnection.close(); } catch (error) {}
    }
  };
}

// ==========================================
// 🚀 RECEIVER LOGIC (ACCEPT TRANSFER)
// ==========================================
export async function acceptP2PTransfer({ transferId, receiverId }) {
  if (!transferId) throw new Error('Transfer ID is required.');
  if (!receiverId) throw new Error('Receiver ID is required.');

  const transferRef = getTransferRef(transferId);
  const snapshot = await new Promise((resolve, reject) => {
    const unsubscribe = onSnapshot(transferRef, (value) => {
      unsubscribe(); resolve(value);
    }, (error) => { unsubscribe(); reject(error); });
  });

  const transfer = snapshot.data();
  if (!transfer) throw new Error('File transfer not found.');
  if (transfer.receiverId !== receiverId) throw new Error('Transfer is not assigned to this user.');
  if (!transfer.offer) throw new Error('P2P offer is not available.');

  const peerConnection = createPeerConnection();
  let stopped = false;
  const iceCandidateQueue = []; // 🚀 FIX: RACE CONDITION QUEUE

  peerConnection.onicecandidate = async (event) => {
    if (!event.candidate || stopped) return;
    try {
      await addDoc(getAnswerCandidatesRef(transferId), event.candidate.toJSON());
    } catch (error) { console.log('Answer candidate error:', error); }
  };

  const dataChannelPromise = new Promise((resolve) => {
    peerConnection.ondatachannel = (event) => { resolve(event.channel); };
  });

  const offer = new RTCSessionDescription({ type: transfer.offer.type, sdp: transfer.offer.sdp });
  
  // 🚀 FIX: Set Remote Description BEFORE handling any ICE candidates
  await peerConnection.setRemoteDescription(offer);
  
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  await updateDoc(transferRef, {
    answer: { type: answer.type, sdp: answer.sdp },
    status: 'answer_sent'
  });

  const unsubscribeCandidates = onSnapshot(getOfferCandidatesRef(transferId), async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type !== 'added') continue;
      try {
        const candidate = new RTCIceCandidate(change.doc.data());
        if (!peerConnection.currentRemoteDescription) {
           iceCandidateQueue.push(candidate);
        } else {
           await peerConnection.addIceCandidate(candidate);
        }
      } catch (error) { console.log('Offer candidate error:', error); }
    }
  });

  const dataChannel = await dataChannelPromise;

  return {
    transferId, peerConnection, dataChannel,
    cleanup: () => {
      stopped = true;
      unsubscribeCandidates();
      try { dataChannel.close(); } catch (error) {}
      try { peerConnection.close(); } catch (error) {}
    }
  };
}

// ==========================================
// FILE DATA TRANSFER LOGIC (UNCHANGED)
// ==========================================
export async function sendFileOverDataChannel({ dataChannel, fileUri, fileName, mimeType, fileSize, onProgress }) {
  if (!dataChannel) throw new Error('DataChannel is required.');
  if (!fileUri) throw new Error('File URI is required.');
  if (!canUseP2PFileTransfer(fileSize)) throw new Error('File is too large for P2P.');

  const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = base64ToBytes(base64);
  const totalSize = bytes.length;

  dataChannel.send(JSON.stringify({
    type: 'file-start', fileName,
    mimeType: mimeType || 'application/octet-stream',
    fileSize: fileSize || totalSize
  }));

  let offset = 0;
  while (offset < totalSize) {
    const end = Math.min(offset + CHUNK_SIZE, totalSize);
    const chunk = bytes.slice(offset, end);
    let binary = '';
    for (let i = 0; i < chunk.length; i++) binary += String.fromCharCode(chunk[i]);
    
    dataChannel.send(JSON.stringify({ type: 'file-chunk', data: btoa(binary) }));
    offset = end;

    if (onProgress) onProgress(Math.min(offset / Math.max(totalSize, 1), 1));
    await new Promise((resolve) => { setTimeout(resolve, 0); }); // Yield to JS event loop
  }

  dataChannel.send(JSON.stringify({ type: 'file-end' }));
  return { fileName, mimeType: mimeType || 'application/octet-stream', fileSize: fileSize || totalSize };
}

export function attachFileReceiver({ dataChannel, onStart, onProgress, onComplete, onError }) {
  if (!dataChannel) throw new Error('DataChannel is required.');
  const chunks = [];
  let fileInfo = null;
  let receivedBytes = 0;

  const handleMessage = (event) => {
    try {
      if (typeof event.data !== 'string') return;
      const packet = JSON.parse(event.data);

      if (packet.type === 'file-start') {
        fileInfo = { fileName: packet.fileName, mimeType: packet.mimeType, fileSize: packet.fileSize };
        chunks.length = 0; receivedBytes = 0;
        if (onStart) onStart(fileInfo);
        return;
      }

      if (packet.type === 'file-chunk') {
        if (!fileInfo) throw new Error('File start not received.');
        chunks.push(packet.data);
        receivedBytes += base64ToBytes(packet.data).length;
        if (onProgress) onProgress(Math.min(receivedBytes / Math.max(fileInfo.fileSize, 1), 1));
        return;
      }

      if (packet.type === 'file-end') {
        if (!fileInfo) throw new Error('File information missing.');
        if (onComplete) onComplete({ ...fileInfo, base64: chunks.join('') });
      }
    } catch (error) {
      console.log('P2P receiver error:', error);
      if (onError) onError(error);
    }
  };

  dataChannel.addEventListener('message', handleMessage);
  return () => { try { dataChannel.removeEventListener('message', handleMessage); } catch (error) {} };
}

export async function saveReceivedFile({ base64, fileName }) {
  if (!base64) throw new Error('Received file is empty.');
  const safeName = String(fileName || 'received-file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!directory) throw new Error('Writable file directory unavailable.');

  const fileUri = `${directory}${Date.now()}-${safeName}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return fileUri;
}

export async function markP2PTransferFailed(transferId, reason) {
  if (!transferId) return;
  try {
    await updateDoc(getTransferRef(transferId), { status: 'failed', failureReason: reason || 'P2P transfer failed', failedAt: serverTimestamp() });
  } catch (error) {}
}

export async function markP2PTransferCompleted(transferId) {
  if (!transferId) return;
  try {
    await updateDoc(getTransferRef(transferId), { status: 'completed', completedAt: serverTimestamp() });
  } catch (error) {}
}
