import React,{useState}from'react';
import{SafeAreaView,View,Text,TouchableOpacity,StyleSheet,Switch,Alert,ScrollView}from'react-native';
import{Ionicons}from'@expo/vector-icons';
import MessagingService from'../messaging/MessagingService';

export default function ChatSettingsScreen({navigation,route}){
 const{chatId,friendId,chatName}=route.params||{};const[ttl,setTtl]=useState(route.params?.messageTTL||0);const[read,setRead]=useState(true);const[typing,setTyping]=useState(true);
 const saveTimer=async value=>{try{setTtl(value);await MessagingService.setChatTimer(chatId,value);Alert.alert('Saved',value?'Auto-delete enabled.':'Auto-delete disabled.')}catch(e){Alert.alert('Chat',e.message)}};
 const privacy=async(key,value)=>{try{if(key==='read')setRead(value);if(key==='typing')setTyping(value);await MessagingService.setPrivacy({readReceipts:key==='read'?value:read,typingIndicators:key==='typing'?value:typing});}catch(e){Alert.alert('Privacy',e.message)}};
 return <SafeAreaView style={s.safe}><View style={s.header}><TouchableOpacity onPress={()=>navigation.goBack()}><Ionicons name="chevron-back" size={26}/></TouchableOpacity><Text style={s.title}>{chatName||'Chat settings'}</Text><View style={{width:26}}/></View>
 <ScrollView contentContainerStyle={s.content}>
  <Text style={s.section}>CHAT</Text>
  <View style={s.card}><Text style={s.label}>Disappearing messages</Text><Text style={s.sub}>24 hours, 7 days or 90 days</Text><View style={s.row}>{[[0,'Off'],[86400,'24h'],[604800,'7d'],[7776000,'90d']].map(([v,t])=><TouchableOpacity key={v} onPress={()=>saveTimer(v)} style={[s.chip,ttl===v&&s.active]}><Text style={ttl===v?s.activeText:s.chipText}>{t}</Text></TouchableOpacity>)}</View></View>
  <View style={s.card}><Text style={s.label}>Read receipts</Text><Text style={s.sub}>Delivered and seen status on messages</Text><Switch value={read} onValueChange={v=>privacy('read',v)}/></View>
  <View style={s.card}><Text style={s.label}>Typing indicator</Text><Text style={s.sub}>Show when you are typing</Text><Switch value={typing} onValueChange={v=>privacy('typing',v)}/></View>
  <Text style={s.section}>SAFETY</Text>
  <TouchableOpacity style={s.action} onPress={()=>{MessagingService.muteChat(chatId,true).then(()=>Alert.alert('Muted','Chat notifications muted.')).catch(e=>Alert.alert('Mute',e.message))}}><Ionicons name="notifications-off-outline" size={21}/><Text style={s.actionText}>Mute chat</Text></TouchableOpacity>
  {friendId?<TouchableOpacity style={s.action} onPress={()=>Alert.alert('Block','Block '+(chatName||'this user')+'?',[{text:'Cancel',style:'cancel'},{text:'Block',style:'destructive',onPress:()=>MessagingService.blockUser(friendId).then(()=>navigation.goBack())}])}><Ionicons name="ban-outline" size={21}/><Text style={s.actionText}>Block user</Text></TouchableOpacity>:null}
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#F5F7FA'},header:{height:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,backgroundColor:'#FFF',borderBottomWidth:1,borderBottomColor:'#E4E7EB'},title:{fontSize:18,fontWeight:'800'},content:{padding:16},section:{fontSize:11,fontWeight:'800',letterSpacing:1,color:'#6B7280',marginVertical:10},card:{backgroundColor:'#FFF',borderRadius:16,padding:16,marginBottom:10,borderWidth:1,borderColor:'#E5E7EB'},label:{fontSize:15,fontWeight:'800'},sub:{fontSize:12,color:'#7A8494',marginTop:4,marginBottom:12},row:{flexDirection:'row',gap:8},chip:{paddingHorizontal:13,paddingVertical:9,borderRadius:18,borderWidth:1,borderColor:'#DCE2EA'},active:{backgroundColor:'#087EFF',borderColor:'#087EFF'},chipText:{fontSize:12,fontWeight:'700',color:'#667085'},activeText:{fontSize:12,fontWeight:'800',color:'#FFF'},action:{backgroundColor:'#FFF',borderRadius:14,padding:16,marginBottom:9,flexDirection:'row',alignItems:'center',gap:12},actionText:{fontSize:15,fontWeight:'700'}});
