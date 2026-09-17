import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type Moment = { id: string; userId?: string; userName?: string; userImg?: string; text?: string; media?: string; likes?: string[]; commentsCount?: number; createdAt?: any };

export function subscribeToMoments(callback: (items: Moment[]) => void) {
  return onSnapshot(query(collection(db, 'global_moments'), orderBy('createdAt', 'desc')), snapshot => callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Moment))));
}

export async function publishMoment(text: string, media = '') {
  const user = auth.currentUser;
  if (!user || (!text.trim() && !media.trim())) return;
  await addDoc(collection(db, 'global_moments'), { userId: user.uid, userName: user.displayName || user.email?.split('@')[0] || 'User', userImg: user.photoURL || '', text: text.trim(), media: media.trim(), likes: [], commentsCount: 0, createdAt: serverTimestamp() });
}

export async function toggleMomentLike(moment: Moment) {
  const uid = auth.currentUser?.uid; if (!uid) return;
  const likes = moment.likes || [];
  await updateDoc(doc(db, 'global_moments', moment.id), { likes: likes.includes(uid) ? likes.filter(id => id !== uid) : [...likes, uid] });
}

export async function removeMoment(id: string) { await deleteDoc(doc(db, 'global_moments', id)); }
