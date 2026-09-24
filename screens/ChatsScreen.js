// ==========================================
// FILE: screens/ChatsScreen.js
// ==========================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, SafeAreaView, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import GlassScene from '../components/ui/GlassScene';
import GlassSurface from '../components/ui/GlassSurface';
import GlassButton from '../components/ui/GlassButton';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

// --- IMPORTED LOGIC & COMPONENTS ---
import useChatLogic from '../hooks/useChatLogic';
import ChatItem from '../components/ChatItem';
import NewChatModal from '../components/NewChatModal';
import GlobalChatCard from '../components/chat/GlobalChatCard';
import SearchResultCard from '../components/chat/SearchResultCard';

export default function ChatsScreen({ navigation }) {
  const { isDark } = useTheme();
  
  // 🚀 HOOK CALL: All complex logic handles itself
  const { 
    searchQuery, setSearchQuery, searching, searchResult, openingChat, 
    handleSearch, openNewChat, clearSearch, currentUser 
  } = useChatLogic(navigation);

  const [privateChats, setPrivateChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);

  // Colors
  const bg = isDark ? '#071521' : '#F3F7FA';
  const headerBg = isDark ? '#0D2635' : '#FFFFFF';
  const inputBg = isDark ? '#1A3447' : '#EEF3F7';
  const textMain = isDark ? '#F5F9FC' : '#142532';
  const textSub = isDark ? '#8EAABD' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';

  // --- REALTIME CHATS ---
  const fetchChats = () => {
    if (!currentUser?.uid) { setPrivateChats([]); setLoading(false); setRefreshing(false); return; }
    
    const chatsQuery = query(collection(db, 'users', currentUser.uid, 'user_chats'), where('type', '==', 'private'));

    return onSnapshot(chatsQuery, (snapshot) => {
      const chats = [];
      snapshot.forEach((item) => chats.push({ id: item.id, ...item.data() }));
      chats.sort((a, b) => getTime(b.lastMessageTime || b.updatedAt) - getTime(a.lastMessageTime || a.updatedAt));
      setPrivateChats(chats);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.log('User chats error:', error);
      setLoading(false);
      setRefreshing(false);
    });
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fetchChats();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [currentUser?.uid]);

  const onRefresh = () => { setRefreshing(true); fetchChats(); };

  function getTime(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    return value.seconds ? value.seconds * 1000 : (typeof value === 'number' ? value : 0);
  }

  const openChat = (item) => {
    navigation.navigate('ChatRoom', {
      chatId: item.chatId || item.id, 
      chatName: item.friendName || item.name || item.username || 'Nax User',
      friendId: item.friendId || item.userId || '', 
      friendUsername: item.friendUsername || item.username || '', 
      friendAvatar: item.friendAvatar || item.avatar || ''
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}><GlassScene>
      
      {/* HEADER & SEARCH */}
      <GlassSurface strong radius={0} style={[styles.header, { backgroundColor: 'transparent', borderBottomColor: border }]}>
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.title, { color: textMain }]}>Chats</Text>
            <Text style={[styles.subtitle, { color: textSub }]}>Your private conversations</Text>
          </View>
          <GlassButton title="New" icon="add" onPress={() => setShowNewMenu(true)} compact />
        </View>

        <View style={[styles.searchBox, { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: border, borderWidth: 1 }]>
          <Ionicons name="search" size={21} color={textSub} />
          <TextInput
            style={[styles.searchInput, { color: textMain }]} placeholder="@username search..." placeholderTextColor={textSub}
            value={searchQuery} onChangeText={(text) => { setSearchQuery(text); if (searchResult) clearSearch(); }}
            onSubmitEditing={handleSearch} autoCapitalize="none" autoCorrect={false} returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color={textSub} />
            </TouchableOpacity>
          )}
          {searching && <ActivityIndicator size="small" color={blue} style={styles.searchLoader} />}
        </View>
      </View>

      {/* CHATS LIST */}
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={blue} /><Text style={[styles.loadingText, { color: textSub }]}>Loading chats...</Text></View>
      ) : (
        <FlatList
          data={privateChats}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={blue} />}
          renderItem={({ item }) => <ChatItem item={item} currentUser={currentUser} onPress={openChat} />}
          ListHeaderComponent={
            <View>
              <SearchResultCard result={searchResult} onClear={clearSearch} onChatPress={(res) => openNewChat(res, () => setShowNewMenu(false))} isOpening={openingChat} />
              {privateChats.length > 0 && <Text style={[styles.sectionTitle, { color: textSub }]}>PRIVATE CHATS</Text>}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#122B3B' : '#E5F1FB' }]}><Ionicons name="chatbubbles-outline" size={52} color={blue} /></View>
              <Text style={[styles.emptyTitle, { color: textMain }]}>No Private Chats Yet</Text>
              <Text style={[styles.emptyText, { color: textSub }]}>Search a friend or bot by @username and start chatting.</Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.globalSection}>
              <GlobalChatCard onPress={() => { setShowNewMenu(false); navigation.navigate('ChatRoom', { chatId: 'global_chats', chatName: 'Global Room' }); }} />
            </View>
          }
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* MODAL */}
      <NewChatModal
        visible={showNewMenu}
        onClose={() => setShowNewMenu(false)}
        onStartPrivateChat={() => { setShowNewMenu(false); Alert.alert('New Chat', 'Upar @username search karo aur user/bot ko select karo.'); }}
        onOpenGlobalRoom={() => { setShowNewMenu(false); navigation.navigate('ChatRoom', { chatId: 'global_chats', chatName: 'Global Room' }); }}
        onCreateBot={() => { setShowNewMenu(false); navigation.navigate('BotCreate'); }}
        onOpenMessagingHub={() => { setShowNewMenu(false); navigation.navigate('MessagingHub'); }}
      />
    </SafeAreaView>
  );
}

// Minimal Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 18, paddingHorizontal: 18, paddingBottom: 15, borderBottomWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 30, fontWeight: '800' },
  subtitle: { marginTop: 2, fontSize: 12 },
  newButton: { height: 42, paddingHorizontal: 14, borderRadius: 21, backgroundColor: '#1687FF', flexDirection: 'row', alignItems: 'center', gap: 5 },
  newText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  searchBox: { height: 50, borderRadius: 18, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, height: '100%', fontSize: 16, marginLeft: 10 },
  clearButton: { padding: 4 },
  searchLoader: { marginLeft: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 3, marginBottom: 10 },
  chatList: { padding: 14, paddingBottom: 115 },
  globalSection: { marginTop: 5 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  emptyState: { minHeight: 390, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 35, paddingTop: 35 },
  emptyIcon: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 21, fontWeight: '800', textAlign: 'center' },
  emptyText: { marginTop: 9, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
