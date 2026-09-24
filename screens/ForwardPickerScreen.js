import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import GlassScene from '../components/ui/GlassScene';
import GlassSurface from '../components/ui/GlassSurface';
import MessagingService from '../messaging/MessagingService';

export default function ForwardPickerScreen({ route, navigation }) {
  const { sourceChatId, message } = route.params || {};
  const { theme } = useTheme();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState('');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return undefined; }
    const q = query(collection(db, 'users', uid, 'user_chats'), where('type', '==', 'private'));
    return onSnapshot(q, snap => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  const forward = async chat => {
    if (!sourceChatId || !message?.id || sending) return;
    setSending(chat.id);
    try {
      await MessagingService.forwardMessage(sourceChatId, message.id, chat.chatId || chat.id);
      navigation.goBack();
    } catch (e) {
      setSending('');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <GlassScene>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={theme.text}/></TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}><Text style={[styles.title,{color:theme.text}]}>Forward</Text><Text style={[styles.sub,{color:theme.sub}]}>Choose a Nax chat</Text></View>
        </View>
        {loading ? <ActivityIndicator color={theme.blue} style={{ marginTop: 30 }}/> : <FlatList data={chats} keyExtractor={item=>item.id} contentContainerStyle={styles.list} renderItem={({item})=>(
          <TouchableOpacity onPress={()=>forward(item)} activeOpacity={.86}>
            <GlassSurface radius={20} style={styles.card}>
              <View style={[styles.avatar,{backgroundColor:'rgba(8,126,255,.12)'}]}><Ionicons name="person" size={20} color={theme.blue}/></View>
              <View style={{flex:1,marginLeft:12}}><Text style={[styles.name,{color:theme.text}]}>{item.friendName||item.name||item.username||'Nax User'}</Text><Text style={[styles.meta,{color:theme.sub}]}>{item.friendUsername?'@'+item.friendUsername:'Private chat'}</Text></View>
              {sending===item.id?<ActivityIndicator color={theme.blue}/>:<Ionicons name="arrow-redo-outline" size={20} color={theme.blue}/>}
            </GlassSurface>
          </TouchableOpacity>
        )} ListEmptyComponent={<Text style={{color:theme.sub,textAlign:'center',marginTop:40}}>No private chats available.</Text>}/>}
      </GlassScene>
    </SafeAreaView>
  );
}
const styles=StyleSheet.create({header:{height:70,flexDirection:'row',alignItems:'center',paddingHorizontal:18,borderBottomWidth:1,borderBottomColor:'rgba(128,128,128,.12)'},title:{fontSize:20,fontWeight:'900'},sub:{fontSize:12,marginTop:2},list:{padding:16,paddingBottom:100},card:{flexDirection:'row',alignItems:'center',padding:14,marginBottom:10},avatar:{width:44,height:44,borderRadius:16,alignItems:'center',justifyContent:'center'},name:{fontSize:15,fontWeight:'800'},meta:{fontSize:12,marginTop:3}});
