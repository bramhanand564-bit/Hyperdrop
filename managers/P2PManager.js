// ==========================================
// FILE: managers/P2PManager.js
// ==========================================
import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
const getFileTransfer = () => require('../utils/webrtcFileTransfer'); 

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
