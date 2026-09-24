import React,{useEffect,useRef}from'react';
import{View,Text,TouchableOpacity,StyleSheet,Animated}from'react-native';
import{Ionicons}from'@expo/vector-icons';
import{useTheme}from'../../context/ThemeContext';

export default function AttachmentMenu({isVisible,onImage,onVideo,onDocument,onVoice,onLocation,onContact}){
 const{isDark}=useTheme();const y=useRef(new Animated.Value(150)).current;const o=useRef(new Animated.Value(0)).current;
 useEffect(()=>{Animated.parallel([Animated.spring(y,{toValue:isVisible?0:150,useNativeDriver:true}),Animated.timing(o,{toValue:isVisible?1:0,duration:180,useNativeDriver:true})]).start()},[isVisible]);
 if(!isVisible&&o._value===0)return null;
 const bg=isDark?'#0B1824':'#FFF',fg=isDark?'#F4F7FA':'#142532';
 const items=[['image','Gallery',onImage,'#FF3B30'],['videocam','Video',onVideo,'#AF52DE'],['document','File',onDocument,'#087EFF'],['mic','Voice',onVoice,'#34C759'],['location','Place',onLocation,'#FF9500'],['person','Person',onContact,'#5856D6']];
 return <Animated.View style={[s.menu,{backgroundColor:bg,opacity:o,transform:[{translateY:y}]}]}>{items.map(([i,t,p,c])=><TouchableOpacity key={t} style={s.item} onPress={p}><View style={[s.icon,{backgroundColor:c}]}><Ionicons name={i} size={21} color="#FFF"/></View><Text style={[s.text,{color:fg}]}>{t}</Text></TouchableOpacity>)}</Animated.View>
}
const s=StyleSheet.create({menu:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-around',paddingVertical:12,borderTopWidth:1,borderTopColor:'rgba(128,128,128,.15)'},item:{alignItems:'center',width:'16.6%',minWidth:60,marginVertical:4},icon:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},text:{fontSize:10,fontWeight:'700',marginTop:4}});
