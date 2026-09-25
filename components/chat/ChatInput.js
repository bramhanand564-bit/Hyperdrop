import React,{useRef,useState,useImperativeHandle}from'react';
import{View,TextInput,TouchableOpacity,StyleSheet,Platform,KeyboardAvoidingView,Modal,Text,Alert}from'react-native';
import{Ionicons}from'@expo/vector-icons';
import{useTheme}from'../../context/ThemeContext';
import AttachmentMenu from './AttachmentMenu';

export default function ChatInput({value,onChangeText,onSend,sending,onAttachImage,onAttachVideo,onAttachDocument,onAttachVoice,onAttachLocation,onAttachContact,onPoll,inputRef}){
 const{theme}=useTheme();const[showMenu,setShowMenu]=useState(false);const nativeInputRef=useRef(null);useImperativeHandle(inputRef,()=>({focus:()=>nativeInputRef.current?.focus(),blur:()=>nativeInputRef.current?.blur()}),[]);const[pollOpen,setPollOpen]=useState(false);const[q,setQ]=useState('');const[o1,setO1]=useState('');const[o2,setO2]=useState('');
 const canSend=value.trim().length>0&&!sending;const close=()=>setShowMenu(false);
 return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={Platform.OS==='ios'?0:25}>
  <AttachmentMenu isVisible={showMenu} onImage={()=>{close();onAttachImage?.()}} onVideo={()=>{close();onAttachVideo?.()}} onDocument={()=>{close();onAttachDocument?.()}} onVoice={()=>{close();onAttachVoice?.()}} onLocation={()=>{close();onAttachLocation?.()}} onContact={()=>{close();onAttachContact?.()}} onPoll={()=>{close();setPollOpen(true)}}/>
  <View style={[s.quickRow,{backgroundColor:theme.surface,borderTopColor:theme.border}]}>
   {['❤️','😂','🔥','👍','😍','🎉','😢','🙏'].map(e=><TouchableOpacity key={e} style={s.quickEmoji} onPress={()=>onChangeText?.((value||'')+e)}><Text style={s.quickEmojiText}>{e}</Text></TouchableOpacity>)}
  </View>
  <View style={[s.row,{backgroundColor:theme.surface,borderTopColor:theme.border}]}>
   <TouchableOpacity style={[s.attach,{backgroundColor:theme.input,borderColor:theme.border}]} onPress={()=>setShowMenu(v=>!v)}><Ionicons name={showMenu?'close':'add'} size={25} color={theme.blue}/></TouchableOpacity>
   <View style={[s.box,{backgroundColor:theme.input,borderColor:theme.border}]}><TextInput style={[s.text,{color:theme.text}]} placeholder="Write something…" placeholderTextColor={theme.sub} value={value} onChangeText={onChangeText} ref={nativeInputRef} multiline onFocus={close}/></View>
   <TouchableOpacity style={[s.send,{backgroundColor:canSend?theme.blue:theme.input,borderColor:theme.border}]} onPress={()=>{close();onSend()}} disabled={!canSend}><Ionicons name="arrow-up" size={18} color={canSend?'#FFF':theme.sub}/></TouchableOpacity>
  </View>
  <Modal visible={pollOpen} transparent animationType="fade" onRequestClose={()=>setPollOpen(false)}>
   <View style={s.modalBg}><View style={[s.pollCard,{backgroundColor:theme.surfaceStrong,borderColor:theme.border}]}>
    <Text style={[s.pollTitle,{color:theme.text}]}>Create a Nax Poll</Text>
    <TextInput value={q} onChangeText={setQ} placeholder="Question" placeholderTextColor={theme.sub} style={[s.pollInput,{color:theme.text,borderColor:theme.border,backgroundColor:theme.input}]}/>
    <TextInput value={o1} onChangeText={setO1} placeholder="Option 1" placeholderTextColor={theme.sub} style={[s.pollInput,{color:theme.text,borderColor:theme.border,backgroundColor:theme.input}]}/>
    <TextInput value={o2} onChangeText={setO2} placeholder="Option 2" placeholderTextColor={theme.sub} style={[s.pollInput,{color:theme.text,borderColor:theme.border,backgroundColor:theme.input}]}/>
    <View style={s.pollActions}><TouchableOpacity onPress={()=>setPollOpen(false)}><Text style={{color:theme.sub,fontWeight:'700'}}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={()=>{if(!q.trim()||!o1.trim()||!o2.trim())return Alert.alert('Poll','Add a question and two options.');onPoll?.(q.trim(),[o1.trim(),o2.trim()]);setQ('');setO1('');setO2('');setPollOpen(false)}}><Text style={{color:theme.blue,fontWeight:'900'}}>Send Poll</Text></TouchableOpacity></View>
   </View></View>
  </Modal>
 </KeyboardAvoidingView>
}
const s=StyleSheet.create({quickRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:7,paddingTop:6},quickEmoji:{width:36,height:30,alignItems:'center',justifyContent:'center',borderRadius:15},quickEmojiText:{fontSize:20},row:{flexDirection:'row',alignItems:'flex-end',padding:10,borderTopWidth:1,paddingBottom:Platform.OS==='ios'?25:10},attach:{width:40,height:40,borderRadius:20,borderWidth:1,justifyContent:'center',alignItems:'center'},box:{flex:1,minHeight:40,maxHeight:100,borderRadius:21,borderWidth:1,paddingHorizontal:15,justifyContent:'center',paddingVertical:8,marginHorizontal:8},text:{fontSize:16,maxHeight:90},send:{width:40,height:40,borderRadius:20,borderWidth:1,justifyContent:'center',alignItems:'center'},modalBg:{flex:1,backgroundColor:'rgba(0,0,0,.42)',justifyContent:'center',padding:20},pollCard:{borderWidth:1,borderRadius:24,padding:18},pollTitle:{fontSize:18,fontWeight:'900',marginBottom:12},pollInput:{height:46,borderWidth:1,borderRadius:15,paddingHorizontal:13,marginBottom:10},pollActions:{flexDirection:'row',justifyContent:'flex-end',gap:22,marginTop:5}});
