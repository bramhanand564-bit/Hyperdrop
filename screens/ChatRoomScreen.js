import React,{useEffect,useRef}from'react';
import{View,FlatList,StyleSheet,SafeAreaView,ActivityIndicator,Animated,Text,TouchableOpacity}from'react-native';
import{auth}from'../firebaseConfig';
import{useTheme}from'../context/ThemeContext';
import GlassScene from'../components/ui/GlassScene';
import GlassSurface from'../components/ui/GlassSurface';
import useChatRoomLogic from'../hooks/useChatRoomLogic';
import ChatHeader from'../components/chat/ChatHeader';
import MessageBubble from'../components/chat/MessageBubble';
import ChatInput from'../components/chat/ChatInput';

export default function ChatRoomScreen({route,navigation}){
 const{isDark}=useTheme();const{chatId='global',chatName='Global Room',friendId,friendAvatar}=route.params||{};const isGlobal=chatId==='global'||chatId==='global_chats';
 const{messages,inputText,setInputText,loading,sending,uploadProgress,typingUsers,friendOnline,friendLastSeen,messageTTL,setMessageTTL,replyingTo,setReplyingTo,handleSend,handleMediaPick,handleDocumentPick,handleVoiceRecord,handleLocationPick,handleContactPick,handlePoll,handleMessageAction,initiateCall}=useChatRoomLogic(chatId,isGlobal,friendId,chatName,navigation);
 const fade=useRef(new Animated.Value(0)).current;const bg=isDark?'#050A10':'#F3F7FA';
 useEffect(()=>{Animated.timing(fade,{toValue:1,duration:300,useNativeDriver:true}).start()},[]);
 return <SafeAreaView style={[s.container,{backgroundColor:bg}]}><GlassScene><Animated.View style={{flex:1,opacity:fade}}>
  <ChatHeader chatName={chatName} friendAvatar={friendAvatar} isGlobal={isGlobal} onBack={()=>navigation.goBack()} onInfoPress={()=>navigation.navigate('ChatSettings',{chatId,friendId,chatName,messageTTL})} onCall={()=>initiateCall('voice')} onVideoCall={()=>initiateCall('video')} typing={typingUsers.length>0} isOnline={friendOnline} statusText={friendOnline?'online':friendLastSeen?'last seen recently':'offline'}/>
  {uploadProgress>0&&uploadProgress<100?<GlassSurface radius={16} style={s.progress}><Text style={s.progressText}>Uploading… {uploadProgress}%</Text><View style={s.bar}><View style={[s.fill,{width:uploadProgress+'%'}]}/></View></GlassSurface>:null}
  <View style={s.area}>{loading?<ActivityIndicator size="large"color="#087EFF"style={{marginTop:30}}/>:<FlatList data={messages}keyExtractor={m=>m.id}renderItem={({item})=><MessageBubble item={item}isMe={item.senderId===auth.currentUser?.uid}isGlobal={isGlobal}chatId={chatId}onReply={setReplyingTo}/>}inverted contentContainerStyle={s.list}showsVerticalScrollIndicator={false}/>}</View>
  {replyingTo?<GlassSurface radius={18} style={s.replyBar}><View style={{flex:1}}><Text style={s.replyTitle}>Replying to {replyingTo.senderName||'message'}</Text><Text style={{color:isDark?'#FFF':'#333'}}numberOfLines={1}>{replyingTo.text||'Media'}</Text></View><TouchableOpacity onPress={()=>setReplyingTo(null)}><Text style={{fontSize:22}}>×</Text></TouchableOpacity></View>:null}
  <ChatInput value={inputText}onChangeText={setInputText}onSend={handleSend}sending={sending}onAttachImage={()=>handleMediaPick('image')}onAttachVideo={()=>handleMediaPick('video')}onAttachDocument={handleDocumentPick}onAttachVoice={handleVoiceRecord}onAttachLocation={handleLocationPick}onAttachContact={handleContactPick} onPoll={handlePoll}/>
 </Animated.View></GlassScene></SafeAreaView>
}
const s=StyleSheet.create({container:{flex:1},area:{flex:1},list:{paddingHorizontal:15,paddingBottom:15,paddingTop:10},progress:{padding:8,backgroundColor:'rgba(8,126,255,.1)',alignItems:'center'},progressText:{fontSize:12,fontWeight:'700',color:'#087EFF'},bar:{width:'80%',height:4,backgroundColor:'rgba(8,126,255,.2)',borderRadius:2},fill:{height:'100%',backgroundColor:'#087EFF',borderRadius:2},replyBar:{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:8,borderTopWidth:1,borderTopColor:'rgba(128,128,128,.15)'},replyTitle:{fontSize:11,fontWeight:'800',color:'#087EFF',marginBottom:2}});
