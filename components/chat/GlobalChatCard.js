// ==========================================
// FILE: components/chat/GlobalChatCard.js
// ==========================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function GlobalChatCard({ onPress }) {
  const { isDark } = useTheme();

  // Preserved exactly as your old code
  const textMain = isDark ? '#F5F9FC' : '#142532';
  const textSub = isDark ? '#8EAABD' : '#6C8494';
  const bgColor = isDark ? '#10362E' : '#EAF8F2';
  const borderColor = isDark ? 'rgba(60,220,150,0.18)' : 'rgba(24,166,106,0.12)';

  return (
    <TouchableOpacity 
      activeOpacity={0.84} 
      style={[styles.globalCard, { backgroundColor: bgColor, borderColor: borderColor }]} 
      onPress={onPress}
    >
      <View style={[styles.globalIcon, { backgroundColor: '#18A66A' }]}>
        <Ionicons name="earth" size={27} color="#FFFFFF" />
      </View>
      <View style={styles.globalInfo}>
        <Text style={[styles.globalTitle, { color: textMain }]}>Global Chat</Text>
        <Text style={[styles.globalText, { color: textSub }]} numberOfLines={2}>
          Chat with everyone on Nax Chat
        </Text>
      </View>
      <View style={styles.globalArrow}>
        <Ionicons name="arrow-forward" size={20} color="#18A66A" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  globalCard: { minHeight: 82, padding: 13, borderRadius: 19, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  globalIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  globalInfo: { flex: 1, marginLeft: 13 },
  globalTitle: { fontSize: 17, fontWeight: '800' },
  globalText: { marginTop: 4, fontSize: 13 },
  globalArrow: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(24,166,106,0.10)', alignItems: 'center', justifyContent: 'center' },
});
