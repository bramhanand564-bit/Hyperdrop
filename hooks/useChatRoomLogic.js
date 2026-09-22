// ==========================================
// FILE: hooks/useChatRoomLogic.js
// ==========================================
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
// 🚀 NEW: Offline Storage for Step 2
import AsyncStorage from '@react-native-async-storage/async-storage'; 

import { uploadToCloudinary } from '../utils/cloudinaryUpload'; 
import { processMediaForUpload } from '../utils/mediaCompressor';

export default function useChatRoomLogic(chatId, isGlobal, friendId, chatName, navigation) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [uploadProgress, setUploadProgress] = useState(0);

  // 🔄 REAL-TIME FETCH + SMART LOCAL CACHING (STEP 2 MAGIC)
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const localKey = `chat_cache_${chatId}`;

    // 1. Load from Phone Memory instantly (Zero Loading Time)
    const loadLocalMessages = async () => {
      try {
        const cached = await AsyncStorage.getItem(localKey);
        if (cached) {
          setMessages(JSON.parse(cached));
          setLoading(false); // UI instantly shows old chat
        }
      } catch (e) {
        console.log('Cache read error:', e);
      }
    };
    
    loadLocalMessages();

    // 2. Listen to Firebase for ONLY new or active messages
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const serverMsgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // 3. THE MERGE: Combine Offline and Online messages silently
      try {
        const cached = await AsyncStorage.getItem(localKey);
        let localMsgs = cached ? JSON.parse(cached) : [];
        
        const mergedMap = new Map();
        // Pehle local messages daalo
        localMsgs.forEach(m => mergedMap.set(m.id, m));
        // Phir server messages daalo (ye naye messages ko add karega aur purano ko update karega)
        serverMsgs.forEach(m => mergedMap.set(m.id, m));
        
        // Time ke hisaab se sort karo (Newest first)
        const finalMsgs = Array.from(mergedMap.values()).sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA; 
        });

        setMessages(finalMsgs);
        setLoading(false);
        
        // Merge hone ke baad updated list ko waapas phone mein save kar do
        await AsyncStorage.setItem(localKey, JSON.stringify(finalMsgs));
      } catch (e) {
        console.log('Cache merge error:', e);
      }

    }, (error) => {
      console.log("Chat fetch error:", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [chatId]);

  // 📝 TEXT MESSAGE LOGIC (LOCKED)
  const handleSend = async () => {
    if (!inputText.trim() || !auth.currentUser) return;
    const msgText = inputText.trim();

    // 🚀 Global Chat 500 characters limit
    if (isGlobal && msgText.length > 500) {
      Alert.alert('Limit Reached', 'You can only send up to 500 characters in Global Chat.');
      return;
    }

    setInputText('');
    setSending(true);

    try {
      if (!isGlobal) {
        await setDoc(doc(db, 'chats', chatId), { 
          lastUpdated: serverTimestamp(),
          participants: [auth.currentUser.uid, friendId].filter(Boolean)
        }, { merge: true });
      }
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: msgText,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.email?.split('@')[0] || 'User',
        createdAt: serverTimestamp(),
        type: 'text'
      });
    } catch (error) {
      console.log('Send Error:', error);
      Alert.alert('Error', 'Message send failed.');
    } finally {
      setSending(false);
    }
  };

  // 📎 MEDIA SENDING LOGIC (LOCKED)
  const handleMediaPick = async (mediaType) => {
    if (isGlobal) {
      Alert.alert('Not Allowed', 'Photos and Videos are not allowed in Global Chat.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
        quality: 1, 
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileUri = asset.uri;
        const actualMimeType = asset.mimeType; 
        const fileName = asset.fileName || fileUri.split('/').pop();

        Alert.alert(
          'Select Quality',
          'How would you like to send this file?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Original (Max 250MB)', 
              onPress: () => sendMediaMessage(fileUri, mediaType, fileName, actualMimeType, 'original') 
            },
            { 
              text: 'Standard (Data Saver)', 
              onPress: () => sendMediaMessage(fileUri, mediaType, fileName, actualMimeType, 'standard') 
            }
          ]
        );
      }
    } catch (error) {
      console.log('Media pick error:', error);
    }
  };

  // 📄 DOCUMENT SENDING LOGIC (LOCKED)
  const handleDocumentPick = async () => {
    if (isGlobal) {
      Alert.alert('Not Allowed', 'Documents are not allowed in Global Chat.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await sendMediaMessage(asset.uri, 'file', asset.name, asset.mimeType, 'original'); 
      }
    } catch (error) {
      console.log('Doc pick error:', error);
    }
  };

  // 🚀 SAVE MEDIA TO CLOUDINARY (LOCKED)
  const sendMediaMessage = async (fileUri, type, fileName = '', actualMimeType = null, qualityMode = 'standard') => {
    try {
      setSending(true);
      setUploadProgress(0);

      let processedUriToUpload = fileUri;

      if (type === 'image' || type === 'video') {
        const processResult = await processMediaForUpload(fileUri, type, qualityMode);
        processedUriToUpload = processResult.processedUri;
      }

      const finalMimeType = actualMimeType || (type === 'video' ? 'video/mp4' : type === 'image' ? 'image/jpeg' : '*/*');

      const uploadResult = await uploadToCloudinary({
        fileUri: processedUriToUpload,
        fileName: fileName,
        mimeType: finalMimeType, 
        onProgress: (progress) => setUploadProgress(progress)
      });

      if (!uploadResult || !uploadResult.secureUrl) {
        throw new Error("Cloudinary upload failed, URL is null");
      }

      let finalUrl = uploadResult.secureUrl;
      if (type === 'video' && finalUrl.includes('/upload/')) {
        finalUrl = finalUrl.replace('/upload/', '/upload/f_mp4,vc_auto/');
      }

      if (!isGlobal) {
        await setDoc(doc(db, 'chats', chatId), { 
          lastUpdated: serverTimestamp(),
          participants: [auth.currentUser.uid, friendId].filter(Boolean)
        }, { merge: true });
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        fileUri: finalUrl, 
        deleteToken: uploadResult.deleteToken || null, 
        publicId: uploadResult.publicId || null,
        fileName: fileName,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.email?.split('@')[0] || 'User',
        createdAt: serverTimestamp(),
        type: type, 
        text: type === 'image' ? '📷 Photo' : type === 'video' ? '🎥 Video' : '📄 Document'
      });

    } catch (error) {
      console.log('Media Send Error:', error);
      if (error.message === 'FILE_TOO_LARGE') {
        Alert.alert('File Too Large', 'Original file exceeds 250MB limit. Please send as Standard.');
      } else {
        // 🚀 THE DEBUG HACK: Asli error ab screen par aayega
        Alert.alert('Upload Failed', `Reason: ${error.message || JSON.stringify(error)}`);
      }
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  };

  // 📞 CALL LOGIC (LOCKED)
  const initiateCall = (type) => {
    if (isGlobal) return Alert.alert('Notice', 'Calls are only available in private chats.');
    if (!friendId) return Alert.alert('Error', 'Friend ID missing.');
    navigation.navigate('Call', { callId: chatId, type: type, name: chatName, friendId: friendId, isCaller: true });
  };

  return {
    messages, inputText, setInputText, loading, sending, uploadProgress,
    handleSend, handleMediaPick, handleDocumentPick, initiateCall
  };
}
