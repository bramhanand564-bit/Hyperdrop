// ==========================================
// FILE: managers/P2PManager.js
// ==========================================
import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
const getWebRTC = () => require('../utils/webrtcHelper').default;
const getFileTransfer = () => require('../utils/webrtcFileTransfer'); 

// ==========================================
// 🎮 NAX EXPERIENCE SYNC ENGINE (New Feature)
// ==========================================
// इसे अलग से export कर रहे हैं ताकि WebPortalScreen इसे सीधा यूज़ कर सके
export const ExperienceSyncEngine = {
  activeRoomId: null,

  joinExperienceRoom: async (roomId, user, onSyncUpdate) => {
    console.log(`[Experience Engine] ${user?.displayName || 'User'} joining Room: ${roomId}`);
    ExperienceSyncEngine.activeRoomId = roomId;
    
    // WebRTC रूम से कनेक्ट करना
    getWebRTC().connectToRoom(roomId, user?.uid, (peerId, message) => {
      try {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage.type === 'EXPERIENCE_SYNC') {
          console.log(`[Portal Engine] Sync data received from ${peerId}:`, parsedMessage.data);
          onSyncUpdate(parsedMessage.data); 
        }
      } catch (error) {
        console.error("Error parsing P2P message:", error);
      }
    });
  },

  broadcastExperienceState: (syncData) => {
    if (!PortalSyncEngine.activeRoomId) {
      console.warn("Cannot broadcast: Not in a Experience Room.");
      return;
    }
    const payload = JSON.stringify({ type: 'PORTAL_SYNC', data: syncData });
    getWebRTC().broadcast(PortalSyncEngine.activeRoomId, payload);
    console.log(`[Portal Engine] State Broadcasted:`, syncData);
  },

  leaveRoom: () => {
    if (PortalSyncEngine.activeRoomId) {
      getWebRTC().disconnect(PortalSyncEngine.activeRoomId);
      PortalSyncEngine.activeRoomId = null;
      console.log("[Portal Engine] Left Portal Room");
    }
  }
};

// ==========================================
// 🔒 ORIGINAL FILE TRANSFER MANAGER (Untouched)
// ==========================================
export default function P2PManager({ user }) {
  const activeTransfers = useRef(new Set());

  useEffect(() => {
    if (!user?.uid) return undefined;
    
    const transfersQuery = query(collection(db, 'file_transfers'), where('receiverId', '==', user.uid), where('status', 'in', ['offering', 'waiting_for_answer']));

    const unsubscribe = onSnapshot(transfersQuery, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type !== 'added') return;
        
        const transferId = change.doc.id;
        if (activeTransfers.current.has(transferId)) return;
        activeTransfers.current.add(transferId);

        try {
          const { acceptP2PTransfer, attachFileReceiver, saveReceivedFile, markP2PTransferFailed, markP2PTransferCompleted } = getFileTransfer();
          const transfer = change.doc.data();
          const connection = await acceptP2PTransfer({ transferId, receiverId: user.uid });
          let receiverCleanup = null;

          receiverCleanup = attachFileReceiver({
            dataChannel: connection.dataChannel,
            onStart: (fileInfo) => console.log('Receiving P2P file:', fileInfo.fileName),
            onProgress: (progress) => console.log('P2P receive progress:', Math.round(progress * 100), '%'),
            onComplete: async (result) => {
              try {
                const fileUri = await saveReceivedFile({ base64: result.base64, fileName: result.fileName });
                await addDoc(collection(db, 'chats', transfer.chatId, 'messages'), {
                  senderId: transfer.senderId, receiverId: transfer.receiverId,
                  text: '', type: 'file', fileName: result.fileName, mimeType: result.mimeType,
                  fileSize: result.fileSize, fileUri, storage: 'p2p', transferId,
                  createdAt: serverTimestamp(), read: false
                });
                await markP2PTransferCompleted(transferId);
                if (receiverCleanup) receiverCleanup();
                connection.cleanup();
              } catch (error) {
                await markP2PTransferFailed(transferId, error?.message || 'Failed to save received file');
                connection.cleanup();
              }
            },
            onError: async (error) => {
              await markP2PTransferFailed(transferId, error?.message || 'P2P receiver error');
              connection.cleanup();
            }
          });
        } catch (error) {
          await markP2PTransferFailed(transferId, error?.message || 'Unable to accept P2P transfer');
        }
      });
    });
    return () => unsubscribe();
  }, [user]);

  return null;
}
