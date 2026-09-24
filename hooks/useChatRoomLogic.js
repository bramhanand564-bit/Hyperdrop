import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import { processMediaForUpload } from '../utils/mediaCompressor';
import MessagingService from '../messaging/MessagingService';

export default function useChatRoomLogic(chatId, isGlobal, friendId, chatName, navigation) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [messageTTL, setMessageTTL] = useState(0);
  const [friendOnline, setFriendOnline] = useState(false);
  const [friendLastSeen, setFriendLastSeen] = useState(null);
  const recordingRef = useRef(null);
  const draftKey = `chat_draft_${chatId}`;
  const typingTimer = useRef(null);

  useEffect(() => {
    if (!auth.currentUser || !chatId) return undefined;
    const localKey = `chat_cache_${chatId}`;
    AsyncStorage.getItem(localKey).then(cached => {
      if (cached) { try { setMessages(JSON.parse(cached)); setLoading(false); } catch (_) {} }
    });
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async snapshot => {
      const serverMsgs = snapshot.docs.map(d => ({ id:d.id, ...d.data() }));
      try {
        const cached = await AsyncStorage.getItem(localKey);
        const map = new Map((cached ? JSON.parse(cached) : []).map(m => [m.id,m]));
        serverMsgs.forEach(m => map.set(m.id,m));
        const finalMsgs = Array.from(map.values()).filter(m => !m.expiresAt || (m.expiresAt?.toMillis ? m.expiresAt.toMillis() > Date.now() : true)).sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
        setMessages(finalMsgs);
        setLoading(false);
        await AsyncStorage.setItem(localKey, JSON.stringify(finalMsgs));
        const other = finalMsgs.filter(m => m.senderId && m.senderId !== auth.currentUser.uid).slice(0, 25);
        await Promise.all(other.map(m => MessagingService.markDelivered(chatId,m.id).catch(()=>{})));
        await Promise.all(other.slice(0,5).map(m => MessagingService.markRead(chatId,m.id).catch(()=>{})));
      } catch (e) { console.log('Chat merge error:', e); setLoading(false); }
    }, error => { console.log('Chat fetch error:', error); setLoading(false); });
    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (!friendId) return undefined;
    const unsubscribe = onSnapshot(doc(db,'users',friendId), snap => { const data=snap.data()||{}; setFriendOnline(!!data.online); setFriendLastSeen(data.lastSeen || null); }, () => {});
    return () => unsubscribe();
  }, [friendId]);

  useEffect(() => {
    if (!auth.currentUser || !chatId) return undefined;
    const unsubscribe = onSnapshot(doc(db,'chats',chatId), snap => {
      const data = snap.data() || {};
      const me = auth.currentUser?.uid;
      setTypingUsers(Object.keys(data.typing || {}).filter(id => id !== me && data.typing[id]));
      setMessageTTL(Number(data.messageTTL || 0));
    }, () => {});
    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    AsyncStorage.getItem(draftKey).then(value => { if (value) setInputText(value); }).catch(() => {});
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    AsyncStorage.setItem(draftKey, inputText || '').catch(() => {});
  }, [chatId, inputText]);

  const updateTyping = (value) => {
    setInputText(value);
    if (isGlobal || !chatId) return;
    MessagingService.setTyping(chatId, !!value.trim()).catch(()=>{});
    clearTimeout(typingTimer.current);
    if (value.trim()) typingTimer.current = setTimeout(() => MessagingService.setTyping(chatId,false).catch(()=>{}), 1800);
  };

  useEffect(() => () => {
    clearTimeout(typingTimer.current);
    if (chatId) MessagingService.setTyping(chatId,false).catch(()=>{});
  }, [chatId]);

  const handleSend = async () => {
    const msgText=inputText.trim();
    if (!msgText || !auth.currentUser) return;
    if (isGlobal && msgText.length>500) return Alert.alert('Limit Reached','Global Chat में 500 characters तक भेज सकते हो.');
    setInputText(''); AsyncStorage.removeItem(draftKey).catch(()=>{}); setSending(true);
    try {
      await MessagingService.sendMessage(chatId,{text:msgText,type:'text',replyToId:replyingTo?.id,replyToText:replyingTo?.text,replyToSenderName:replyingTo?.senderName,ttl:messageTTL,participants:[auth.currentUser.uid,friendId].filter(Boolean)});
      setReplyingTo(null);
      await MessagingService.setTyping(chatId,false).catch(()=>{});
    } catch(e) { Alert.alert('Error',e.message || 'Message send failed.'); }
    finally { setSending(false); }
  };

  const sendMediaMessage = async (fileUri,type,fileName='',actualMimeType=null,qualityMode='standard',viewOnce=false) => {
    try {
      setSending(true); setUploadProgress(0);
      let processedUri=fileUri;
      if(type==='image'||type==='video') processedUri=(await processMediaForUpload(fileUri,type,qualityMode)).processedUri;
      const result=await uploadToCloudinary({fileUri:processedUri,fileName,mimeType:actualMimeType || (type==='video'?'video/mp4':type==='image'?'image/jpeg':'application/octet-stream'),onProgress:setUploadProgress});
      if(!result?.secureUrl) throw new Error('Upload failed.');
      let url=result.secureUrl;
      if(type==='video'&&url.includes('/upload/')) url=url.replace('/upload/','/upload/f_mp4,vc_auto/');
      await MessagingService.sendMessage(chatId,{type,fileUri:url,fileName,replyToId:replyingTo?.id,replyToText:replyingTo?.text,replyToSenderName:replyingTo?.senderName,ttl:messageTTL,viewOnce,participants:[auth.currentUser.uid,friendId].filter(Boolean)});
      setReplyingTo(null);
    } catch(e) { Alert.alert('Upload Failed',e.message || 'Media upload failed.'); }
    finally { setSending(false); setUploadProgress(0); }
  };

  const handleMediaPick = async mediaType => {
    if(isGlobal) return Alert.alert('Not Allowed','Media is disabled in Global Chat.');
    try {
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:mediaType==='video'?ImagePicker.MediaTypeOptions.Videos:ImagePicker.MediaTypeOptions.Images,quality:1});
      if(!result.canceled&&result.assets?.[0]){
        const a=result.assets[0];
        Alert.alert('Send',mediaType==='image'?'Photo options':'Video options',[
          {text:'Cancel',style:'cancel'},
          {text:'Standard',onPress:()=>sendMediaMessage(a.uri,mediaType,a.fileName||a.uri.split('/').pop(),a.mimeType,'standard',false)},
          {text:'View once',onPress:()=>sendMediaMessage(a.uri,mediaType,a.fileName||a.uri.split('/').pop(),a.mimeType,'standard',true)},
          {text:'Original',onPress:()=>sendMediaMessage(a.uri,mediaType,a.fileName||a.uri.split('/').pop(),a.mimeType,'original',false)},
        ]);
      }
    } catch(e){console.log('Media pick error',e);}
  };

  const handleDocumentPick = async () => {
    if(isGlobal) return Alert.alert('Not Allowed','Documents are disabled in Global Chat.');
    try {
      const result=await DocumentPicker.getDocumentAsync({copyToCacheDirectory:true});
      if(result.assets?.[0]){const a=result.assets[0];await sendMediaMessage(a.uri,'file',a.name,a.mimeType,'original');}
    } catch(e){console.log('Document pick error',e);}
  };

  const handleVoiceRecord = async () => {
    if(isGlobal) return Alert.alert('Not Allowed','Voice notes are disabled in Global Chat.');
    try {
      if(recordingRef.current){
        await recordingRef.current.stopAndUnloadAsync();
        const uri=recordingRef.current.getURI();
        recordingRef.current=null;
        if(uri) await sendMediaMessage(uri,'voice',`voice-${Date.now()}.m4a`,'audio/mp4','standard');
        return;
      }
      const permission=await Audio.requestPermissionsAsync();
      if(permission.status!=='granted') return Alert.alert('Microphone','Microphone permission required.');
      await Audio.setAudioModeAsync({allowsRecordingIOS:true,playsInSilentModeIOS:true});
      const {recording}=await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current=recording;
      Alert.alert('Recording','Tap Voice again to stop and send.');
    } catch(e){recordingRef.current=null;Alert.alert('Voice note',e.message || 'Unable to record voice.');}
  };

  const handleLocationPick = async () => {
    try {
      const permission=await Location.requestForegroundPermissionsAsync();
      if(permission.status!=='granted') return Alert.alert('Location','Location permission required.');
      const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
      await MessagingService.sendMessage(chatId,{type:'location',location:{latitude:position.coords.latitude,longitude:position.coords.longitude},text:'📍 Location',ttl:messageTTL});
    } catch(e){Alert.alert('Location',e.message || 'Unable to get location.');}
  };

  const handleContactPick = async () => {
    try {
      const permission=await Contacts.requestPermissionsAsync();
      if(permission.status!=='granted') return Alert.alert('Contacts','Contacts permission required.');
      const contact=await Contacts.presentContactPickerAsync();
      if(!contact) return;
      await MessagingService.sendMessage(chatId,{type:'contact',contact:{id:contact.id,name:[contact.firstName,contact.lastName].filter(Boolean).join(' '),phone:contact.phoneNumbers?.[0]?.number || ''},text:'👤 Contact'});
    } catch(e){Alert.alert('Contact',e.message || 'Unable to select contact.');}
  };

  const handlePoll = async (question, options) => {
    try {
      setSending(true);
      await MessagingService.sendMessage(chatId,{type:'poll',text:question,poll:{question,options,votes:{}},ttl:messageTTL,participants:[auth.currentUser?.uid,friendId].filter(Boolean)});
    } catch(e) { Alert.alert('Poll',e.message || 'Poll send failed.'); }
    finally { setSending(false); }
  };

  const handleMessageAction = async (message, action) => {
    try {
      if(action==='reply') setReplyingTo(message);
      if(action==='react') await MessagingService.toggleReaction(chatId,message.id,'❤️');
      if(action==='star') await MessagingService.toggleStar(chatId,message.id);
      if(action==='pin') await MessagingService.pinMessage(chatId,message.id);
      if(action==='delete') await MessagingService.deleteMessage(chatId,message.id,true);
      if(action==='forward') Alert.alert('Forward','Forwarding needs a target chat selection.');
    } catch(e){Alert.alert('Message',e.message || 'Action failed.');}
  };

  const editMessage = async (message,text) => { await MessagingService.editMessage(chatId,message.id,text); };
  const deleteMessage = async message => { await MessagingService.deleteMessage(chatId,message.id,true); };

  const initiateCall = type => {
    if(isGlobal) return Alert.alert('Notice','Calls are only available in private chats.');
    if(!friendId) return Alert.alert('Error','Friend ID missing.');
    navigation.navigate('Call',{callId:chatId,type,name:chatName,friendId,isCaller:true});
  };

  return {
    messages,inputText,setInputText:updateTyping,loading,sending,uploadProgress,typingUsers,friendOnline,friendLastSeen,messageTTL,setMessageTTL,replyingTo,setReplyingTo,
    handleSend,handleMediaPick,handleDocumentPick,handleVoiceRecord,handleLocationPick,handleContactPick,handlePoll,
    handleMessageAction,editMessage,deleteMessage,initiateCall
  };
}
