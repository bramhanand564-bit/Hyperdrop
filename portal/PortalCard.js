// ==========================================
// FILE: portal/PortalCard.js
// ==========================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function PortalCard({ item, navigation, variant = 'default', rank = null }) {
  const { isDark } = useTheme();

  // --- COLORS ---
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';
  const appColor = item.color || blue;

  const isBot = item.type === 'Bot' || item.entryType === 'bot';
  const subtitle = isBot ? (item.username || '@bot') : (item.category || 'Mini App');
  const actionText = isBot ? 'Chat' : 'Install';

  // 🚀 NAVIGATION ROUTER
  const handlePress = () => {
    if (isBot) {
      navigation.navigate('BotChat', {
        botId: item.id,
        name: item.name,
        botUsername: item.username
      });
    } else {
      navigation.navigate('MiniAppInstall', { app: item });
    }
  };

  const getRankStyle = (index) => {
    if (index === 1) return { color: '#FFD700', fontSize: 22 };
    if (index === 2) return { color: '#C0C0C0', fontSize: 20 };
    if (index === 3) return { color: '#CD7F32', fontSize: 18 };
    return { color: textSub, fontSize: 15 };
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      style={[
        styles.cardContainer, 
        { backgroundColor: cardBg, borderColor: border },
        variant === 'grid' && styles.gridCard
      ]}
      onPress={handlePress}
    >
      {rank !== null && (
        <View style={styles.rankBox}>
          <Text style={[styles.rankText, getRankStyle(rank)]}>{rank}</Text>
        </View>
      )}

      <View style={[styles.iconBox, { backgroundColor: `${appColor}20` }, variant === 'grid' && styles.gridIconBox]}>
        {item.icon ? (
          <Ionicons name={item.icon} size={variant === 'grid' ? 30 : 26} color={appColor} />
        ) : (
          <Image 
            source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'App')}&background=${appColor.replace('#','')}&color=fff` }} 
            style={variant === 'grid' ? styles.gridAvatar : styles.listAvatar} 
          />
        )}
      </View>
      
      <View style={[styles.infoBox, variant === 'grid' && styles.gridInfoBox]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.nameText, { color: textMain }]} numberOfLines={1}>{item.name}</Text>
          {isBot && <Ionicons name="hardware-chip" size={12} color="#AF52DE" style={{ marginLeft: 4 }} />}
        </View>
        <Text style={[styles.subText, { color: textSub }]} numberOfLines={1}>{subtitle}</Text>
        
        {variant === 'default' && item.description ? (
          <Text style={[styles.descText, { color: textSub }]} numberOfLines={1}>{item.description}</Text>
        ) : null}
      </View>

      <TouchableOpacity 
        style={[
          styles.actionBtn, 
          { backgroundColor: isBot ? 'rgba(175,82,222,0.15)' : `${blue}15` },
          variant === 'grid' && styles.gridActionBtn
        ]}
        onPress={handlePress}
      >
        <Text style={[styles.actionBtnText, { color: isBot ? '#AF52DE' : blue }]}>
          {actionText}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  rankBox: { width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  rankText: { fontWeight: '900' },
  iconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  listAvatar: { width: 52, height: 52, borderRadius: 16 },
  infoBox: { flex: 1, marginLeft: 14, marginRight: 10, justifyContent: 'center' },
  nameText: { fontSize: 16, fontWeight: '800' },
  subText: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  descText: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontWeight: '800', fontSize: 13 },
  gridCard: { flexDirection: 'column', alignItems: 'center', width: 140, padding: 14, marginRight: 14, marginBottom: 0 },
  gridIconBox: { width: 60, height: 60, borderRadius: 18, marginBottom: 10 },
  gridAvatar: { width: 60, height: 60, borderRadius: 18 },
  gridInfoBox: { marginLeft: 0, marginRight: 0, alignItems: 'center', marginBottom: 10 },
  gridActionBtn: { width: '100%', paddingVertical: 8 }
});
