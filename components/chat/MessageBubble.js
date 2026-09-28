import React,{memo,useEffect,useState}from'react';
import{View,Text,StyleSheet,Image,TouchableOpacity,Modal,SafeAreaView,Linking,TextInput,Alert}from'react-native';
import{Ionicons}from'@expo/vector-icons';
import{useTheme}from'../../context/ThemeContext';
import{auth}from'../../firebaseConfig';
import{Video,ResizeMode,Audio}from'expo-av';
import*as FileSystem from'expo-file-system';
import{deleteCloudinaryByToken}from'../../utils/cloudinaryUpload';
import MessagingService from'../../messaging/MessagingService';
import ExperienceAPI from'../../api/ExperienceAPI';

const nowDate=()=>new Date().toISOString().slice(0,10); const nowTime=()=>new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false});

function VoiceNote({uri,isDark}){
 const[sound,setSound]=useState(null);const[playing,setPlaying]=useState(false);
 useEffect(()=>()=>{sound?.unloadAsync().catch(()=>{})},[sound]);
 const toggle=async()=>{try{if(sound){if(playing){await sound.pauseAsync();setPlaying(false)}else{await sound.playAsync();setPlaying(true)}return}
  const r=await Audio.Sound.createAsync({uri});setSound(r.sound);r.sound.setOnPlaybackStatusUpdate(st=>{if(st.didJustFinish){setPlaying(false);r.sound.setPositionAsync(0).catch(()=>{})}});await r.sound.playAsync();setPlaying(true)}catch(e){}};
 return <TouchableOpacity style={[s.voiceBtn,{backgroundColor:isDark?'rgba(8,126,255,.12)':'rgba(8,126,255,.08)'}]}onPress={toggle}><Ionicons name={playing?'pause':'play'}size={20}color="#087EFF"/><View style={s.wave}>{[1,2,3,4,5].map(i=><View key={i}style={[s.waveLine,{height:8+(i%3)*6}]}/>)}</View><Text style={{fontSize:11,color:'#087EFF',fontWeight:'800'}}>Voice</Text></TouchableOpacity>
}

