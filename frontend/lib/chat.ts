import { collection, addDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';

export type ChatUser = {
  uid: string;
  username?: string;
  name?: string;
  avatar?: string;
  isBot?: boolean;
};

export type ChatMessage = {
  id: string;
  text?: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  type?: 'text' | 'image' | 'video' | 'file';
  fileUrl?: string;
  fileName?: string;
  createdAt?: unknown;
};

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/^@/, '');
}

export async function searchUser(username: string, currentUid?: string): Promise<ChatUser | null> {
  const normalized = normalizeUsername(username);
  if (!normalized) return null;

  const usersSnap = await getDocs(query(collection(db, 'users'), where('usernameLower', '==', normalized)));
  if (!usersSnap.empty) {
    const d = usersSnap.docs[0];
    const data = d.data();
    const uid = data.uid || d.id;
    if (uid === currentUid) return null;
    return { uid, username: data.username || `@${normalized}`, name: data.name || data.displayName || data.username || normalized, avatar: data.avatar || data.photoURL || '' };
  }

  const botsSnap = await getDocs(query(collection(db, 'bots'), where('username', '==', normalized)));
  if (!botsSnap.empty) {
    const d = botsSnap.docs[0];
    const data = d.data();
    return { uid: d.id, username: data.username || `@${normalized}`, name: data.name || data.displayName || normalized, avatar: data.avatar || '', isBot: true };
  }

  return null;
}

export async function createPrivateChat(currentUid: string, friend: ChatUser) {
  const chatId = currentUid < friend.uid ? `${currentUid}_${friend.uid}` : `${friend.uid}_${currentUid}`;
  await Promise.all([
    setDoc(doc(db, 'users', currentUid, 'user_chats', chatId), { chatId, type: 'private', friendId: friend.uid, friendName: friend.name || friend.username || 'User', friendUsername: friend.username || '', friendAvatar: friend.avatar || '', updatedAt: serverTimestamp() }, { merge: true }),
    setDoc(doc(db, 'users', friend.uid, 'user_chats', chatId), { chatId, type: 'private', friendId: currentUid, friendName: 'HyperDrop User', friendUsername: '', friendAvatar: '', updatedAt: serverTimestamp() }, { merge: true })
  ]);
  return chatId;
}

export function subscribeToMessages(chatId: string, callback: (messages: ChatMessage[]) => void) {
  const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, snapshot => callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage))));
}

export async function sendChatMessage(chatId: string, sender: ChatUser, text: string) {
  const clean = text.trim();
  if (!clean) return;
  await setDoc(doc(db, 'chats', chatId), { lastUpdated: serverTimestamp(), participants: [sender.uid] }, { merge: true });
  await addDoc(collection(db, 'chats', chatId, 'messages'), { text: clean, senderId: sender.uid, senderName: sender.name || sender.username || 'User', senderAvatar: sender.avatar || '', createdAt: serverTimestamp(), type: 'text' });
}
