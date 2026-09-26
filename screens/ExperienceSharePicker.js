import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import MessagingService from '../messaging/MessagingService';

export default function ExperienceSharePicker({ route, navigation }) {
  const { experience } = route.params || {};
  const { theme } = useTheme();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return undefined; }
    return onSnapshot(
      collection(db, 'users', uid, 'user_chats'),
      snap => {
        setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, []);

  const send = async chat => {
    const target = chat.chatId || chat.id;
    if (!target || !experience?.id) return;
    setSending(chat.id);
    try {
      await MessagingService.sendMessage(target, {
        type: 'experience',
        text: '⚡ ' + (experience.name || 'Experience') + ' — try this',
        experienceId: experience.id,
        experienceName: experience.name,
        experienceDescription: experience.description,
        experienceIcon: experience.icon || '⚡',
        experienceSchema: experience.schema || null,
      });
      Alert.alert('Sent', 'Experience shared to the chat.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Send failed', e.message || 'Could not share experience.');
    } finally {
      setSending('');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.title, { color: theme.text }]}>Share Experience</Text>
          <Text style={[styles.sub, { color: theme.sub }]} numberOfLines={1}>{experience?.name || 'Experience'} · share to any chat</Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={theme.blue} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={chats.filter(item => !search.trim() || String(item.name || item.groupName || item.friendName || item.username || '').toLowerCase().includes(search.trim().toLowerCase()))}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListHeaderComponent={
            <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={17} color={theme.sub} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Find a chat or group"
                placeholderTextColor={theme.sub}
                style={{ flex: 1, marginLeft: 8, color: theme.text }}
              />
            </View>
          }
          ListEmptyComponent={
            <Text style={{ color: theme.sub, textAlign: 'center', marginTop: 40 }}>
              No chats available.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => send(item)} activeOpacity={0.88}>
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.avatar, { backgroundColor: 'rgba(8,126,255,.12)' }]}>
                  <Ionicons name={item.type === 'group' ? 'people' : 'person'} size={20} color={theme.blue} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.name, { color: theme.text }]}>
                    {item.name || item.groupName || item.friendName || 'Nax Chat'}
                  </Text>
                  <Text style={[styles.meta, { color: theme.sub }]}>
                    {item.type === 'group' ? 'Group' : 'Chat'}
                  </Text>
                </View>
                {sending === item.id ? (
                  <ActivityIndicator color={theme.blue} />
                ) : (
                  <Ionicons name="paper-plane-outline" size={20} color={theme.blue} />
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { height: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,.12)' },
  title: { fontSize: 20, fontWeight: '900' },
  sub: { fontSize: 12, marginTop: 2 },
  search: { height: 44, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 3 },
});
