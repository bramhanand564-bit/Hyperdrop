import React,{memo,useEffect,useState}from'react';
import{View,Text,StyleSheet,Image,TouchableOpacity,Modal,SafeAreaView,Linking,TextInput,Alert}from'react-native';
import{Ionicons}from'@expo/vector-icons';
import{useTheme}from'../../context/ThemeContext';
import{auth}from'../../firebaseConfig';
import{Video,ResizeMode,Audio}from'expo-av';
import*as FileSystem from'expo-file-system';
import{deleteCloudinaryByToken}from'../../utils/cloudinaryUpload';
import MessagingService from'../../messaging/MessagingService';

function VoiceNote({uri,isDark}){
 const[sound,setSound]=useState(null);const[playing,setPlaying]=useState(false);
 useEffect(()=>()=>{sound?.unloadAsync().catch(()=>{})},[sound]);
 const toggle=async()=>{try{if(sound){if(playing){await sound.pauseAsync();setPlaying(false)}else{await sound.playAsync();setPlaying(true)}return}
  const r=await Audio.Sound.createAsync({uri});setSound(r.sound);r.sound.setOnPlaybackStatusUpdate(st=>{if(st.didJustFinish){setPlaying(false);r.sound.setPositionAsync(0).catch(()=>{})}});await r.sound.playAsync();setPlaying(true)}catch(e){}};
 return <TouchableOpacity style={[s.voiceBtn,{backgroundColor:isDark?'rgba(8,126,255,.12)':'rgba(8,126,255,.08)'}]}onPress={toggle}><Ionicons name={playing?'pause':'play'}size={20}color="#087EFF"/><View style={s.wave}>{[1,2,3,4,5].map(i=><View key={i}style={[s.waveLine,{height:8+(i%3)*6}]}/>)}</View><Text style={{fontSize:11,color:'#087EFF',fontWeight:'800'}}>Voice</Text></TouchableOpacity>
}

