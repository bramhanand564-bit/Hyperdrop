// ==========================================
// FILE: navigation/MainAppTabs.js
// ==========================================
import React, { useState, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, 
  SafeAreaView, Platform, Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// 🔥 NAYA IMPORT: Auto-Restore Popup yahan add kiya hai
import AutoRestorePopup from '../components/modals/AutoRestorePopup';

// 🚀 FIXED: Using WalletScreen instead of SettingsScreen
import ChatsScreen from '../screens/ChatsScreen';
import PortalHome from '../portal/PortalHome';
import MomentsScreen from '../screens/MomentsScreen';
import WalletScreen from '../screens/WalletScreen'; 

// TAB CONFIGURATION
const TABS = [
  { id: 'Chats', icon: 'chatbubbles' },
  { id: 'Portals', icon: 'planet' },
  { id: 'Moments', icon: 'aperture' },
  { id: 'Settings', icon: 'settings' }
];

export default function MainAppTabs({ navigation }) {
  const [activeTab, setActiveTab] = useState('Chats');
  const { isDark } = useTheme();

  // 🎬 MICRO-ANIMATION: Scale values for each tab
  const scaleAnims = useRef(TABS.reduce((acc, tab) => {
    acc[tab.id] = new Animated.Value(1);
    return acc;
  }, {})).current;

  // Function to handle tab press with Spring Bounce Effect
  const handleTabPress = (tabId) => {
    if (activeTab === tabId) return; 

    // Run Spring Animation
    Animated.sequence([
      Animated.spring(scaleAnims[tabId], { toValue: 0.85, useNativeDriver: true, speed: 30 }),
      Animated.spring(scaleAnims[tabId], { toValue: 1, useNativeDriver: true, bounciness: 20 })
    ]).start();
    
    setActiveTab(tabId);
  };

  // Render correct screen based on active tab
  const renderScreen = () => {
    switch (activeTab) {
      case 'Chats': return <ChatsScreen navigation={navigation} />;
      case 'Portals': return <PortalHome navigation={navigation} />;
      case 'Moments': return <MomentsScreen navigation={navigation} />;
      case 'Settings': return <WalletScreen navigation={navigation} />; // 🚀 FIXED HERE
      default: return <ChatsScreen navigation={navigation} />;
    }
  };

  // --- COLORS ---
  const mainBg = isDark ? '#050A10' : '#F3F7FA';
  const glassBg = isDark ? 'rgba(11, 24, 36, 0.85)' : 'rgba(255, 255, 255, 0.9)';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const activeCol = '#087EFF'; 
  const inactiveCol = isDark ? '#6C8494' : '#A0B3C1';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: mainBg }]}>
      
      {/* 📱 ACTIVE SCREEN DISPLAY */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* 🚀 FLOATING GLASSMORPHISM TAB BAR */}
      <View style={[styles.glassNavBar, { backgroundColor: glassBg, borderColor: borderCol }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={1} 
              onPress={() => handleTabPress(tab.id)}
              style={styles.navItem}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnims[tab.id] }], alignItems: 'center' }}>
                <Ionicons 
                  name={isActive ? tab.icon : `${tab.icon}-outline`} 
                  size={26} 
                  color={isActive ? activeCol : inactiveCol} 
                />
                <Text style={[
                  styles.navText, 
                  { 
                    color: isActive ? activeCol : inactiveCol, 
                    fontWeight: isActive ? '800' : '500',
                    opacity: isActive ? 1 : 0.8 
                  }
                ]}>
                  {tab.id}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* 🔥 NAYA POPUP: App khulte hi ye background me scan karega aur popup dikhayega */}
      <AutoRestorePopup />
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingBottom: 85 }, 
  glassNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 25 : 15,
    left: 20,
    right: 20,
    height: 68,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  navText: { fontSize: 11, marginTop: 4 }
});
