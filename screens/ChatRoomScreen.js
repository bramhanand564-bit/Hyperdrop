// ==========================================
// FILE: screens/ChatRoomScreen.js
// ==========================================
import React, { useRef, useEffect } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, Animated, Text } from 'react-native';
import { auth } from '../firebaseConfig';
import { useTheme } from '../context/ThemeContext';

// --- CUSTOM HOOK ---
import useChatRoomLogic from '../hooks/useChatRoomLogic';

// --- COMPONENTS ---
import ChatHeader from '../components/chat/ChatHeader';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';

export default function ChatRoomScreen({ route, navigation }) {
  const { isDark } = useTheme();
  const { chatId = 'global', chatName = 'Global Room', friendId, friendAvatar } = route.params || {};
  const isGlobal = chatId === 'global';

  // 🚀 USE OUR NEW HOOK (NOW WITH uploadProgress)
  const { 
    messages, inputText, setInputText, loading, sending, uploadProgress,
    handleSend, handleMediaPick, handleDocumentPick, initiateCall 
  } = useChatRoomLogic(chatId, isGlobal, friendId, chatName, navigation);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bg = isDark ? '#050A10' : '#F3F7FA';

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        
        {/* 🚀 HEADER (WITH CALL & VIDEO CALL ENABLED) */}
        <ChatHeader 
          chatName={chatName} 
          friendAvatar={friendAvatar}
          isGlobal={isGlobal} 
          onBack={() => navigation.goBack()} 
          onInfoPress={() => {}} 
          onCall={() => initiateCall('voice')}
          onVideoCall={() => initiateCall('video')}
        />

        {/* 🚀 REAL UPLOAD PROGRESS BAR */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Uploading... {uploadProgress}%</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
            </View>
          </View>
        )}

        {/* 💬 CHAT AREA */}
        <View style={styles.chatArea}>
          {loading ? (
            <ActivityIndicator size="large" color="#087EFF" style={{ marginTop: 30 }} />
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MessageBubble item={item} isMe={item.senderId === auth.currentUser?.uid} isGlobal={isGlobal} />
              )}
              inverted={true}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* ⌨️ INPUT AREA (WITH ATTACHMENTS ENABLED) */}
        <ChatInput 
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          sending={sending}
          onAttachImage={() => handleMediaPick('image')}
          onAttachVideo={() => handleMediaPick('video')}
          onAttachDocument={handleDocumentPick}
        />
        
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatArea: { flex: 1 },
  listContent: { paddingHorizontal: 15, paddingBottom: 15, paddingTop: 10 },
  
  // 🚀 New Styles for Progress Bar
  progressContainer: { padding: 10, backgroundColor: 'rgba(8, 126, 255, 0.1)', alignItems: 'center' },
  progressText: { fontSize: 12, fontWeight: '700', color: '#087EFF', marginBottom: 5 },
  progressBarBg: { width: '80%', height: 4, backgroundColor: 'rgba(8, 126, 255, 0.2)', borderRadius: 2 },
  progressBarFill: { height: '100%', backgroundColor: '#087EFF', borderRadius: 2 }
});
