import { auth, db } from '../firebaseConfig';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

function uid() {
  const value = auth.currentUser?.uid;
  if (!value) throw new Error('Login required.');
  return value;
}

const sessions = collection(db, 'app_sessions');

export const NaxAppSessionAPI = {
  async createSession(appId, maxPlayers = 4) {
    const me = uid();
    if (!appId) throw new Error('App id is required.');
    const safeMax = Math.min(16, Math.max(2, Number(maxPlayers) || 4));
    const ref = await addDoc(sessions, {
      appId,
      hostId: me,
      status: 'waiting',
      maxPlayers: safeMax,
      playerCount: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'app_sessions', ref.id, 'players', me), {
      uid: me,
      name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Nax User',
      joinedAt: serverTimestamp(),
      ready: true,
    });
    return { id: ref.id, appId, maxPlayers: safeMax };
  },

  async getSession(sessionId) {
    if (!sessionId) return null;
    const snap = await getDoc(doc(db, 'app_sessions', sessionId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async joinSession(sessionId) {
    const me = uid();
    const ref = doc(db, 'app_sessions', sessionId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Game room not found.');
    const data = snap.data();
    if (data.status === 'closed') throw new Error('Game room is closed.');
    const alreadyJoined = await getDoc(doc(db, 'app_sessions', sessionId, 'players', me));
    if (!alreadyJoined.exists() && Number(data.playerCount || 0) >= Number(data.maxPlayers || 4)) {
      throw new Error('Game room is full.');
    }

    await setDoc(doc(db, 'app_sessions', sessionId, 'players', me), {
      uid: me,
      name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Nax User',
      joinedAt: serverTimestamp(),
      ready: true,
    }, { merge: true });

    if (alreadyJoined.exists()) return { id: sessionId, ...data };

    const players = Number(data.playerCount || 0) + 1;
    await updateDoc(ref, {
      playerCount: players,
      status: players >= 2 ? 'active' : 'waiting',
      updatedAt: serverTimestamp(),
    });
    return { id: sessionId, ...data, playerCount: players, status: players >= 2 ? 'active' : 'waiting' };
  },

  async setState(sessionId, state) {
    const me = uid();
    if (!sessionId) throw new Error('Room id is required.');
    return setDoc(doc(db, 'app_sessions', sessionId, 'runtime', 'state'), {
      state,
      updatedBy: me,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },

  async getState(sessionId) {
    if (!sessionId) return null;
    const snap = await getDoc(doc(db, 'app_sessions', sessionId, 'runtime', 'state'));
    return snap.exists() ? snap.data().state : null;
  },

  subscribeState(sessionId, callback) {
    if (!sessionId || typeof callback !== 'function') return () => {};
    return onSnapshot(
      doc(db, 'app_sessions', sessionId, 'runtime', 'state'),
      snap => callback(snap.exists() ? (snap.data().state ?? null) : null),
      () => callback(null)
    );
  },
};

export default NaxAppSessionAPI;
