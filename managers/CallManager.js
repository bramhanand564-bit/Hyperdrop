// ==========================================
// FILE: managers/CallManager.js
// ==========================================
import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function CallManager({ user, navigationRef }) {
  const handledCalls = useRef(new Set());

  useEffect(() => {
    if (!user?.uid) return undefined;

    const callsQuery = query(collection(db, 'calls'), where('receiverId', '==', user.uid));

    const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added' && change.type !== 'modified') return;
        
        const callId = change.doc.id;
        const call = change.doc.data();
        
        if (call.status !== 'ringing' || handledCalls.current.has(callId)) return;
        handledCalls.current.add(callId);

        const openCall = () => {
          if (!navigationRef?.isReady()) {
            handledCalls.current.delete(callId);
            return;
          }
          const currentRoute = navigationRef.getCurrentRoute();
          if (currentRoute?.name === 'Call') return;

          navigationRef.navigate('Call', {
            callId,
            type: call.type || 'voice',
            name: call.callerName || 'Nax User',
            friendId: call.callerId || null,
            isCaller: false
          });
        };

        navigationRef?.isReady() ? openCall() : setTimeout(openCall, 700);
      });
    });

    return () => unsubscribe();
  }, [user, navigationRef]);

  return null;
}
