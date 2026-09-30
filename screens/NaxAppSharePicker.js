import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import MessagingService from '../messaging/MessagingService';

export default function NaxAppSharePicker({ route, navigation }) {
  const { app } = route.params || {};
  const surfaceType = route.params?.surfaceType || 'app';
  const { theme } = useTheme();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return undefined; }
    return onSnapshot(collection(db, 'users', uid, 'user_chats'),
      snap => { setChats(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
  }, []);

  const send = async chat => {
    const target = chat.chatId || chat.id;
    if (!target || !app?.id) return;
    setSending(chat.id);
    try {
      await MessagingService.sendMessage(target, {
        type: surfaceType === 'connector' ? (app.botId ? 'bot_app' : 'connected_app') : 'app_invite',
        text: '🚀 ' + (app.name || 'Nax App') + ' — try this app',
        appId: app.id,
        appName: app.name || app.title || 'Nax App',
        appDescription: app.description || 'Creator-built app on Nax Store.',
        appIcon: app.icon || '🚀',
        appGateway: app.gateway || null,
        appGatewayId: app.gatewayId || null,
        appPackage: app.package || null,
        appConnector: app.connector || null,
        sourceType: app.sourceType || 'app',
        sourceId: app.sourceId || app.id || '',
        botId: app.botId || '',
        surfaceType,
      });
      Alert.alert('Sent', 'App shared to the real chat.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Send failed', e.message || 'Could not share app.');
    } finally { setSending(''); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={27} color={theme.text} /></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.title, { color: theme.text }]}{surfaceType === 'connector' ? 'Share Connected Surface' : 'Share Nax App'}</Text>
          <Text style={[styles.sub, { color: theme.sub }]} numberOfLines={1}>{app?.name || 'Nax App'} · {surfaceType === 'connector' ? 'live Chat surface' : 'compact Chat card'}</Text>
        </View>
      </View>
      <View style={[styles.preview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.icon, { backgroundColor: 'rgba(8,126,255,.12)' }]}><Text style={{ fontSize: 25 }}>{app?.icon || '🚀'}</Text></View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{app?.name || 'Nax App'}</Text>
          <Text style={[styles.meta, { color: theme.sub }]} numberOfLines={2}>{app?.description || 'Creator-built app on Nax Store.'}</Text>
          <Text style={[styles.gateway, { color: theme.blue }]}>Gateway · Chat card · same app</Text>
        </View>
      </View>
      <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={18} color={theme.sub} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Find a chat or group" placeholderTextColor={theme.sub} style={{ flex: 1, marginLeft: 8, color: theme.text }} />
      </View>
      {loading ? <ActivityIndicator color={theme.blue} style={{ marginTop: 30 }} /> : (
        <FlatList data={chats.filter(item => { const name = item.name || item.groupName || item.friendName || item.username || ''; return !search.trim() || String(name).toLowerCase().includes(search.trim().toLowerCase()); })} keyExtractor={item => item.id} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={<Text style={{ color: theme.sub, textAlign: 'center', marginTop: 40 }}>No chats available.</Text>}
          renderItem={({ item }) => {
            const name = item.name || item.groupName || item.friendName || 'Nax Chat';
            return <TouchableOpacity disabled={!!sending} onPress={() => send(item)} style={[styles.chat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.avatar, { backgroundColor: 'rgba(8,126,255,.12)' }]}><Ionicons name={item.type === 'group' ? 'people' : 'person'} size={20} color={theme.blue} /></View>
              <View style={{ flex: 1, marginLeft: 12 }}><Text style={[styles.name, { color: theme.text }]}>{name}</Text><Text style={[styles.meta, { color: theme.sub }]}>{item.type === 'group' ? 'Group chat' : 'Private chat'}</Text></View>
              {sending === item.id ? <ActivityIndicator color={theme.blue} /> : <Ionicons name="send-outline" size={20} color={theme.blue} />}
            </TouchableOpacity>;
          }}
        />
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
 safe:{flex:1}, header:{height:66,borderBottomWidth:1,flexDirection:'row',alignItems:'center',paddingHorizontal:16},
 title:{fontSize:18,fontWeight:'900'},sub:{fontSize:10,fontWeight:'700',marginTop:2},preview:{margin:16,marginBottom:8,borderWidth:1,borderRadius:18,padding:13,flexDirection:'row'},
 icon:{width:48,height:48,borderRadius:14,alignItems:'center',justifyContent:'center'},name:{fontSize:14,fontWeight:'900'},meta:{fontSize:11,marginTop:3},
 gateway:{fontSize:9,fontWeight:'800',marginTop:5},search:{marginHorizontal:16,marginBottom:4,minHeight:46,borderWidth:1,borderRadius:14,flexDirection:'row',alignItems:'center',paddingHorizontal:12},
 chat:{minHeight:66,borderWidth:1,borderRadius:16,marginBottom:9,padding:12,flexDirection:'row',alignItems:'center'},avatar:{width:42,height:42,borderRadius:13,alignItems:'center',justifyContent:'center'}
});