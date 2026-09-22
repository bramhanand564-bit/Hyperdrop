// ==========================================
// FILE: hooks/useChatLogic.js
// ==========================================
import { useState } from 'react';
import { Keyboard, Alert } from 'react-native';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export default function useChatLogic(navigation) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [openingChat, setOpeningChat] = useState(false);

  const currentUser = auth.currentUser;

  const normalizeUsername = (value) => {
    let username = String(value || '').trim().toLowerCase();
    if (username.startsWith('@')) username = username.substring(1);
    return username;
  };

  const handleSearch = async () => {
    const username = normalizeUsername(searchQuery);
    if (!username) return Alert.alert('Username required', 'Pehle @username enter karo.');
    if (!currentUser?.uid) return Alert.alert('Login required', 'Pehle login karo.');
    if (username.length < 3) return Alert.alert('Invalid username', 'Username kam se kam 3 characters ka hona chahiye.');

    Keyboard.dismiss();
    setSearching(true);
    setSearchResult(null);

    try {
      let foundData = null;
      let isBot = false;

      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('usernameLower', '==', username));
      const snapshot = await getDocs(userQuery);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        foundData = userDoc.data();
        foundData.uid = foundData.uid || userDoc.id;
      } else {
        const botsRef = collection(db, 'bots');
        const botQuery = query(botsRef, where('username', '==', username));
        const botSnap = await getDocs(botQuery);

        if (!botSnap.empty) {
          const botDoc = botSnap.docs[0];
          foundData = botDoc.data();
          foundData.uid = botDoc.id;
          isBot = true;
        }
      }

      if (!foundData) {
        Alert.alert('Not Found', `@${username} nahi mila.`);
        setSearching(false); return;
      }

      if (foundData.uid === currentUser.uid) {
        Alert.alert('Oops!', 'Tum khud ko chat nahi kar sakte.');
        setSearching(false); return;
      }

      setSearchResult({
        uid: foundData.uid,
        username: foundData.username || `@${username}`,
        name: foundData.name || foundData.displayName || foundData.username || `@${username}`,
        avatar: foundData.avatar || foundData.photoURL || '',
        isBot: isBot
      });
    } catch (error) {
      console.log('Search error:', error);
      Alert.alert('Search Error', 'User search nahi ho paayi.');
    }
    setSearching(false);
  };

  const createPrivateChat = async (friend) => {
    if (!currentUser?.uid || !friend?.uid) return null;
    const myId = currentUser.uid;
    const friendId = friend.uid;
    const chatId = myId < friendId ? `${myId}_${friendId}` : `${friendId}_${myId}`;

    const myUsername = normalizeUsername(currentUser.displayName || currentUser.email || 'user');
    let myProfile = null;

    try {
      const myProfileSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', myId)));
      if (!myProfileSnap.empty) myProfile = myProfileSnap.docs[0].data();
    } catch (error) { console.log('My profile lookup error:', error); }

    const myName = myProfile?.name || myProfile?.displayName || currentUser.displayName || currentUser.email || 'Nax User';
    const myUsernameValue = myProfile?.username || `@${myUsername}`;

    const myChatRef = doc(db, 'users', myId, 'user_chats', chatId);
    const friendChatRef = doc(db, 'users', friendId, 'user_chats', chatId);

    await Promise.all([
      setDoc(myChatRef, {
        chatId, type: 'private', friendId, friendName: friend.name || 'Nax User', friendUsername: friend.username || '', friendAvatar: friend.avatar || '', updatedAt: serverTimestamp()
      }, { merge: true }),
      
      setDoc(friendChatRef, {
        chatId, type: 'private', friendId: myId, friendName: myName, friendUsername: myUsernameValue, friendAvatar: myProfile?.avatar || myProfile?.photoURL || '', updatedAt: serverTimestamp()
      }, { merge: true }),
    ]);

    return chatId;
  };

  const openNewChat = async (friend, closeMenuCallback) => {
    if (openingChat || !currentUser?.uid || !friend?.uid) return;
    setOpeningChat(true);

    try {
      const chatId = await createPrivateChat(friend);
      if (!chatId) throw new Error('Chat ID create nahi hua.');

      setSearchResult(null);
      setSearchQuery('');
      if (closeMenuCallback) closeMenuCallback();

      navigation.navigate('ChatRoom', { chatId, chatName: friend.name, friendId: friend.uid, friendUsername: friend.username, friendAvatar: friend.avatar });
    } catch (error) {
      console.log('Open new chat error:', error);
      Alert.alert('Chat Error', 'Private chat start nahi ho paayi.');
    }
    setOpeningChat(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResult(null);
  };

  return {
    searchQuery, setSearchQuery, searching, searchResult, openingChat, 
    handleSearch, openNewChat, clearSearch, currentUser
  };
}
