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
 const[listRef]=[useRef(null)];
 const[inputRef]=[useRef(null)];

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

 const bg=isDark?'#050A10':'#F3F7FA';

 return <SafeAreaView style={[s.container,{backgroundColor:bg}]}>
  <GlassScene showBubbles={false}><View style={{flex:1}}>
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
