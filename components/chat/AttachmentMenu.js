// ==========================================
// FILE: components/chat/AttachmentMenu.js
// ==========================================
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function AttachmentMenu({ isVisible, onImage, onVideo, onDocument }) {
  const { isDark } = useTheme();
  
  // 🎬 MICRO-ANIMATION: Smooth Slide-Up Effect
  const slideAnim = useRef(new Animated.Value(150)).current; 
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Menu opens with a nice spring bounce
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 7 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
    } else {
      // Menu closes smoothly
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 150, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start();
    }
  }, [isVisible]);

  // If not visible and animation is done, don't render to save memory
  if (!isVisible && opacityAnim._value === 0) return null;

  // --- COLORS ---
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <Animated.View 
      style={[
        styles.attachMenu, 
        { 
          backgroundColor: headerBg, 
          borderTopColor: border,
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      {/* 🖼️ GALLERY OPTION */}
      <TouchableOpacity style={styles.attachOption} activeOpacity={0.7} onPress={onImage}>
        <View style={[styles.iconCircle, { backgroundColor: '#FF3B30' }]}>
          <Ionicons name="image" size={24} color="#FFF" />
        </View>
        <Text style={[styles.attachText, { color: textMain }]}>Gallery</Text>
      </TouchableOpacity>

      {/* 🎥 VIDEO OPTION */}
      <TouchableOpacity style={styles.attachOption} activeOpacity={0.7} onPress={onVideo}>
        <View style={[styles.iconCircle, { backgroundColor: '#AF52DE' }]}>
          <Ionicons name="videocam" size={24} color="#FFF" />
        </View>
        <Text style={[styles.attachText, { color: textMain }]}>Video</Text>
      </TouchableOpacity>

      {/* 📄 DOCUMENT OPTION */}
      <TouchableOpacity style={styles.attachOption} activeOpacity={0.7} onPress={onDocument}>
        <View style={[styles.iconCircle, { backgroundColor: '#087EFF' }]}>
          <Ionicons name="document" size={24} color="#FFF" />
        </View>
        <Text style={[styles.attachText, { color: textMain }]}>Document</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  attachMenu: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingVertical: 20, 
    borderTopWidth: 1, 
    paddingBottom: 25 
  },
  attachOption: { alignItems: 'center', width: 80 },
  iconCircle: { 
    width: 54, height: 54, borderRadius: 27, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 8, 
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.15, shadowRadius: 4 
  },
  attachText: { fontSize: 12, fontWeight: '600' }
});
