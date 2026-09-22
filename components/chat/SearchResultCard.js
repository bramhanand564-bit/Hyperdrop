// ==========================================
// FILE: components/chat/SearchResultCard.js
// ==========================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function SearchResultCard({ result, onClear, onChatPress, isOpening }) {
  const { isDark } = useTheme();

  // Preserved exactly as your old code
  const cardBg = isDark ? '#132B3B' : '#FFFFFF';
  const textMain = isDark ? '#F5F9FC' : '#142532';
  const textSub = isDark ? '#8EAABD' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#1687FF';

  const getBasicAvatar = (name, avatarUrl) => {
    if (avatarUrl) return { uri: avatarUrl };
    const encodedName = encodeURIComponent(name || 'Nax User');
    return { uri: `https://ui-avatars.com/api/?name=${encodedName}&background=1687FF&color=ffffff` };
  };

  if (!result) return null;

  return (
    <View style={[styles.resultBox, { backgroundColor: cardBg, borderColor: border }]}>
      <View style={styles.resultHeader}>
        <Text style={[styles.resultTitle, { color: textMain }]}>Result Found</Text>
        <TouchableOpacity onPress={onClear}>
          <Ionicons name="close" size={22} color={textSub} />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        activeOpacity={0.8} 
        style={styles.resultUser} 
        onPress={() => onChatPress(result)} 
        disabled={isOpening}
      >
        <Image source={getBasicAvatar(result.name, result.avatar)} style={styles.resultAvatar} />
        
        <View style={styles.resultInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.resultName, { color: textMain }]} numberOfLines={1}>
              {result.name}
            </Text>
            {/* BOT BADGE */}
            {result.isBot && (
              <View style={styles.botBadge}>
                <Text style={styles.botBadgeText}>BOT</Text>
              </View>
            )}
          </View>
          <Text style={[styles.resultUsername, { color: blue }]}>
            {result.username?.startsWith('@') ? result.username : `@${result.username}`}
          </Text>
        </View>
        
        <View style={styles.chatButton}>
          {isOpening ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="chatbubble" size={17} color="#FFFFFF" />
              <Text style={styles.chatButtonText}>Chat</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  resultBox: { marginBottom: 14, padding: 14, borderRadius: 18, borderWidth: 1 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultTitle: { fontSize: 15, fontWeight: '800' },
  resultUser: { flexDirection: 'row', alignItems: 'center' },
  resultAvatar: { width: 54, height: 54, borderRadius: 27 },
  resultInfo: { flex: 1, marginLeft: 12 },
  resultName: { fontSize: 16, fontWeight: '800' },
  botBadge: { backgroundColor: '#AF52DE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  botBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  resultUsername: { marginTop: 3, fontSize: 14, fontWeight: '600' },
  chatButton: { minWidth: 68, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#1687FF', paddingHorizontal: 12, borderRadius: 19 },
  chatButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
