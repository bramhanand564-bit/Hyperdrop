import { auth, db } from '../firebaseConfig';
import { addDoc, collection, deleteDoc, doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const requireUser = () => {
  const value = auth.currentUser?.uid;
  if (!value) throw new Error('Login required.');
  return value;
};
const messageRef = (chatId, messageId) => doc(db, 'chats', chatId, 'messages', messageId);

const MessagingService = {
  async sendMessage(chatId, input = {}) {
    const senderId = requireUser();
    if (!chatId) throw new Error('Chat id is required.');
    const text = String(input.text || '').trim();
    if (!text && !input.fileUri && !['poll','location','contact','app_invite'].includes(input.type)) return null;
    const timer = Number(input.ttl || 0);
    const payload = {
      text, senderId,
      senderName: input.senderName || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User',
      createdAt: serverTimestamp(), type: input.type || 'text',
      replyToId: input.replyToId || null, replyToText: input.replyToText || null,
      replyToSenderName: input.replyToSenderName || null, forwardedFrom: input.forwardedFrom || null,
      viewOnce: !!input.viewOnce,
      ...(input.fileUri ? { fileUri: input.fileUri, fileName: input.fileName || '' } : {}),
      ...(input.poll ? { poll: input.poll } : {}), ...(input.location ? { location: input.location } : {}),
      ...(input.contact ? { contact: input.contact } : {}),
      ...(input.type === 'app_invite' ? {
        appId: input.appId || null,
        appName: input.appName || 'Nax App',
        appDescription: input.appDescription || '',
        appIcon: input.appIcon || 'game-controller',
        sessionId: input.sessionId || null,
        maxPlayers: Number(input.maxPlayers || 4),
        entryType: input.entryType || 'html',
        htmlCode: input.htmlCode || null,
        appConfig: input.appConfig || null,
      } : {}),
      ...(timer > 0 ? { expiresAt: Timestamp.fromMillis(Date.now() + timer * 1000) } : {}),
    };
    const ref = doc(collection(db, 'chats', chatId, 'messages'));
    const chatRef = doc(db, 'chats', chatId);
    await Promise.all([
      setDoc(ref, payload),
      setDoc(chatRef, {
        lastMessage: text || ({app_invite:'🎮 App invite',image:'📷 Photo',video:'🎥 Video',voice:'🎤 Voice message',file:'📄 Document',location:'📍 Location',contact:'👤 Contact',poll:'📊 Poll'}[input.type] || 'Message'),
        lastMessageTime: serverTimestamp(), ...(input.participants ? { participants: input.participants } : {}), typing: {},
      }, { merge: true }),
    ]);
    return { id: ref.id, ...payload };
  },

  async openViewOnce(chatId, messageId) {
    const me = requireUser();
    const ref = messageRef(chatId, messageId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    return updateDoc(ref, { [`viewOnceOpenedBy.${me}`]: serverTimestamp() });
  },
  async votePoll(chatId, messageId, optionIndex) {
    const me = requireUser();
    const ref = messageRef(chatId, messageId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const poll = { ...(snap.data().poll || {}) };
    const votes = { ...(poll.votes || {}) };
    if (votes[me] === optionIndex) delete votes[me]; else votes[me] = optionIndex;
    return updateDoc(ref, { poll: { ...poll, votes } });
  },
  markDelivered(chatId, messageId) {
    const me = requireUser();
    return updateDoc(messageRef(chatId, messageId), { [`deliveredTo.${me}`]: serverTimestamp() });
  },
  markRead(chatId, messageId) {
    const me = requireUser();
    return updateDoc(messageRef(chatId, messageId), { [`readBy.${me}`]: serverTimestamp(), [`deliveredTo.${me}`]: serverTimestamp() });
  },
  setTyping(chatId, typing) {
    const me = requireUser();
    return updateDoc(doc(db, 'chats', chatId), { [`typing.${me}`]: !!typing });
  },
  async editMessage(chatId, messageId, text) {
    requireUser();
    const value = String(text || '').trim();
    if (!value) throw new Error('Message cannot be empty.');
    return updateDoc(messageRef(chatId, messageId), { text: value, editedAt: serverTimestamp() });
  },
  async deleteMessage(chatId, messageId, forEveryone = true) {
    const me = requireUser(); const ref = messageRef(chatId, messageId); const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    if (snap.data().senderId !== me) throw new Error('You can delete only your own messages.');
    return forEveryone ? updateDoc(ref, { text: 'This message was deleted', deleted: true, deletedAt: serverTimestamp(), fileUri: null }) : deleteDoc(ref);
  },
  async toggleReaction(chatId, messageId, emoji) {
    const me = requireUser(); const ref = messageRef(chatId, messageId); const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const reactions = { ...(snap.data().reactions || {}) };
    if (reactions[me] === emoji) delete reactions[me]; else reactions[me] = emoji;
    return updateDoc(ref, { reactions });
  },
  async toggleStar(chatId, messageId) {
    const me = requireUser(); const ref = doc(db, 'users', me, 'starred_messages', `${chatId}_${messageId}`);
    const snap = await getDoc(ref);
    return snap.exists() ? deleteDoc(ref) : setDoc(ref, { chatId, messageId, createdAt: serverTimestamp() });
  },
  pinMessage(chatId, messageId) { requireUser(); return updateDoc(doc(db, 'chats', chatId), { pinnedMessageId: messageId, pinnedAt: serverTimestamp() }); },
  async forwardMessage(sourceChatId, messageId, targetChatId) {
    requireUser(); const snap = await getDoc(messageRef(sourceChatId, messageId));
    if (!snap.exists()) throw new Error('Message not found.');
    const data = snap.data();
    return this.sendMessage(targetChatId, { text:data.text || '', type:data.type || 'text', fileUri:data.fileUri || null, fileName:data.fileName || '', poll:data.poll, location:data.location, contact:data.contact, forwardedFrom:{chatId:sourceChatId,messageId,senderName:data.senderName || 'User'} });
  },
  setChatTimer(chatId, seconds) {
    requireUser(); const allowed=[0,86400,604800,7776000]; const value=allowed.includes(Number(seconds)) ? Number(seconds) : 0;
    return updateDoc(doc(db,'chats',chatId),{messageTTL:value});
  },
  setPrivacy(updates={}) {
    const me=requireUser();
    return setDoc(doc(db,'users',me,'settings','privacy'),{readReceipts:updates.readReceipts !== false,lastSeen:updates.lastSeen || 'contacts',onlineStatus:updates.onlineStatus || 'contacts',profilePhoto:updates.profilePhoto || 'contacts',statusAudience:updates.statusAudience || 'contacts',typingIndicators:updates.typingIndicators !== false,updatedAt:serverTimestamp()},{merge:true});
  },
  blockUser(targetId) { const me=requireUser(); if(!targetId || targetId===me) return false; return setDoc(doc(db,'users',me,'blocked',targetId),{uid:targetId,createdAt:serverTimestamp()}); },
  unblockUser(targetId) { const me=requireUser(); return deleteDoc(doc(db,'users',me,'blocked',targetId)); },
  muteChat(chatId, muted=true) { const me=requireUser(); return setDoc(doc(db,'users',me,'muted_chats',chatId),{muted:!!muted,updatedAt:serverTimestamp()},{merge:true}); },
  async createGroup(name, memberIds=[]) {
    const me=requireUser(); const members=Array.from(new Set([me,...memberIds].filter(Boolean))); const title=String(name || 'New Group').trim();
    const ref=await addDoc(collection(db,'chats'),{type:'group',name:title,createdBy:me,admins:[me],members,memberCount:members.length,createdAt:serverTimestamp(),lastMessageTime:serverTimestamp()});
    await Promise.all(members.map(id=>setDoc(doc(db,'users',id,'user_chats',ref.id),{chatId:ref.id,type:'group',name:title,memberCount:members.length,updatedAt:serverTimestamp()},{merge:true})));
    return ref.id;
  },
  async addGroupMember(chatId, memberId) {
    const me=requireUser(); const ref=doc(db,'chats',chatId); const snap=await getDoc(ref); if(!snap.exists()) throw new Error('Group not found.');
    const data=snap.data(); if(!(data.admins || []).includes(me)) throw new Error('Admin permission required.');
    const members=Array.from(new Set([...(data.members || []),memberId])); return updateDoc(ref,{members,memberCount:members.length});
  },
  createChannel(name, description='') { const me=requireUser(); return addDoc(collection(db,'channels'),{name:String(name || '').trim(),description:String(description || '').trim(),ownerId:me,admins:[me],subscribers:[],createdAt:serverTimestamp(),postCount:0}); },
  createCommunity(name, groupIds=[]) { const me=requireUser(); return addDoc(collection(db,'communities'),{name:String(name || '').trim(),ownerId:me,admins:[me],groupIds:groupIds.filter(Boolean),createdAt:serverTimestamp()}); },
  createStatus(input={}) { const me=requireUser(); return addDoc(collection(db,'statuses'),{ownerId:me,type:input.type || 'text',text:input.text || '',fileUri:input.fileUri || null,audience:input.audience || 'contacts',mentions:input.mentions || [],createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+86400000)}); },
};

export default MessagingService;
export { MessagingService };
