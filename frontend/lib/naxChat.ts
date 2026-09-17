import { collection, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, where, addDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type NaxUser = {
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
  createdAt?: { seconds?: number; nanoseconds?: number } | null;
  type?: string;
  fileUri?: string;
  fileName?: string;
};

export function subscribeToPrivateChats(uid: string, callback: (items: any[]) => void) {
  const chatsQuery = query(collection(db, 'users', uid, 'user_chats'), where('type', '==', 'private'));
  return onSnapshot(chatsQuery, (snapshot) => {
    const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    items.sort((a: any, b: any) => toMillis(b.lastMessageTime || b.updatedAt) - toMillis(a.lastMessageTime || a.updatedAt));
    callback(items);
  });
}

export function subscribeToMessages(chatId: string, callback: (messages: ChatMessage[]) => void) {
  const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(messagesQuery, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as ChatMessage)));
  });
}

export async function searchNaxUser(value: string): Promise<NaxUser | null> {
  const username = value.trim().toLowerCase().replace(/^@/, '');
  if (!username || !auth.currentUser) return null;

  const users = await getDocs(query(collection(db, 'users'), where('usernameLower', '==', username)));
  if (!users.empty) {
    const item = users.docs[0];
    const data = item.data();
    if ((data.uid || item.id) === auth.currentUser.uid) return null;
    return { uid: data.uid || item.id, username: data.username || `@${username}`, name: data.name || data.displayName || data.username || username, avatar: data.avatar || data.photoURL || '' };
  }

  const bots = await getDocs(query(collection(db, 'bots'), where('username', '==', username)));
  if (!bots.empty) {
    const item = bots.docs[0];
    const data = item.data();
    return { uid: item.id, username: data.username || `@${username}`, name: data.name || data.displayName || data.username || username, avatar: data.avatar || '', isBot: true };
  }
  return null;
}

export async function createPrivateChat(friend: NaxUser) {
  const me = auth.currentUser;
  if (!me) throw new Error('Login required');
  const chatId = me.uid < friend.uid ? `${me.uid}_${friend.uid}` : `${friend.uid}_${me.uid}`;
  const meRef = doc(db, 'users', me.uid, 'user_chats', chatId);
  const friendRef = doc(db, 'users', friend.uid, 'user_chats', chatId);
  await Promise.all([
    setDoc(meRef, { chatId, type: 'private', friendId: friend.uid, friendName: friend.name || 'Nax User', friendUsername: friend.username || '', friendAvatar: friend.avatar || '', updatedAt: serverTimestamp() }, { merge: true }),
    setDoc(friendRef, { chatId, type: 'private', friendId: me.uid, friendName: me.displayName || me.email || 'Nax User', friendUsername: me.email?.split('@')[0] || '', friendAvatar: '', updatedAt: serverTimestamp() }, { merge: true }),
  ]);
  return chatId;
}

export async function sendTextMessage(chatId: string, text: string) {
  const me = auth.currentUser;
  if (!me || !text.trim()) return;
  await setDoc(doc(db, 'chats', chatId), { lastUpdated: serverTimestamp(), participants: [me.uid] }, { merge: true });
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    text: text.trim(), senderId: me.uid, senderName: me.displayName || me.email?.split('@')[0] || 'User', createdAt: serverTimestamp(), type: 'text'
  });
}

function toMillis(value: any) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  return value.seconds ? value.seconds * 1000 : typeof value === 'number' ? value : 0;
}
