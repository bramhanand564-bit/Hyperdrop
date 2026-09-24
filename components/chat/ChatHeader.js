import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function ChatHeader({ chatName, friendAvatar, isGlobal, onBack, onInfoPress, onCall, onVideoCall, isOnline=false, statusText, typing=false }) {
  const { theme } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isOnline) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.72, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [isOnline, pulse]);
  const avatar = friendAvatar ? { uri: friendAvatar } : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(chatName || 'User')}&background=087EFF&color=ffffff` };
  return (
    <View style={[s.header, { backgroundColor: theme.surfaceStrong, borderBottomColor: theme.border }]}>
      <TouchableOpacity style={s.back} onPress={onBack}>
        <Ionicons name="arrow-back" size={23} color={theme.text} />
      </TouchableOpacity>
      <TouchableOpacity style={s.info} onPress={onInfoPress} activeOpacity={0.86}>
        <View>
          <Image source={avatar} style={s.avatar} />
          {!isGlobal && isOnline ? <Animated.View style={[s.dot, { borderColor: theme.surfaceStrong, opacity: pulse }]} /> : null}
        </View>
        <View style={s.text}>
          <Text style={[s.title, { color: theme.text }]} numberOfLines={1}>{chatName}</Text>
          <Text style={[s.sub, { color: theme.sub }]}>{typing ? 'typing…' : isGlobal ? 'Community room' : statusText || (isOnline ? 'online' : 'last active recently')}</Text>
        </View>
      </TouchableOpacity>
      <View style={s.actions}>
        {!isGlobal && <><TouchableOpacity style={s.btn} onPress={onCall}><Ionicons name="call-outline" size={21} color={theme.blue} /></TouchableOpacity><TouchableOpacity style={s.btn} onPress={onVideoCall}><Ionicons name="videocam-outline" size={23} color={theme.blue} /></TouchableOpacity></>}
        <TouchableOpacity style={s.btn} onPress={onInfoPress}><Ionicons name="ellipsis-horizontal" size={22} color={theme.text} /></TouchableOpacity>
      </View>
    </View>
  );
}
const s=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',height:64,borderBottomWidth:1,paddingHorizontal:5},
  back:{width:44,height:44,justifyContent:'center',alignItems:'center'},
  info:{flex:1,flexDirection:'row',alignItems:'center'},
  avatar:{width:40,height:40,borderRadius:20,marginRight:10},
  dot:{position:'absolute',bottom:-1,right:7,width:12,height:12,borderRadius:6,backgroundColor:'#35C76F',borderWidth:2},
  text:{flex:1},title:{fontSize:16,fontWeight:'850'},sub:{fontSize:12,marginTop:2,fontWeight:'600'},actions:{flexDirection:'row'},btn:{width:40,height:44,justifyContent:'center',alignItems:'center'}
});
