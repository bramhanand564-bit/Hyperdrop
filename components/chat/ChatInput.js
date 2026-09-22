// ==========================================
// FILE: components/chat/ChatInput.js
// ==========================================
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

// 🚀 IMPORT NEW ATTACHMENT MENU
import AttachmentMenu from './AttachmentMenu';

// Added new props for specific media types (backward compatible)
export default function ChatInput({ value, onChangeText, onSend, sending, onAttachImage, onAttachVideo, onAttachDocument }) {
  const { isDark } = useTheme();
  
  // State to control menu visibility
  const [showMenu, setShowMenu] = useState(false);

  // Original Colors Preserved
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? '#14202E' : '#EEF3F7';
  const sendActiveBg = '#087EFF';
  const sendInactiveBg = isDark ? '#1A2A3A' : '#E0E0E0';

  const canSend = value.trim().length > 0 && !sending;

  // Toggle Menu Function
  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
    >
      
      {/* 🚀 PREMIUM ANIMATED ATTACHMENT MENU */}
      <AttachmentMenu 
        isVisible={showMenu}
        onImage={() => { setShowMenu(false); if (onAttachImage) onAttachImage(); }}
        onVideo={() => { setShowMenu(false); if (onAttachVideo) onAttachVideo(); }}
        onDocument={() => { setShowMenu(false); if (onAttachDocument) onAttachDocument(); }}
      />

      <View style={[styles.inputContainer, { backgroundColor: headerBg, borderTopColor: border }]}>
        
        {/* Attachment Toggle Button (+) */}
        <TouchableOpacity style={styles.attachBtn} onPress={toggleMenu} activeOpacity={0.7}>
          <Ionicons 
            name={showMenu ? "close-circle" : "add"} 
            size={showMenu ? 28 : 28} 
            color={showMenu ? '#FF3B30' : textSub} 
          />
        </TouchableOpacity>
        
        <View style={[styles.inputBox, { backgroundColor: inputBg }]}>
          <TextInput
            style={[styles.input, { color: textMain }]}
            placeholder="Type a message..."
            placeholderTextColor={textSub}
            value={value}
            onChangeText={onChangeText}
            multiline
            onFocus={() => setShowMenu(false)} // Hide menu instantly when user starts typing
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity 
          style={[styles.sendBtn, { backgroundColor: canSend ? sendActiveBg : sendInactiveBg }]}
          onPress={() => { setShowMenu(false); onSend(); }}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={16} color={canSend ? '#FFF' : textSub} style={{ marginLeft: 2 }} />
        </TouchableOpacity>
        
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 25 : 10 },
  attachBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  inputBox: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 15, justifyContent: 'center', paddingVertical: Platform.OS === 'ios' ? 10 : 8, marginHorizontal: 8 },
  input: { fontSize: 16, maxHeight: 90 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 2 }
});
