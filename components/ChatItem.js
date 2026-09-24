// ==========================================
// FILE: components/ChatItem.js
// ==========================================
import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

function ChatItem({ item, currentUser, onPress }) {
  const { isDark } = useTheme();

  // --- COLORS ---
  const cardBg = isDark ? '#132B3B' : '#FFFFFF';
  const textMain = isDark ? '#F5F9FC' : '#142532';
  const textSub = isDark ? '#8EAABD' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#1687FF';
  
  // 🎨 PREMIUM TINT: Very subtle blue tint if there are unread messages
  const unreadBg = isDark ? 'rgba(22, 135, 255, 0.12)' : 'rgba(22, 135, 255, 0.08)'; 

  // --- HELPERS (Preserved exactly as you wrote them) ---
  const normalizeUsername = (value) => {
    let username = String(value || '').trim().toLowerCase();
    if (username.startsWith('@')) username = username.substring(1);
    return username;
  };

  const getChatName = () => item.friendName || item.name || item.displayName || item.friendUsername || item.username || 'Nax User';

  const getLastMessage = () => {
    if (item.lastMessage !== undefined) return item.lastMessage || 'No messages yet';
    if (item.message) return item.message;
    if (item.lastText) return item.lastText;
    const username = item.friendUsername || item.username;
    if (username) return `@${normalizeUsername(username)}`;
    return 'Start chatting';
  };

  const getUnread = () => {
    if (item.unread && typeof item.unread === 'object') return item.unread[currentUser?.uid] || 0;
    if (item.unreadCount && typeof item.unreadCount === 'object') return item.unreadCount[currentUser?.uid] || 0;
    if (typeof item.unread === 'number') return item.unread;
    if (typeof item.unreadCount === 'number') return item.unreadCount;
    return 0;
  };

  const avatarUri = item.friendAvatar || item.avatar || item.photoURL;
  const initials = getChatName().trim().split(/\\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'N';

  const getTime = (value) => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (typeof value === 'number') return value;
    return 0;
  };

  const formatDate = (value) => {
    const time = getTime(value);
    if (!time) return '';
    const date = new Date(time);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  // --- RENDER VARIABLES ---
  const chatName = getChatName();
  const lastMessage = getLastMessage();
  const unread = getUnread();
  const isUnread = unread > 0;

  // 🎬 MICRO-ANIMATION: Unread Badge Spring Pop
  const badgeScale = useRef(new Animated.Value(isUnread ? 1 : 0)).current;

  useEffect(() => {
    if (isUnread) {
      Animated.spring(badgeScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }).start();
    } else {
      badgeScale.setValue(0);
    }
  }, [isUnread]);

  return (
    <TouchableOpacity 
      activeOpacity={0.75} 
      style={[
        styles.chatCard, 
        { 
          backgroundColor: isUnread ? unreadBg : cardBg, 
          borderColor: isUnread ? 'rgba(22, 135, 255, 0.3)' : border // Highlight border slightly if unread
        }
      ]} 
      onPress={() => onPress(item)}
    >
      <View>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: isDark ? '#173B52' : '#DCEEFF' }]}>
            <Text style={[styles.avatarInitials, { color: blue }]}>{initials}</Text>
          </View>
        )}
        {/* 🟢 Online Dot (Shows if user is online - ready for future) */}
        {item.isOnline && <View style={[styles.onlineDot, { borderColor: isUnread ? unreadBg : cardBg }]} />}
      </View>

      <View style={styles.chatInfo}>
        <View style={styles.chatTop}>
          <Text style={[styles.chatName, { color: textMain }]} numberOfLines={1}>
            {chatName}
          </Text>
          {/* Time turns Blue and Bold if there are unread messages */}
          <Text style={[
            styles.chatTime, 
            { 
              color: isUnread ? blue : textSub, 
              fontWeight: isUnread ? '700' : '500' 
            }
          ]}>
            {formatDate(item.lastMessageTime || item.updatedAt)}
          </Text>
        </View>
        
        <View style={styles.chatBottom}>
          {/* Message preview turns brighter and bolder if unread */}
          <Text 
            style={[
              styles.chatMessage, 
              { 
                color: isUnread ? textMain : textSub, 
                fontWeight: isUnread ? '600' : '400' 
              }
            ]} 
            numberOfLines={1}
          >
            {lastMessage}
          </Text>

          {/* Animated Badge */}
          {isUnread && (
            <Animated.View style={[styles.unread, { transform: [{ scale: badgeScale }] }]}>
              <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
            </Animated.View>
          )}
        </View>
      </View>
      
      {/* Subtle chevron, only visible when read so it doesn't clutter the unread view */}
      {!isUnread && <Ionicons name="chevron-forward" size={16} color={textSub} style={{ opacity: 0.4 }} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chatCard: { minHeight: 76, padding: 12, borderRadius: 17, borderWidth: 1, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 18, fontWeight: '800' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#34C759', borderWidth: 2 },
  chatInfo: { flex: 1, marginLeft: 14, marginRight: 8, justifyContent: 'center' },
  chatTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  chatName: { flex: 1, fontSize: 16, fontWeight: '800' },
  chatTime: { fontSize: 12, marginLeft: 6 },
  chatBottom: { flexDirection: 'row', alignItems: 'center' },
  chatMessage: { flex: 1, fontSize: 14, paddingRight: 5 },
  unread: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: '#1687FF', alignItems: 'center', justifyContent: 'center', marginLeft: 8, elevation: 2, shadowColor: '#1687FF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' }
});

export default memo(ChatItem);
