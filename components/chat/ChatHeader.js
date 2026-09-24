import React from'react';
import{View,Text,TouchableOpacity,StyleSheet,Image}from'react-native';
import{Ionicons}from'@expo/vector-icons';
import{useTheme}from'../../context/ThemeContext';

export default function ChatHeader({chatName,friendAvatar,isGlobal,onBack,onInfoPress,onCall,onVideoCall,isOnline=false,statusText,typing=false}){
 const{isDark}=useTheme();const bg=isDark?'#0B1824':'#FFF',fg=isDark?'#F4F7FA':'#142532',sub=isDark?'#8FA6B9':'#6C8494',blue='#1687FF';
 const avatar=friendAvatar?{uri:friendAvatar}:{uri:`https://ui-avatars.com/api/?name=${encodeURIComponent(chatName||'User')}&background=1687FF&color=ffffff`};
 return <View style={[s.header,{backgroundColor:bg,borderBottomColor:isDark?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'}]}>
  <TouchableOpacity style={s.back} onPress={onBack}><Ionicons name="arrow-back"size={24}color={fg}/></TouchableOpacity>
  <TouchableOpacity style={s.info} onPress={onInfoPress}><View><Image source={avatar}style={s.avatar}/>{!isGlobal&&isOnline?<View style={[s.dot,{borderColor:bg}]}/>:null}</View><View style={s.text}><Text style={[s.title,{color:fg}]}numberOfLines={1}>{chatName}</Text><Text style={[s.sub,{color:sub}]}>{typing?'typing…':isGlobal?'Community room':statusText|| (isOnline?'online':'last seen recently')}</Text></View></TouchableOpacity>
  <View style={s.actions}>{!isGlobal&&<><TouchableOpacity style={s.btn}onPress={onCall}><Ionicons name="call"size={21}color={blue}/></TouchableOpacity><TouchableOpacity style={s.btn}onPress={onVideoCall}><Ionicons name="videocam"size={23}color={blue}/></TouchableOpacity></>}<TouchableOpacity style={s.btn}onPress={onInfoPress}><Ionicons name="ellipsis-vertical"size={22}color={fg}/></TouchableOpacity></View>
 </View>
}
const s=StyleSheet.create({header:{flexDirection:'row',alignItems:'center',height:60,borderBottomWidth:1,paddingHorizontal:5},back:{width:44,height:44,justifyContent:'center',alignItems:'center'},info:{flex:1,flexDirection:'row',alignItems:'center'},avatar:{width:38,height:38,borderRadius:19,marginRight:10},dot:{position:'absolute',bottom:0,right:8,width:12,height:12,borderRadius:6,backgroundColor:'#34C759',borderWidth:2},text:{flex:1},title:{fontSize:16,fontWeight:'800'},sub:{fontSize:12,marginTop:2,fontWeight:'500'},actions:{flexDirection:'row'},btn:{width:40,height:44,justifyContent:'center',alignItems:'center'}});