function MessageBubble({item,isMe,isGlobal,chatId,onReply,onForward,navigation}){
 const{isDark,theme}=useTheme();
 const[imageOpen,setImageOpen]=useState(false),[actionOpen,setActionOpen]=useState(false),[editOpen,setEditOpen]=useState(false),[editText,setEditText]=useState(item.text||''),[local,setLocal]=useState(item.fileUri),[openedOnce,setOpenedOnce]=useState(!!item.viewOnceOpenedBy?.[auth.currentUser?.uid]),[experienceValues,setExperienceValues]=useState({}),[experienceBusy,setExperienceBusy]=useState(''),[experienceResult,setExperienceResult]=useState(null);
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
  const missing=(item.experienceSchema?.fields||[]).find(f=>f.required&&(experienceValues[f.id]===undefined||experienceValues[f.id]===null||experienceValues[f.id]===''||(f.type==='Checkbox'&&experienceValues[f.id]===false)));
  if(missing&&['complete','submit','claim','book','pay','approve'].includes(String(action.label||'').toLowerCase())){
   return Alert.alert('Required field',`Please complete: ${missing.label||missing.id}`);
  }
  setExperienceBusy(action.id);
  try{const result=await ExperienceAPI.performAction(item.experienceId,action,experienceValues,{chatId});setExperienceResult(result||{status:'ready',label:action.label});Alert.alert('Experience',`✓ ${action.label} recorded`);}
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
   {item.type==='experience'?(()=>{
    const schema=item.experienceSchema||{};
    const gateway=item.experienceGateway||schema.gateway||{};
    const surface={enabled:true,mode:'auto',maxFields:3,maxActions:3,showDescription:false,showStatus:true,showProgress:true,allowInlineActions:true,...(gateway.chat?.surface||{}),...(schema.chatSurface||{})};
    if(surface.enabled===false)return null;
    const fields=Array.isArray(schema.fields)?schema.fields:[];
    const actions=Array.isArray(schema.actions)?schema.actions:[];
    const requiredFields=fields.filter(f=>f.required);
    const completedRequired=requiredFields.filter(f=>{
      const v=experienceValues[f.id];
      return v!==undefined&&v!==null&&v!==''&&!(f.type==='Checkbox'&&v===false);
    }).length;
    const progress=requiredFields.length?Math.round((completedRequired/requiredFields.length)*100):0;
    const score=Math.min(99,fields.length+actions.length);
    const mode=surface.mode==='auto'?(score<=3?'compact':score<=6?'standard':'large'):surface.mode;
    const fieldLimit=Math.max(0,Math.min(8,Number(surface.maxFields)||3));
    const actionLimit=Math.max(1,Math.min(8,Number(surface.maxActions)||3));
    const visibleFields=fields.slice(0,fieldLimit);
    const visibleActions=actions.slice(0,actionLimit);
    const status=experienceResult?.status||'ready';
    const resultText=experienceResult?('✓ '+(experienceResult.label||'Updated')):null;
    const cardWidth=mode==='compact'?255:mode==='large'?330:300;
    const fieldWidth=mode==='large'&&visibleFields.length>1?'48%':'100%';
    const setValue=(id,value)=>setExperienceValues(v=>({...v,[id]:value}));
    const renderField=field=><View key={field.id} style={{width:fieldWidth,marginTop:8}}>
      <Text style={{color:isMe?'rgba(255,255,255,.78)':theme.sub,fontSize:10,fontWeight:'800',marginBottom:4}}>{field.label||field.id}{field.required?' *':''}</Text>
      {field.type==='Checkbox'
        ?<TouchableOpacity accessibilityRole="checkbox" accessibilityState={{checked:!!experienceValues[field.id]}} onPress={()=>setValue(field.id,!experienceValues[field.id])} style={[s.miniSurfaceControl,{backgroundColor:theme.input,borderColor:theme.border}]}><Ionicons name={experienceValues[field.id]?'checkbox':'square-outline'} size={17} color={experienceValues[field.id]?theme.blue:theme.sub}/><Text style={{color:theme.text,fontSize:12,fontWeight:'700',marginLeft:7}}>{experienceValues[field.id]?'Done':'Tap to select'}</Text></TouchableOpacity>
        :field.type==='Rating'
        ?<View style={{height:40,flexDirection:'row',alignItems:'center'}}>{[1,2,3,4,5].map(star=><TouchableOpacity accessibilityLabel={`Rate ${star}`} key={star} onPress={()=>setValue(field.id,star)} style={{paddingHorizontal:3,paddingVertical:7}}><Ionicons name={Number(experienceValues[field.id]||0)>=star?'star':'star-outline'} size={19} color={Number(experienceValues[field.id]||0)>=star?'#F5B301':theme.sub}/></TouchableOpacity>)}</View>
        :field.type==='Date'||field.type==='Time'
        ?<TouchableOpacity onPress={()=>setValue(field.id,field.type==='Date'?nowDate():nowTime())} style={[s.miniSurfaceControl,{backgroundColor:theme.input,borderColor:theme.border}]}><Ionicons name={field.type==='Date'?'calendar-outline':'time-outline'} size={16} color={theme.blue}/><Text style={{color:experienceValues[field.id]?theme.text:theme.sub,fontSize:12,marginLeft:7}}>{experienceValues[field.id]||'Tap to set'}</Text></TouchableOpacity>
        :<TextInput value={String(experienceValues[field.id]??'')} onChangeText={v=>setValue(field.id,field.type==='Number'?v.replace(/[^0-9.-]/g,''):v)} keyboardType={field.type==='Number'?'numeric':'default'} placeholder={field.type==='Number'?'Enter number':'Type here'} placeholderTextColor={theme.sub} style={[s.miniSurfaceInput,{color:theme.text,borderColor:theme.border,backgroundColor:theme.input}]}/>}
    </View>;
    return <View style={[s.appInvite,{width:cardWidth,maxWidth:'100%',backgroundColor:isMe?'rgba(255,255,255,.12)':theme.surface,borderColor:theme.border,padding:mode==='compact'?10:12}]}>
      <View style={s.inviteHead}>
        <View style={[s.inviteIcon,{width:42,height:42,borderRadius:13,backgroundColor:'rgba(8,126,255,.12)'}]}><Text style={{fontSize:21}}>{item.experienceIcon||'⚡'}</Text></View>
        <View style={{flex:1,marginLeft:9,minWidth:0}}>
          <Text style={{color:isMe?'#FFF':theme.text,fontSize:mode==='large'?15:14,fontWeight:'900'}} numberOfLines={1}>{item.experienceName||'Experience'}</Text>
          <Text style={{color:isMe?'rgba(255,255,255,.58)':theme.sub,fontSize:9,marginTop:2}} numberOfLines={1}>Live Chat Surface · {mode}</Text>
        </View>
        {surface.showStatus?<View style={[s.surfaceStatus,{backgroundColor:experienceResult?'rgba(52,199,89,.14)':'rgba(8,126,255,.10)'}]}><Text style={{fontSize:9,fontWeight:'900',color:experienceResult?'#34C759':theme.blue}}>{String(status).toUpperCase()}</Text></View>:null}
      </View>
      {surface.showDescription&&item.experienceDescription?<Text style={{color:isMe?'rgba(255,255,255,.75)':theme.sub,fontSize:11,lineHeight:15,marginTop:7}} numberOfLines={3}>{item.experienceDescription}</Text>:null}
      {surface.showProgress&&requiredFields.length>0?<View style={{marginTop:9}}>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:9,color:isMe?'rgba(255,255,255,.6)':theme.sub,fontWeight:'800'}}>Required</Text><Text style={{fontSize:9,color:isMe?'rgba(255,255,255,.72)':theme.sub,fontWeight:'900'}}>{completedRequired}/{requiredFields.length}</Text></View>
        <View style={[s.surfaceProgressTrack,{backgroundColor:theme.input}]}><View style={[s.surfaceProgressFill,{width:`${progress}%`,backgroundColor:theme.blue}]}/></View>
      </View>:null}
      {visibleFields.length>0?<View style={{flexDirection:mode==='large'?'row':'column',flexWrap:'wrap',justifyContent:'space-between'}}>{visibleFields.map(renderField)}</View>:null}
      {resultText?<View style={[s.surfaceResult,{backgroundColor:'rgba(52,199,89,.10)',borderColor:'rgba(52,199,89,.22)'}]}><Ionicons name="checkmark-circle" size={15} color="#34C759"/><Text style={{color:isMe?'#FFF':theme.text,fontSize:10,fontWeight:'800',marginLeft:6,flex:1}}>{resultText}</Text></View>:null}
      {visibleActions.length>0&&surface.allowInlineActions?<View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:10}}>
        {visibleActions.map(action=><TouchableOpacity accessibilityRole="button" key={action.id} disabled={!!experienceBusy} onPress={()=>runExperienceAction(action)} style={[s.surfaceAction,{flexGrow:action.primary?1:0,minWidth:mode==='compact'?108:mode==='large'?130:115,backgroundColor:action.primary?theme.blue:theme.surface,borderColor:action.primary?theme.blue:theme.border,opacity:(experienceBusy&&experienceBusy!==action.id)?0.55:1}]}>
          {action.primary?<Ionicons name={experienceBusy===action.id?'ellipsis-horizontal':'flash'} size={15} color="#FFF"/>:null}
          <Text style={{color:action.primary?'#FFF':theme.text,fontWeight:'900',fontSize:11}}>{experienceBusy===action.id?'Working…':action.label||'Action'}</Text>
        </TouchableOpacity>)}
      </View>:null}
      {surface.maxFields<fields.length||surface.maxActions<actions.length?<Text style={{color:isMe?'rgba(255,255,255,.48)':theme.sub,fontSize:8,marginTop:8}}>More controls are available in the full app.</Text>:null}
    </View>;
   })():null}
   {item.type==='app_invite'?<View style={[s.appInvite,{backgroundColor:isMe?'rgba(255,255,255,.12)':theme.surface,borderColor:theme.border}]}>
    <View style={s.inviteHead}><View style={[s.inviteIcon,{backgroundColor:'rgba(8,126,255,.12)'}]}><Ionicons name={item.appIcon||'game-controller'} size={25} color={theme.blue}/></View><View style={{flex:1,marginLeft:10}}><Text style={{color:isMe?'#FFF':theme.text,fontSize:15,fontWeight:'900'}} numberOfLines={1}>{item.appName||'Nax App'}</Text><Text style={{color:isMe?'rgba(255,255,255,.75)':theme.sub,fontSize:11,marginTop:3}} numberOfLines={2}>{item.appDescription||'Open this Nax app invite.'}</Text></View></View>
    {item.appGateway?.enabled!==false?<Text style={{color:isMe?'rgba(255,255,255,.58)':theme.sub,fontSize:9,marginTop:8}}>Gateway · {item.appGateway?.chat?.presentation||'card'} · same Nax Store app</Text>:null}
    {item.sessionId?<Text style={{color:isMe?'rgba(255,255,255,.72)':theme.sub,fontSize:10,marginTop:8}}>Multiplayer room • {String(item.sessionId).slice(0,8)}</Text>:null}
    <TouchableOpacity style={[s.joinBtn,{backgroundColor:theme.blue}]} onPress={()=>navigation?.navigate('NaxAppRuntime',{appId:item.appId})}>
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
const s=StyleSheet.create({wrap:{marginBottom:10,maxWidth:'84%'},me:{alignSelf:'flex-end'},other:{alignSelf:'flex-start'},sender:{fontSize:11,marginBottom:4,marginLeft:4,fontWeight:'700'},bubble:{padding:10,borderRadius:19},bubbleMe:{backgroundColor:'#087EFF',borderBottomRightRadius:5},msg:{fontSize:15,lineHeight:21},deleted:{fontStyle:'italic'},reply:{borderLeftWidth:3,paddingLeft:8,marginBottom:6},image:{width:220,height:220,borderRadius:16},video:{width:220,height:200,borderRadius:16,backgroundColor:'#000'},onceBox:{width:220,height:150,borderRadius:16,borderWidth:1,alignItems:'center',justifyContent:'center'},voiceBtn:{width:210,height:52,borderRadius:16,flexDirection:'row',alignItems:'center',paddingHorizontal:12,gap:9},wave:{flex:1,height:24,flexDirection:'row',alignItems:'center',justifyContent:'space-around'},waveLine:{width:3,borderRadius:2,backgroundColor:'#087EFF'},file:{flexDirection:'row',alignItems:'center',width:220},special:{flexDirection:'row',alignItems:'center',gap:9},pollOption:{flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:13,padding:11,marginTop:7},meta:{flexDirection:'row',justifyContent:'flex-end',alignItems:'center',gap:3,marginTop:4},reactions:{alignSelf:'flex-end',marginTop:-4,borderRadius:12,borderWidth:1,paddingHorizontal:8,paddingVertical:3},appInvite:{width:270,borderWidth:1,borderRadius:18,padding:12,marginBottom:4},inviteHead:{flexDirection:'row',alignItems:'center'},inviteIcon:{width:46,height:46,borderRadius:14,alignItems:'center',justifyContent:'center'},miniSurfaceControl:{minHeight:40,borderWidth:1,borderRadius:11,paddingHorizontal:10,flexDirection:'row',alignItems:'center'},miniSurfaceInput:{minHeight:40,borderWidth:1,borderRadius:11,paddingHorizontal:10,fontSize:12},surfaceStatus:{paddingHorizontal:7,paddingVertical:4,borderRadius:8},surfaceProgressTrack:{height:4,borderRadius:3,overflow:'hidden',marginTop:4},surfaceProgressFill:{height:'100%',borderRadius:3},surfaceAction:{minHeight:40,borderWidth:1,borderRadius:11,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},surfaceResult:{borderWidth:1,borderRadius:10,padding:8,flexDirection:'row',alignItems:'center',marginTop:9},joinBtn:{height:40,borderRadius:13,flexDirection:'row',alignItems:'center',justifyContent:'center',marginTop:10},full:{flex:1,backgroundColor:'rgba(0,0,0,.95)',justifyContent:'center'},fullImg:{width:'100%',height:'80%'},close:{position:'absolute',top:50,right:20,zIndex:2},sheetBg:{flex:1,backgroundColor:'rgba(0,0,0,.45)',justifyContent:'flex-end'},sheet:{padding:14,borderTopLeftRadius:24,borderTopRightRadius:24,borderWidth:1},action:{paddingVertical:15,flexDirection:'row',alignItems:'center',gap:12},editBg:{flex:1,backgroundColor:'rgba(0,0,0,.5)',justifyContent:'center',padding:20},editCard:{borderRadius:20,borderWidth:1,padding:18},editInput:{borderWidth:1,borderRadius:13,padding:12,marginTop:12,minHeight:80},editRow:{flexDirection:'row',justifyContent:'flex-end',gap:22,marginTop:14}});

export default memo(MessageBubble);
