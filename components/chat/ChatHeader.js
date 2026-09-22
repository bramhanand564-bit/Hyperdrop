// ==========================================
// FILE: components/chat/ChatHeader.js
// ==========================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function ChatHeader({ chatName, friendAvatar, isGlobal, onBack, onInfoPress, onCall, onVideoCall }) {
  const { isDark } = useTheme();

  // --- COLORS ---
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#1687FF'; // Premium Nax Blue

  // 🖼️ DYNAMIC AVATAR LOGIC
  const getAvatar = () => {
    if (friendAvatar && friendAvatar.length > 5) return { uri: friendAvatar };
    const name = encodeURIComponent(chatName || 'User');
    return { uri: `https://ui-avatars.com/api/?name=${name}&background=1687FF&color=ffffff` };
  };

  return (
    <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
      
      {/* 🔙 BACK BUTTON */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={textMain} />
      </TouchableOpacity>

      {/* 👤 AVATAR & CHAT INFO (Pressable) */}
      <TouchableOpacity activeOpacity={0.8} style={styles.headerInfo} onPress={onInfoPress}>
        <View>
          <Image source={getAvatar()} style={styles.avatar} />
          {/* 🟢 Fake Online Dot for premium feel (Hidden in Global) */}
          {!isGlobal && <View style={[styles.onlineDot, { borderColor: headerBg }]} />}
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.headerTitle, { color: textMain }]} numberOfLines={1}>{chatName}</Text>
          <Text style={[styles.headerSub, { color: textSub }]}>
            {isGlobal ? 'Public Community Room' : 'Online'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* 📞 ACTIONS (Call, Video, Info) */}
      <View style={styles.actionContainer}>
        {!isGlobal && (
          <>
            <TouchableOpacity style={styles.headerAction} onPress={onCall}>
              <Ionicons name="call" size={22} color={blue} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerAction} onPress={onVideoCall}>
              <Ionicons name="videocam" size={24} color={blue} />
            </TouchableOpacity>
          </>
        )}
        
        {/* Info button logic retained from old code */}
        <TouchableOpacity style={styles.headerAction} onPress={onInfoPress}>
          <Ionicons name="ellipsis-vertical" size={22} color={textMain} />
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', height: 60, borderBottomWidth: 1, paddingHorizontal: 5 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 2 },
  avatar: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  onlineDot: { position: 'absolute', bottom: 0, right: 8, width: 12, height: 12, borderRadius: 6, backgroundColor: '#34C759', borderWidth: 2 },
  textContainer: { flex: 1, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  actionContainer: { flexDirection: 'row', alignItems: 'center' },
  headerAction: { width: 40, height: 44, justifyContent: 'center', alignItems: 'center' }
});
