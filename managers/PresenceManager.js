// ==========================================
// FILE: managers/PresenceManager.js
// ==========================================
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function PresenceManager({ user }) {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const userRef = doc(db, 'users', user.uid);

    const setOnline = async () => {
      try { await setDoc(userRef, { online: true, lastSeen: serverTimestamp() }, { merge: true }); }
      catch (error) { console.log('Presence online error:', error); }
    };

    const setOffline = async () => {
      try { await setDoc(userRef, { online: false, lastSeen: serverTimestamp() }, { merge: true }); }
      catch (error) { console.log('Presence offline error:', error); }
    };

    setOnline();

    const subscription = AppState.addEventListener('change', async (nextState) => {
      const previousState = appState.current;
      appState.current = nextState;
      const wasInactive = previousState === 'inactive' || previousState === 'background';
      if (nextState === 'active' && wasInactive) await setOnline();
      if (nextState === 'inactive' || nextState === 'background') await setOffline();
    });

    return () => {
      subscription.remove();
      setOffline();
    };
  }, [user]);

  return null;
}
