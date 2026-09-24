import React,{useState}from'react';
import{View,TextInput,TouchableOpacity,StyleSheet,Platform,KeyboardAvoidingView}from'react-native';
import{Ionicons}from'@expo/vector-icons';
import{useTheme}from'../../context/ThemeContext';
import AttachmentMenu from './AttachmentMenu';

export default function ChatInput({value,onChangeText,onSend,sending,onAttachImage,onAttachVideo,onAttachDocument,onAttachVoice,onAttachLocation,onAttachContact}){
 const{isDark}=useTheme();const[showMenu,setShowMenu]=useState(false);
 const bg=isDark?'#0B1824':'#FFF',fg=isDark?'#F4F7FA':'#142532',sub=isDark?'#8FA6B9':'#6C8494',input=isDark?'#14202E':'#EEF3F7',blue='#087EFF';
 const canSend=value.trim().length>0&&!sending;
 const close=()=>setShowMenu(false);
 return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={Platform.OS==='ios'?0:25}>
  <AttachmentMenu isVisible={showMenu}
   onImage={()=>{close();onAttachImage?.()}} onVideo={()=>{close();onAttachVideo?.()}} onDocument={()=>{close();onAttachDocument?.()}}
   onVoice={()=>{close();onAttachVoice?.()}} onLocation={()=>{close();onAttachLocation?.()}} onContact={()=>{close();onAttachContact?.()}}/>
  <View style={[s.row,{backgroundColor:bg,borderTopColor:isDark?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'}]}>
   <TouchableOpacity style={s.attach} onPress={()=>setShowMenu(v=>!v)}><Ionicons name={showMenu?'close-circle':'add'} size={28} color={showMenu?'#FF3B30':sub}/></TouchableOpacity>
   <View style={[s.box,{backgroundColor:input}]}><TextInput style={[s.text,{color:fg}]} placeholder="Type a message..." placeholderTextColor={sub} value={value} onChangeText={onChangeText} multiline onFocus={close}/></View>
   <TouchableOpacity style={[s.send,{backgroundColor:canSend?blue:(isDark?'#1A2A3A':'#E0E0E0')}]} onPress={()=>{close();onSend()}} disabled={!canSend}><Ionicons name="send" size={16} color={canSend?'#FFF':sub}/></TouchableOpacity>
  </View>
 </KeyboardAvoidingView>
}
const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'flex-end',padding:10,borderTopWidth:1,paddingBottom:Platform.OS==='ios'?25:10},attach:{width:40,height:40,justifyContent:'center',alignItems:'center'},box:{flex:1,minHeight:40,maxHeight:100,borderRadius:20,paddingHorizontal:15,justifyContent:'center',paddingVertical:8,marginHorizontal:8},text:{fontSize:16,maxHeight:90},send:{width:40,height:40,borderRadius:20,justifyContent:'center',alignItems:'center'}});