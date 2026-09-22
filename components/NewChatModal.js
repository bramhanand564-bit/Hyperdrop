import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function NewChatModal({ visible, onClose, onStartPrivateChat, onOpenGlobalRoom, onCreateBot }) {
  const { isDark } = useTheme();

  // Colors
  const cardBg = isDark ? '#132B3B' : '#FFFFFF';
  const textMain = isDark ? '#F5F9FC' : '#142532';
  const textSub = isDark ? '#8EAABD' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.newMenu, { backgroundColor: cardBg }]}>
          <View style={styles.menuHandle} />
          <Text style={[styles.menuTitle, { color: textMain }]}>New</Text>
          <Text style={[styles.menuSubtitle, { color: textSub }]}>Start something new</Text>

          {/* Private Chat */}
          <TouchableOpacity activeOpacity={0.8} style={styles.menuItem} onPress={onStartPrivateChat}>
            <View style={[styles.menuIcon, { backgroundColor: '#1687FF' }]}><Ionicons name="person" size={22} color="#FFFFFF" /></View>
            <View style={styles.menuInfo}>
              <Text style={[styles.menuItemTitle, { color: textMain }]}>New Private Chat</Text>
              <Text style={[styles.menuItemText, { color: textSub }]}>Find someone by @username</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={textSub} />
          </TouchableOpacity>

          {/* Global Chat */}
          <TouchableOpacity activeOpacity={0.8} style={styles.menuItem} onPress={onOpenGlobalRoom}>
            <View style={[styles.menuIcon, { backgroundColor: '#18A66A' }]}><Ionicons name="earth" size={22} color="#FFFFFF" /></View>
            <View style={styles.menuInfo}>
              <Text style={[styles.menuItemTitle, { color: textMain }]}>Global Chat</Text>
              <Text style={[styles.menuItemText, { color: textSub }]}>Chat with everyone</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={textSub} />
          </TouchableOpacity>

          {/* Create AI Bot */}
          <TouchableOpacity activeOpacity={0.8} style={styles.menuItem} onPress={onCreateBot}>
            <View style={[styles.menuIcon, { backgroundColor: '#AF52DE' }]}><Ionicons name="hardware-chip" size={22} color="#FFFFFF" /></View>
            <View style={styles.menuInfo}>
              <Text style={[styles.menuItemTitle, { color: textMain }]}>Create AI Bot</Text>
              <Text style={[styles.menuItemText, { color: textSub }]}>Build your own Telegram-style bot</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={textSub} />
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity activeOpacity={0.8} style={[styles.cancelButton, { borderColor: border }]} onPress={onClose}>
            <Text style={[styles.cancelText, { color: textMain }]}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  newMenu: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  menuHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#71808A', alignSelf: 'center', marginBottom: 18 },
  menuTitle: { fontSize: 24, fontWeight: '800' },
  menuSubtitle: { marginTop: 4, marginBottom: 18, fontSize: 14 },
  menuItem: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  menuIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  menuInfo: { flex: 1, marginLeft: 13 },
  menuItemTitle: { fontSize: 16, fontWeight: '800' },
  menuItemText: { marginTop: 4, fontSize: 13 },
  cancelButton: { height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  cancelText: { fontSize: 15, fontWeight: '700' }
});
