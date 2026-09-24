import React,{useState}from'react';
import{View,TextInput,TouchableOpacity,StyleSheet,Platform,KeyboardAvoidingView}from'react-native';
import{Ionicons}from'@expo/vector-icons';
import{useTheme}from'../../context/ThemeContext';
import AttachmentMenu from './AttachmentMenu';

export default function ChatInput({value,onChangeText,onSend,sending,onAttachImage,onAttachVideo,onAttachDocument,onAttachVoice,onAttachLocation,onAttachContact}){
 const{theme}=useTheme();const[showMenu,setShowMenu]=useState(false);
 const canSend=value.trim().length>0&&!sending;const close=()=>setShowMenu(false);
 return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={Platform.OS==='ios'?0:25}>
  <AttachmentMenu isVisible={showMenu} onImage={()=>{close();onAttachImage?.()}} onVideo={()=>{close();onAttachVideo?.()}} onDocument={()=>{close();onAttachDocument?.()}} onVoice={()=>{close();onAttachVoice?.()}} onLocation={()=>{close();onAttachLocation?.()}} onContact={()=>{close();onAttachContact?.()}}/>
  <View style={[s.row,{backgroundColor:theme.surface,borderTopColor:theme.border}]}>
   <TouchableOpacity style={[s.attach,{backgroundColor:theme.input,borderColor:theme.border}]} onPress={()=>setShowMenu(v=>!v)}><Ionicons name={showMenu?'close':'add'} size={25} color={theme.blue}/></TouchableOpacity>
   <View style={[s.box,{backgroundColor:theme.input,borderColor:theme.border}]}><TextInput style={[s.text,{color:theme.text}]} placeholder="Write something…" placeholderTextColor={theme.sub} value={value} onChangeText={onChangeText} multiline onFocus={close}/></View>
   <TouchableOpacity style={[s.send,{backgroundColor:canSend?theme.blue:theme.input,borderColor:theme.border}]} onPress={()=>{close();onSend()}} disabled={!canSend}><Ionicons name="arrow-up" size={18} color={canSend?'#FFF':theme.sub}/></TouchableOpacity>
  </View>
 </KeyboardAvoidingView>
}
const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'flex-end',padding:10,borderTopWidth:1,paddingBottom:Platform.OS==='ios'?25:10},attach:{width:40,height:40,borderRadius:20,borderWidth:1,justifyContent:'center',alignItems:'center'},box:{flex:1,minHeight:40,maxHeight:100,borderRadius:21,borderWidth:1,paddingHorizontal:15,justifyContent:'center',paddingVertical:8,marginHorizontal:8},text:{fontSize:16,maxHeight:90},send:{width:40,height:40,borderRadius:20,borderWidth:1,justifyContent:'center',alignItems:'center'}});
