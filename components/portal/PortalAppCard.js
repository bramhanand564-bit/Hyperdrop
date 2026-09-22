import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function PortalAppCard({ item, navigation }) {
  const { isDark } = useTheme();

  // 🎨 Super Glassy, Zero-Neon Palette
  const bg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.85)';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)';
  const textMain = isDark ? '#F5F5F7' : '#1C1C1E';
  const textSub = isDark ? '#8E8E93' : '#6C6C70';
  
  // Action Button Colors
  const actionBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(8, 126, 255, 0.1)';
  const actionText = isDark ? '#FFFFFF' : '#087EFF';

  // 🧠 Smart Identification Logic (Real DB Data Mapping)
  const isBot = item.type === 'bot' || item.type === 'ai-agent' || item.rules || item.systemPrompt;
  const itemName = item.name || item.botName || 'Unknown';
  const creatorName = item.creator || item.creatorName || 'Developer';
  
  // Auto-generate avatar if no custom icon is provided
  const avatarUrl = item.icon || `https://ui-avatars.com/api/?name=${itemName.replace(' ', '+')}&background=random&color=fff&bold=true`;

  // 🚀 The Router Logic
  const handlePress = () => {
    if (isBot) {
      // Send to our 100% Real AI Chat Screen
      navigation.navigate('BotChatScreen', { botData: item });
    } else {
      // Send to our Secure Sandbox Renderer
      navigation.navigate('WebPortalScreen', {
        title: itemName,
        url: item.url,
        htmlCode: item.code, // Nax Studio (AI Generated) code goes here
        isPremium: item.isPremium || false
      });
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: borderCol }]}>
      
      {/* 🖼️ Left Side: Avatar & Info */}
      <View style={styles.leftContent}>
        <Image source={{ uri: avatarUrl }} style={styles.icon} />
        
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: textMain }]} numberOfLines={1}>{itemName}</Text>
            {/* Verified Tick for Ecosystem Apps */}
            <Ionicons name="checkmark-circle" size={14} color="#087EFF" style={{ marginLeft: 4, marginTop: 2 }} />
          </View>
          
          <Text style={[styles.creator, { color: textSub }]} numberOfLines={1}>
            {item.category || (isBot ? 'AI Agent' : 'Mini-App')} • @{creatorName}
          </Text>
        </View>
      </View>

      {/* 🖱️ Right Side: Smart Action Button */}
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: actionBg }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={[styles.actionBtnText, { color: actionText }]}>
          {isBot ? 'Chat' : 'Open'}
        </Text>
      </TouchableOpacity>
      
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 14, 
    marginBottom: 12, 
    borderRadius: 20, 
    borderWidth: 1,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.03, 
    shadowRadius: 12, 
    elevation: 1 
  },
  leftContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1, 
    marginRight: 10 
  },
  icon: { 
    width: 46, 
    height: 46, 
    borderRadius: 14, 
    marginRight: 14,
    backgroundColor: '#333'
  },
  info: { 
    flex: 1,
    justifyContent: 'center'
  },
  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 16, 
    fontWeight: '700', 
    letterSpacing: -0.2 
  },
  creator: { 
    fontSize: 12, 
    fontWeight: '500', 
    marginTop: 3 
  },
  actionBtn: { 
    paddingHorizontal: 18, 
    paddingVertical: 8, 
    borderRadius: 14,
    minWidth: 70,
    alignItems: 'center'
  },
  actionBtnText: { 
    fontWeight: '700', 
    fontSize: 13 
  }
});
