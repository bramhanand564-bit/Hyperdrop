import React,{useCallback,useMemo,useRef,useState}from'react';
import{View,FlatList,StyleSheet,SafeAreaView,ActivityIndicator,Text,TouchableOpacity,Share,Alert}from'react-native';
import{auth}from'../firebaseConfig';
import{useTheme}from'../context/ThemeContext';
import{Ionicons}from'@expo/vector-icons';
import GlassScene from'../components/ui/GlassScene';
import GlassSurface from'../components/ui/GlassSurface';
import useChatRoomLogic from'../hooks/useChatRoomLogic';
import ChatHeader from'../components/chat/ChatHeader';
import MessageBubble from'../components/chat/MessageBubble';
import ChatInput from'../components/chat/ChatInput';
import ChatFeatureHub from'../components/chat/ChatFeatureHub';
import ChatMegaFeatures from'../components/chat/ChatMegaFeatures';
import MessagingService from'../messaging/MessagingService';

export default function ChatRoomScreen({route,navigation}){
 const{isDark}=useTheme();
 const{chatId='global',chatName='Global Room',friendId,friendAvatar}=route.params||{};
 const isGlobal=chatId==='global'||chatId==='global_chats';
 const{messages,inputText,setInputText,loading,sending,uploadProgress,typingUsers,friendOnline,friendLastSeen,messageTTL,setMessageTTL,replyingTo,setReplyingTo,handleSend,handleMediaPick,handleDocumentPick,handleVoiceRecord,handleLocationPick,handleContactPick,handlePoll,initiateCall}=useChatRoomLogic(chatId,isGlobal,friendId,chatName,navigation);
 const[featuresOpen,setFeaturesOpen]=useState(false);
 const[activeFilter,setActiveFilter]=useState('all');
 const[messageSearch,setMessageSearch]=useState('');
 const[muted,setMuted]=useState(false);
 const[megaOpen,setMegaOpen]=useState(false);
 const[wallpaper,setWallpaper]=useState('plain');
 const[density,setDensity]=useState('comfortable');
 const[composerSize,setComposerSize]=useState('normal');
 const[focusMode,setFocusMode]=useState(false);
 const listRef=useRef(null);
 const inputRef=useRef(null);

 const applyFilter=useCallback(filter=>{
   setMessageSearch('');
   setActiveFilter(filter||'all');
   setFeaturesOpen(false);
 },[]);
 const runSearch=useCallback(q=>{
   const value=String(q||'').trim().toLowerCase();
   setMessageSearch(value);
   setActiveFilter(value?'search':'all');
 },[]);

 const visibleMessages=useMemo(()=>{
   const uid=auth.currentUser?.uid;
   const q=messageSearch.toLowerCase();
   return messages.filter(m=>{
     if(activeFilter==='search') return [m.text,m.senderName,m.fileName].some(v=>String(v||'').toLowerCase().includes(q));
     if(activeFilter==='photos') return m.type==='image';
     if(activeFilter==='videos') return m.type==='video';
     if(activeFilter==='files') return m.type==='file';
     if(activeFilter==='voice') return m.type==='voice';
     if(activeFilter==='locations') return m.type==='location';
     if(activeFilter==='contacts') return m.type==='contact';
     if(activeFilter==='polls') return m.type==='poll';
     if(activeFilter==='links') return /(https?:\/\/|www\.)/i.test(String(m.text||''));
     if(activeFilter==='reactions') return Object.keys(m.reactions||{}).length>0;
     if(activeFilter==='starred') return !!m.starredBy?.[uid];
     if(activeFilter==='pinned') return !!m.pinnedAt || !!m.pinnedBy?.[uid];
     if(activeFilter==='replies') return !!m.replyToId;
     if(activeFilter==='forwarded') return !!m.forwardedFrom;
     if(activeFilter==='edited') return !!m.editedAt;
     if(activeFilter==='view_once') return !!m.viewOnce;
     if(activeFilter==='unread') return !m.readBy?.[uid] && m.senderId!==uid;
     if(activeFilter==='deleted') return !!m.deleted;
     if(activeFilter==='media') return ['image','video'].includes(m.type);
     if(activeFilter==='mine') return m.senderId===uid;
     if(activeFilter==='theirs') return m.senderId!==uid;
     if(activeFilter==='text_only') return m.type==='text' || (!m.type && !!m.text);
     if(activeFilter==='media_only') return ['image','video'].includes(m.type);
     if(activeFilter==='long') return String(m.text||'').length>120;
     if(activeFilter==='short') return String(m.text||'').length<40;
     if(activeFilter==='emoji') return /[\\u{1F300}-\\u{1FAFF}]/u.test(String(m.text||''));
     if(activeFilter==='digits') return /\\d/.test(String(m.text||''));
     if(activeFilter==='today') { const d=m.createdAt?.toDate?m.createdAt.toDate():new Date(m.createdAt||0); const n=new Date(); return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate(); }
     if(activeFilter==='week') return Date.now()-(m.createdAt?.toDate?m.createdAt.toDate():new Date(m.createdAt||0)).getTime()<=604800000;
     if(activeFilter==='older') return Date.now()-(m.createdAt?.toDate?m.createdAt.toDate():new Date(m.createdAt||0)).getTime()>604800000;
     return true;
   });
 },[messages,activeFilter,messageSearch]);

 const renderMessage=useCallback(({item})=><MessageBubble item={item}isMe={item.senderId===auth.currentUser?.uid}isGlobal={isGlobal}chatId={chatId}onReply={setReplyingTo}onForward={(message)=>navigation.navigate('ForwardPicker',{sourceChatId:chatId,message})}navigation={navigation}/>,[chatId,isGlobal,navigation,setReplyingTo]);

 const markAllRead=useCallback(async()=>{
   const uid=auth.currentUser?.uid;
   if(!uid)return;
   await Promise.all(messages.filter(m=>m.senderId!==uid&&!m.readBy?.[uid]).slice(0,100).map(m=>MessagingService.markRead(chatId,m.id).catch(()=>{})));
 },[messages,chatId]);

 const exportChat=useCallback(async()=>{
   const body=messages.slice().reverse().map(m=>`[${new Date(m.createdAt?.toDate?m.createdAt.toDate():m.createdAt||Date.now()).toLocaleString()}] ${m.senderName||'User'}: ${m.text||'['+(m.type||'message')+']'}`).join('\n');
   try{await Share.share({message:`${chatName}\n\n${body||'No messages'}`});}catch(e){}
 },[messages,chatName]);

 const toggleMute=useCallback(async next=>{setMuted(!!next);try{await MessagingService.muteChat(chatId,!!next)}catch(e){setMuted(!next)}},[chatId]);
 const setTimer=useCallback(async seconds=>{try{await MessagingService.setChatTimer(chatId,seconds);setMessageTTL(seconds)}catch(e){Alert.alert('Chat timer',e.message||'Could not update timer.')}},[chatId,setMessageTTL]);

 const handleMegaFeature=useCallback(async feature=>{
   const a=feature?.action;
   const draft=inputText||'';
   const append=t=>setInputText(draft ? draft+' '+t : t);
   const transform=t=>setInputText(t);
   const jump=index=>{try{listRef.current?.scrollToIndex?.({index:Math.max(0,index),animated:true})}catch(e){listRef.current?.scrollToOffset?.({offset:Math.max(0,index*72),animated:true})}};
   const lastOf=type=>{const i=messages.findIndex(m=>m.type===type);if(i>=0)jump(i);else Alert.alert('Chat','No matching message found in the loaded chat.')};
   switch(a){
    case'normalize':transform(draft.replace(/\\s+/g,' ').trim());break;
    case'capitalize':transform(draft.replace(/^\\s*(.)/,(_,x)=>x.toUpperCase()));break;
    case'upper':transform(draft.toUpperCase());break;
    case'lower':transform(draft.toLowerCase());break;
    case'reverse':transform(draft.split('').reverse().join(''));break;
    case'bullets':transform(draft.split(/\\n/).filter(Boolean).map(x=>'• '+x.replace(/^[-•]\\s*/,'' )).join('\\n')||'• ');break;
    case'numbers':transform(draft.split(/\\n/).filter(Boolean).map((x,i)=>(i+1)+'. '+x.replace(/^\\d+\\.\\s*/,'' )).join('\\n')||'1. ');break;
    case'checklist':transform(draft.split(/\\n/).filter(Boolean).map(x=>'☐ '+x).join('\\n')||'☐ ');break;
    case'code':transform('```\\n'+draft+'\\n```');break;
    case'quote':transform(draft.split(/\\n/).map(x=>'> '+x).join('\\n'));break;
    case'timestamp':append(new Date().toLocaleTimeString());break;
    case'date':append(new Date().toLocaleDateString());break;
    case'meeting':transform('Meeting: Topic — Time — Place/Link');break;
    case'rsvp':transform('RSVP: Please confirm your attendance.');break;
    case'reminder':transform('Reminder: ');break;
    case'thanks':transform('Thank you for your help!');break;
    case'apology':transform('Sorry for the inconvenience.');break;
    case'announcement':transform('Announcement: ');break;
    case'address':transform('Address: ');break;
    case'availability':transform('Are you available today?');break;
    case'mine':case'theirs':case'text_only':case'media_only':case'long':case'short':case'emoji':case'digits':case'today':case'week':case'older':setActiveFilter(a);setMessageSearch('');setMegaOpen(false);break;
    case'first':jump(messages.length-1);break;
    case'latest':listRef.current?.scrollToOffset?.({offset:0,animated:true});break;
    case'last_photo':lastOf('image');break;
    case'last_video':lastOf('video');break;
    case'last_file':lastOf('file');break;
    case'last_voice':lastOf('voice');break;
    case'last_poll':lastOf('poll');break;
    case'last_location':lastOf('location');break;
    case'last_reply':{const i=messages.findIndex(m=>m.replyToId);if(i>=0)jump(i);else Alert.alert('Chat','No replied message found.')}break;
    case'wallpaper_ocean':setWallpaper('ocean');break;
    case'wallpaper_midnight':setWallpaper('midnight');break;
    case'wallpaper_forest':setWallpaper('forest');break;
    case'wallpaper_sunrise':setWallpaper('sunrise');break;
    case'wallpaper_glass':setWallpaper('glass');break;
    case'wallpaper_plain':setWallpaper('plain');break;
    case'compact':setDensity('compact');break;
    case'comfortable':setDensity('comfortable');break;
    case'composer_large':setComposerSize('large');break;
    case'composer_minimal':setComposerSize('minimal');break;
    case'focus_chat':setFocusMode(true);break;
    case'normal_view':setFocusMode(false);break;
    case'hide_filter':setActiveFilter('all');setMessageSearch('');break;
    case'show_filter':if(activeFilter==='all')setActiveFilter('unread');break;
    case'mute':await toggleMute(true);break;
    case'unmute':await toggleMute(false);break;
    case'timer_1h':await setTimer(3600);break;
    case'timer_1d':await setTimer(86400);break;
    case'timer_7d':await setTimer(604800);break;
    case'timer_off':await setTimer(0);break;
    case'mark_read':await markAllRead();break;
    case'share_chat':case'export':await exportChat();break;
    case'focus_composer':setMegaOpen(false);setFeaturesOpen(false);setTimeout(()=>inputRef.current?.focus?.(),220);break;
    case'photos':case'videos':case'files':case'voice':case'locations':case'contacts':case'polls':case'links':case'view_once':case'unread':case'edited':case'reactions':case'starred':case'pinned':case'replies':case'forwarded':case'deleted':case'media':setActiveFilter(a);setMessageSearch('');setMegaOpen(false);break;
    case'clear_filter':setActiveFilter('all');setMessageSearch('');break;
    case'settings':navigation.navigate('ChatSettings',{chatId,friendId,chatName,messageTTL});break;
    case'voice_call':initiateCall('voice');break;
    case'video_call':initiateCall('video');break;
    case'create_poll':setMegaOpen(false);setFeaturesOpen(true);break;
    case'send_photo':handleMediaPick('image');break;
    case'send_video':handleMediaPick('video');break;
    case'send_file':handleDocumentPick();break;
    case'send_voice':handleVoiceRecord();break;
    case'send_location':handleLocationPick();break;
    case'send_contact':handleContactPick();break;
    case'word_count':Alert.alert('Word count',String(draft.trim()?draft.trim().split(/\\s+/).length:0)+' words');break;
    case'char_count':Alert.alert('Character count',String(draft.length)+' characters');break;
    case'reading_time':{const words=draft.trim()?draft.trim().split(/\\s+/).length:0;Alert.alert('Reading time',words?'About '+Math.max(1,Math.ceil(words/200))+' minute(s)':'0 minutes')}break;
    case'divider':append('────────────');break;
    case'emoji_bullets':transform(draft.split(/\\n/).filter(Boolean).map(x=>'🔹 '+x).join('\\n')||'🔹 ');break;
    case'status_line':transform('Status: ');break;
    case'question':transform((draft.replace(/[.!?]+$/,'')||'Your question')+'?');break;
    case'cta':transform((draft||'Let me know what you think')+' — reply now.');break;
    case'clear_draft':transform('');break;
    case'share_draft':try{await Share.share({message:draft||'No draft text'});}catch(e){}break;
    case'circle_hint':Alert.alert('Circle','Use the Circle tab for connected people and chats.');break;
    default:Alert.alert('Feature',feature?.title||'Feature');
   }
   setMegaOpen(false);
 },[inputText,messages,chatId,chatName,friendId,messageTTL,activeFilter,toggleMute,setTimer,markAllRead,exportChat,initiateCall,handleMediaPick,handleDocumentPick,handleVoiceRecord,handleLocationPick,handleContactPick,setInputText,navigation]);

 const bg=wallpaper==='ocean'?'#06253A':wallpaper==='midnight'?'#05050B':wallpaper==='forest'?'#0D2A1D':wallpaper==='sunrise'?'#3A2119':wallpaper==='glass'?'#111A26':(isDark?'#050A10':'#F3F7FA');

 return <SafeAreaView style={[s.container,{backgroundColor:bg}]}>
  <GlassScene showBubbles={!focusMode}><View style={{flex:1}}>
   <ChatHeader chatName={chatName}friendAvatar={friendAvatar}isGlobal={isGlobal}onBack={()=>navigation.goBack()}onInfoPress={()=>navigation.navigate('ChatSettings',{chatId,friendId,chatName,messageTTL})}onCall={()=>initiateCall('voice')}onVideoCall={()=>initiateCall('video')}onFeatures={()=>setFeaturesOpen(true)}typing={typingUsers.length>0}isOnline={friendOnline}statusText={friendOnline?'online':friendLastSeen?'last seen recently':'offline'}/>
   {activeFilter!=='all'?<View style={[s.filterBar,{backgroundColor:isDark?'rgba(8,126,255,.12)':'rgba(8,126,255,.07)',borderBottomColor:themeBorder(isDark)}]}><Text style={{color:'#087EFF',fontWeight:'900',flex:1}}>{activeFilter==='search'?(`Search: ${messageSearch}`):activeFilter.replace('_',' ')}</Text><TouchableOpacity onPress={()=>{setActiveFilter('all');setMessageSearch('')}}><Text style={{color:'#087EFF',fontWeight:'900'}}>Clear</Text></TouchableOpacity></View>:null}
   {uploadProgress>0&&uploadProgress<100?<GlassSurface radius={16}style={s.progress}><Text style={s.progressText}>Uploading… {uploadProgress}%</Text><View style={s.bar}><View style={[s.fill,{width:uploadProgress+'%'}]}/></View></GlassSurface>:null}
   <View style={s.area}>{loading?<ActivityIndicator size="large"color="#087EFF"style={{marginTop:30}}/>:<FlatList ref={listRef}data={visibleMessages}keyExtractor={m=>m.id}renderItem={renderMessage}inverted contentContainerStyle={s.list}showsVerticalScrollIndicator={false}initialNumToRender={15}maxToRenderPerBatch={10}windowSize={10}removeClippedSubviews/>}</View>
   {activeFilter!=='all'&&visibleMessages.length===0?<View pointerEvents="none"style={s.noResults}><Ionicons name="search-outline"size={28}color="#087EFF"/><Text style={s.noResultsText}>No matching messages</Text></View>:null}
   {replyingTo?<GlassSurface radius={18}style={s.replyBar}><View style={{flex:1}}><Text style={s.replyTitle}>Replying to {replyingTo.senderName||'message'}</Text><Text style={{color:isDark?'#FFF':'#333'}}numberOfLines={1}>{replyingTo.text||'Media'}</Text></View><TouchableOpacity onPress={()=>setReplyingTo(null)}><Text style={{fontSize:22}}>×</Text></TouchableOpacity></GlassSurface>:null}
   <ChatInput inputRef={inputRef}value={inputText}onChangeText={setInputText}onSend={handleSend}sending={sending}onAttachImage={()=>handleMediaPick('image')}onAttachVideo={()=>handleMediaPick('video')}onAttachDocument={handleDocumentPick}onAttachVoice={handleVoiceRecord}onAttachLocation={handleLocationPick}onAttachContact={handleContactPick}onPoll={handlePoll}/>
  </View></GlassScene>

  <ChatFeatureHub visible={featuresOpen}onClose={()=>setFeaturesOpen(false)}activeFilter={activeFilter}onFilter={applyFilter}onSearch={runSearch}muted={muted}onMute={toggleMute}onTimer={setTimer}onMarkRead={markAllRead}onExport={exportChat}onJumpLatest={()=>listRef.current?.scrollToOffset?.({offset:0,animated:true})}onFocusComposer={()=>{setFeaturesOpen(false);setTimeout(()=>inputRef.current?.focus?.(),220)}}onSettings={()=>navigation.navigate('ChatSettings',{chatId,friendId,chatName,messageTTL})}/>
 </SafeAreaView>;
}
const themeBorder=isDark=>isDark?'rgba(255,255,255,.10)':'rgba(0,0,0,.08)';
const s=StyleSheet.create({container:{flex:1},area:{flex:1},list:{paddingHorizontal:15,paddingBottom:15,paddingTop:10},progress:{padding:8,backgroundColor:'rgba(8,126,255,.1)',alignItems:'center'},progressText:{fontSize:12,fontWeight:'700',color:'#087EFF'},bar:{width:'80%',height:4,backgroundColor:'rgba(8,126,255,.2)',borderRadius:2},fill:{height:'100%',backgroundColor:'#087EFF',borderRadius:2},filterBar:{minHeight:38,borderBottomWidth:1,flexDirection:'row',alignItems:'center',paddingHorizontal:14},noResults:{position:'absolute',top:'46%',alignSelf:'center',alignItems:'center',opacity:.85},noResultsText:{marginTop:7,color:'#7A8EA3',fontWeight:'800'},replyBar:{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:8,borderTopWidth:1,borderTopColor:'rgba(128,128,128,.15)'},replyTitle:{fontSize:11,fontWeight:'800',color:'#087EFF',marginBottom:2}});
