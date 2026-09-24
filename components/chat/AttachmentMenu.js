import React,{useEffect,useRef}from'react';
import{View,Text,TouchableOpacity,StyleSheet,Animated}from'react-native';
import{Ionicons}from'@expo/vector-icons';
import{useTheme}from'../../context/ThemeContext';

export default function AttachmentMenu({isVisible,onImage,onVideo,onDocument,onVoice,onLocation,onContact,onPoll}){
 const{theme}=useTheme();const y=useRef(new Animated.Value(150)).current;const o=useRef(new Animated.Value(0)).current;
 useEffect(()=>{Animated.parallel([Animated.spring(y,{toValue:isVisible?0:150,useNativeDriver:true,speed:24,bounciness:8}),Animated.timing(o,{toValue:isVisible?1:0,duration:180,useNativeDriver:true})]).start()},[isVisible]);
 if(!isVisible&&o._value===0)return null;
 const items=[['image','Gallery',onImage,'#4D8DFF'],['videocam','Video',onVideo,'#6C7EEA'],['document','File',onDocument,'#087EFF'],['mic','Voice',onVoice,'#35C76F'],['location','Place',onLocation,'#5A91B8'],['person','Person',onContact,'#6D8FD6'],['stats-chart','Poll',onPoll,'#5A91B8']];
 return <Animated.View style={[s.menu,{backgroundColor:theme.surfaceStrong,borderTopColor:theme.border,opacity:o,transform:[{translateY:y}]}]}>{items.map(([i,t,p,c])=><TouchableOpacity key={t} style={s.item} onPress={p} activeOpacity={.82}><View style={[s.icon,{backgroundColor:c}]}><Ionicons name={i} size={20} color="#FFF"/></View><Text style={[s.text,{color:theme.text}]}>{t}</Text></TouchableOpacity>)}</Animated.View>
}
const s=StyleSheet.create({menu:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-around',paddingVertical:12,borderTopWidth:1},item:{alignItems:'center',width:'16.6%',minWidth:60,marginVertical:4},icon:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center',shadowOffset:{width:0,height:4},shadowOpacity:.12,shadowRadius:8,elevation:2},text:{fontSize:10,fontWeight:'700',marginTop:4}});