function MessageBubble({item,isMe,isGlobal,chatId,onReply,onForward,navigation}){
 const{isDark,theme}=useTheme();
 const[imageOpen,setImageOpen]=useState(false),[actionOpen,setActionOpen]=useState(false),[editOpen,setEditOpen]=useState(false),[editText,setEditText]=useState(item.text||''),[local,setLocal]=useState(item.fileUri),[openedOnce,setOpenedOnce]=useState(!!item.viewOnceOpenedBy?.[auth.currentUser?.uid]),[experienceValues,setExperienceValues]=useState({}),[experienceBusy,setExperienceBusy]=useState('');
 const other=theme.text,sub=theme.sub;
 const time=t=>{if(!t)return'';const d=t.toDate?t.toDate():new Date(t);return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})};
 useEffect(()=>{let mounted=true;(async()=>{if(!isMe&&item.fileUri&&item.deleteToken){try{const ext=item.fileName?.includes('.')?item.fileName.slice(item.fileName.lastIndexOf('.')):(item.type==='video'?'.mp4':item.type==='image'?'.jpg':'.bin');const path=`${FileSystem.documentDirectory}nax_media_${item.id}${ext}`;const info=await FileSystem.getInfoAsync(path);const r=info.exists?{uri:path,status:200}:await FileSystem.downloadAsync(item.fileUri,path);if(r.status===200&&mounted){setLocal(r.uri);await deleteCloudinaryByToken(item.deleteToken)}}catch(e){}}})();return()=>{mounted=false}},[item.fileUri,item.deleteToken,item.id,isMe]);
 const reactionValues=Object.values(item.reactions||{}),readBy=Object.keys(item.readBy||{}).length>0,delivered=Object.keys(item.deliveredTo||{}).length>0;
 const openOnce=async()=>{await MessagingService.openViewOnce(chatId,item.id).catch(()=>{});setOpenedOnce(true);setImageOpen(true)};
 const choose=async action=>{setActionOpen(false);try{
  if(action==='reply')onReply?.(item);if(action==='forward')onForward?.(item);if(action==='react')await MessagingService.toggleReaction(chatId,item.id,'❤️');
  if(action==='star')await MessagingService.toggleStar(chatId,item.id);if(action==='pin')await MessagingService.pinMessage(chatId,item.id);
  if(action==='delete')await MessagingService.deleteMessage(chatId,item.id,true);if(action==='edit'){setEditText(item.text||'');setEditOpen(true)}
 }catch(e){Alert.alert('Message',e.message||'Action failed.')}};
 const runExperienceAction=async action=>{
  if(!item.experienceId||!action||experienceBusy)return;
  const missing=(item.experienceSchema?.fields||[]).find(f=>f.required&&(experienceValues[f.id]===undefined||experienceValues[f.id]===''));
  if(missing&&['complete','submit','claim','book','pay','approve'].includes(String(action.label||'').toLowerCase())){
   return Alert.alert('Required field',`Please complete: ${missing.label||missing.id}`);
  }
  setExperienceBusy(action.id);
  try{await ExperienceAPI.performAction(item.experienceId,action,experienceValues);Alert.alert('Experience',`✓ ${action.label} recorded`);}
  catch(e){Alert.alert('Experience',e.message||'Action failed.')}
  finally{setExperienceBusy('');}
 };
 const renderPoll=()=>{const votes=item.poll?.votes||{};return <View><Text style={{color:isMe?'#FFF':other,fontWeight:'900'}}>{item.poll.question}</Text>{(item.poll.options||[]).map((o,i)=>{const count=Object.values(votes).filter(v=>v===i).length;const mine=votes[auth.currentUser?.uid]===i;return <TouchableOpacity key={i}onPress={()=>MessagingService.votePoll(chatId,item.id,i).catch(e=>Alert.alert('Poll',e.message||'Vote failed'))}style={[s.pollOption,{backgroundColor:mine?'rgba(8,126,255,.14)':theme.input,borderColor:theme.border}]}><Text style={{color:other,flex:1}}>{o}</Text><Text style={{color:sub,fontWeight:'800'}}>{count}</Text></TouchableOpacity>})}</View>};
 return <View style={[s.wrap,isMe?s.me:s.other]}>
  {!isMe&&isGlobal?<Text style={[s.sender,{color:sub}]}>@{item.senderName}</Text>:null}
  <TouchableOpacity activeOpacity={.92}onLongPress={()=>setActionOpen(true)}style={[s.bubble,isMe?s.bubbleMe:{backgroundColor:theme.bubbleOther,borderColor:theme.border,borderWidth:1}]}>
   {item.replyToText?<View style={[s.reply,{borderLeftColor:theme.blue}]}><Text style={{color:sub,fontSize:11,fontWeight:'700'}}>{item.replyToSenderName||'Reply'}</Text><Text style={{color:other,fontSize:12}}numberOfLines={1}>{item.replyToText}</Text></View>:null}
   {item.deleted?<Text style={[s.deleted,{color:sub}]}>This message was deleted</Text>:null}
   {item.type==='image'&&item.fileUri?(item.viewOnce&&!isMe&&!openedOnce?<TouchableOpacity style={[s.onceBox,{backgroundColor:theme.input,borderColor:theme.border}]}onPress={openOnce}><Ionicons name="eye-outline"size={30}color={theme.blue}/><Text style={{color:theme.text,fontWeight:'900',marginTop:6}}>Open once</Text></TouchableOpacity>:item.viewOnce&&!isMe&&openedOnce?<Text style={{color:sub,fontStyle:'italic'}}>Opened once</Text>:<TouchableOpacity onPress={()=>setImageOpen(true)}><Image source={{uri:local||item.fileUri}}style={s.image}/></TouchableOpacity>):null}
   {item.type==='video'&&item.fileUri?(item.viewOnce&&!isMe&&!openedOnce?<TouchableOpacity style={[s.onceBox,{backgroundColor:theme.input,borderColor:theme.border}]}onPress={async()=>{await MessagingService.openViewOnce(chatId,item.id).catch(()=>{});setOpenedOnce(true)}}><Ionicons name="play-circle-outline"size={32}color={theme.blue}/><Text style={{color:theme.text,fontWeight:'900',marginTop:6}}>Open video once</Text></TouchableOpacity>:item.viewOnce&&!isMe&&openedOnce?<Text style={{color:sub,fontStyle:'italic'}}>Opened once</Text>:<Video style={s.video}source={{uri:local||item.fileUri}}useNativeControls resizeMode={ResizeMode.COVER}/>):null}
   {item.type==='file'&&item.fileUri?<TouchableOpacity onPress={()=>Linking.openURL(local||item.fileUri)}style={s.file}><Ionicons name="document-text"size={28}color={isMe?'#FFF':theme.blue}/><Text style={{color:isMe?'#FFF':other,flex:1,marginLeft:8}}numberOfLines={1}>{item.fileName||'File'}</Text></TouchableOpacity>:null}
   {item.type==='voice'&&item.fileUri?<VoiceNote uri={local||item.fileUri}isDark={isDark}/>:null}
   {item.type==='location'&&item.location?<TouchableOpacity style={s.special} onPress={async()=>{const lat=Number(item.location.latitude ?? item.location.lat);const lng=Number(item.location.longitude ?? item.location.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))return Alert.alert('Location','Location coordinates are unavailable.');try{await Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)}catch(e){Alert.alert('Location','Could not open maps.')}}}><Ionicons name="location"size={28}color="#5A91B8"/><Text style={{color:isMe?'#FFF':other}}>Shared location</Text></TouchableOpacity>:null}
   {item.type==='contact'&&item.contact?<View style={s.special}><Ionicons name="person-circle"size={30}color="#6D8FD6"/><View><Text style={{color:isMe?'#FFF':other,fontWeight:'800'}}>{item.contact.name||'Contact'}</Text><Text style={{color:isMe?'rgba(255,255,255,.7)':sub}}>{item.contact.phone||''}</Text></View></View>:null}
   {item.type==='poll'&&item.poll?renderPoll():null}
   {item.type==='experience'?<View style={[s.appInvite,{backgroundColor:isMe?'rgba(255,255,255,.12)':theme.surface,borderColor:theme.border}]}>
    <View style={s.inviteHead}><View style={[s.inviteIcon,{backgroundColor:'rgba(8,126,255,.12)'}]}><Text style={{fontSize:24}}>{item.experienceIcon||'⚡'}</Text></View><View style={{flex:1,marginLeft:10}}><Text style={{color:isMe?'#FFF':theme.text,fontSize:15,fontWeight:'900'}} numberOfLines={1}>{item.experienceName||'Experience'}</Text><Text style={{color:isMe?'rgba(255,255,255,.75)':theme.sub,fontSize:11,marginTop:3}} numberOfLines={2}>{item.experienceDescription||'Interactive experience'}</Text></View></View>
    {(item.experienceSchema?.fields||[]).slice(0,2).map(field=><View key={field.id} style={{marginTop:7}}>
      <Text style={{color:isMe?'rgba(255,255,255,.8)':theme.sub,fontSize:10,fontWeight:'800',marginBottom:4}}>{field.label}{field.required?' *':''}</Text>
      {field.type==='Checkbox'?<TouchableOpacity onPress={()=>setExperienceValues(v=>({...v,[field.id]:!v[field.id]}))} style={{height:38,borderRadius:11,borderWidth:1,borderColor:theme.border,backgroundColor:theme.input,justifyContent:'center',paddingHorizontal:10}}><Text style={{color:isMe?'#FFF':theme.text,fontSize:12}}>{experienceValues[field.id]?'✓ Selected':'Select'}</Text></TouchableOpacity>
      :<TextInput value={String(experienceValues[field.id]??'')} onChangeText={v=>setExperienceValues(prev=>({...prev,[field.id]:v}))} placeholder={field.type} placeholderTextColor={theme.sub} style={{height:38,borderRadius:11,borderWidth:1,borderColor:theme.border,backgroundColor:theme.input,paddingHorizontal:10,color:theme.text,fontSize:12}}/>}
    </View>)}
    <View style={{flexDirection:'row',gap:8,marginTop:9}}>
      {(item.experienceSchema?.actions||[]).filter(a=>a.primary||a.label==='Complete'||a.label==='Submit').slice(0,2).map(action=><TouchableOpacity key={action.id} disabled={!!experienceBusy} onPress={()=>runExperienceAction(action)} style={[s.joinBtn,{flex:1,backgroundColor:theme.blue,marginTop:0,opacity:experienceBusy&&experienceBusy!==action.id?0.6:1}]}>
        <Text style={{color:'#FFF',fontWeight:'900',fontSize:11}}>{experienceBusy===action.id?'…':action.label}</Text>
      </TouchableOpacity>)}
      <TouchableOpacity style={[s.joinBtn,{flex:1,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,marginTop:0}]} onPress={()=>navigation?.navigate('ExperienceRuntime',{experienceId:item.experienceId})}>
        <Text style={{color:theme.text,fontWeight:'900',fontSize:11}}>Open</Text>
      </TouchableOpacity>
    </View>
   </View>:null}
   {item.type==='app_invite'?<View style={[s.appInvite,{backgroundColor:isMe?'rgba(255,255,255,.12)':theme.surface,borderColor:theme.border}]}>
    <View style={s.inviteHead}><View style={[s.inviteIcon,{backgroundColor:'rgba(8,126,255,.12)'}]}><Ionicons name={item.appIcon||'game-controller'} size={25} color={theme.blue}/></View><View style={{flex:1,marginLeft:10}}><Text style={{color:isMe?'#FFF':theme.text,fontSize:15,fontWeight:'900'}} numberOfLines={1}>{item.appName||'Nax App'}</Text><Text style={{color:isMe?'rgba(255,255,255,.75)':theme.sub,fontSize:11,marginTop:3}} numberOfLines={2}>{item.appDescription||'Open this Nax app invite.'}</Text></View></View>
    {item.sessionId?<Text style={{color:isMe?'rgba(255,255,255,.72)':theme.sub,fontSize:10,marginTop:8}}>Multiplayer room • {String(item.sessionId).slice(0,8)}</Text>:null}
    <TouchableOpacity style={[s.joinBtn,{backgroundColor:theme.blue}]} onPress={()=>navigation?.navigate('MiniAppViewer',{title:item.appName||'Nax App',appConfig:item.appConfig||{id:item.appId,name:item.appName,description:item.appDescription,icon:item.appIcon,htmlCode:item.htmlCode},url:item.url,htmlCode:item.htmlCode,entryType:item.entryType||((item.htmlCode)?'html':'declarative'),appId:item.appId,sessionId:item.sessionId,maxPlayers:item.maxPlayers||4})}>
      <Ionicons name="play" size={16} color="#FFF"/><Text style={{color:'#FFF',fontWeight:'900',marginLeft:7}}>{item.sessionId?'Join & Open':'Open App'}</Text>
    </TouchableOpacity>
   </View>:null}
   {item.text&&item.type!=='location'&&item.type!=='contact'&&item.type!=='poll'&&item.text!=='This message was deleted'?<Text style={[s.msg,{color:isMe?'#FFF':other}]}>{item.text}</Text>:null}
   <View style={s.meta}><Text style={{color:isMe?'rgba(255,255,255,.72)':sub,fontSize:10}}>{time(item.createdAt)}{item.editedAt?' · edited':''}</Text>{isMe?<Ionicons name={readBy?'checkmark-done':'checkmark'}size={14}color={readBy?'#B7EEFF':'rgba(255,255,255,.72)'}/>:null}</View>
  </TouchableOpacity>
  {reactionValues.length>0?<View style={[s.reactions,{backgroundColor:theme.surfaceStrong,borderColor:theme.border}]}><Text>{reactionValues.slice(0,4).join(' ')}</Text><Text style={{fontSize:10,color:sub}}> {reactionValues.length}</Text></View>:null}
  <Modal visible={imageOpen}transparent animationType="fade"onRequestClose={()=>setImageOpen(false)}><SafeAreaView style={s.full}><TouchableOpacity onPress={()=>setImageOpen(false)}style={s.close}><Ionicons name="close"size={30}color="#FFF"/></TouchableOpacity><Image source={{uri:local||item.fileUri}}style={s.fullImg}resizeMode="contain"/></SafeAreaView></Modal>
  <Modal visible={actionOpen}transparent animationType="slide"onRequestClose={()=>setActionOpen(false)}><TouchableOpacity style={s.sheetBg}activeOpacity={1}onPress={()=>setActionOpen(false)}><View style={[s.sheet,{backgroundColor:theme.surfaceStrong,borderColor:theme.border}]}>{[['reply','Reply','return-up-forward'],['forward','Forward','arrow-redo-outline'],['react','React ❤️','heart'],['star','Star','star'],['pin','Pin','pin'],...(isMe?[['edit','Edit','create-outline'],['delete','Delete','trash']]:[])].map(([a,t,i])=><TouchableOpacity key={a}style={s.action}onPress={()=>choose(a)}><Ionicons name={i}size={21}color={a==='delete'?'#FF3B30':theme.text}/><Text style={{fontSize:15,fontWeight:'800',color:a==='delete'?'#FF3B30':theme.text}}>{t}</Text></TouchableOpacity>)}</View></TouchableOpacity></Modal>
  <Modal visible={editOpen}transparent animationType="fade"onRequestClose={()=>setEditOpen(false)}><View style={s.editBg}><View style={[s.editCard,{backgroundColor:theme.surfaceStrong,borderColor:theme.border}]}><Text style={{fontSize:16,fontWeight:'900',color:theme.text}}>Edit message</Text><TextInput value={editText}onChangeText={setEditText}style={[s.editInput,{color:theme.text,borderColor:theme.border,backgroundColor:theme.input}]}autoFocus/><View style={s.editRow}><TouchableOpacity onPress={()=>setEditOpen(false)}><Text style={{color:theme.sub,fontWeight:'700'}}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={async()=>{try{await MessagingService.editMessage(chatId,item.id,editText);setEditOpen(false)}catch(e){Alert.alert('Edit',e.message)}}}><Text style={{color:theme.blue,fontWeight:'900'}}>Save</Text></TouchableOpacity></View></View></View></Modal>
 </View>
}
const s=StyleSheet.create({wrap:{marginBottom:10,maxWidth:'84%'},me:{alignSelf:'flex-end'},other:{alignSelf:'flex-start'},sender:{fontSize:11,marginBottom:4,marginLeft:4,fontWeight:'700'},bubble:{padding:10,borderRadius:19},bubbleMe:{backgroundColor:'#087EFF',borderBottomRightRadius:5},msg:{fontSize:15,lineHeight:21},deleted:{fontStyle:'italic'},reply:{borderLeftWidth:3,paddingLeft:8,marginBottom:6},image:{width:220,height:220,borderRadius:16},video:{width:220,height:200,borderRadius:16,backgroundColor:'#000'},onceBox:{width:220,height:150,borderRadius:16,borderWidth:1,alignItems:'center',justifyContent:'center'},voiceBtn:{width:210,height:52,borderRadius:16,flexDirection:'row',alignItems:'center',paddingHorizontal:12,gap:9},wave:{flex:1,height:24,flexDirection:'row',alignItems:'center',justifyContent:'space-around'},waveLine:{width:3,borderRadius:2,backgroundColor:'#087EFF'},file:{flexDirection:'row',alignItems:'center',width:220},special:{flexDirection:'row',alignItems:'center',gap:9},pollOption:{flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:13,padding:11,marginTop:7},meta:{flexDirection:'row',justifyContent:'flex-end',alignItems:'center',gap:3,marginTop:4},reactions:{alignSelf:'flex-end',marginTop:-4,borderRadius:12,borderWidth:1,paddingHorizontal:8,paddingVertical:3},appInvite:{width:270,borderWidth:1,borderRadius:18,padding:12,marginBottom:4},inviteHead:{flexDirection:'row',alignItems:'center'},inviteIcon:{width:46,height:46,borderRadius:14,alignItems:'center',justifyContent:'center'},joinBtn:{height:40,borderRadius:13,flexDirection:'row',alignItems:'center',justifyContent:'center',marginTop:10},full:{flex:1,backgroundColor:'rgba(0,0,0,.95)',justifyContent:'center'},fullImg:{width:'100%',height:'80%'},close:{position:'absolute',top:50,right:20,zIndex:2},sheetBg:{flex:1,backgroundColor:'rgba(0,0,0,.45)',justifyContent:'flex-end'},sheet:{padding:14,borderTopLeftRadius:24,borderTopRightRadius:24,borderWidth:1},action:{paddingVertical:15,flexDirection:'row',alignItems:'center',gap:12},editBg:{flex:1,backgroundColor:'rgba(0,0,0,.5)',justifyContent:'center',padding:20},editCard:{borderRadius:20,borderWidth:1,padding:18},editInput:{borderWidth:1,borderRadius:13,padding:12,marginTop:12,minHeight:80},editRow:{flexDirection:'row',justifyContent:'flex-end',gap:22,marginTop:14}});

export default memo(MessageBubble);
