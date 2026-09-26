import React, { useRef, useState } from 'react';
import { Animated, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AutoRestorePopup from '../components/modals/AutoRestorePopup';
import GlassSurface from '../components/ui/GlassSurface';
import ChatsScreen from '../screens/ChatsScreen';

const TABS = [
  { id: 'Chats', icon: 'chatbubbles' },
  { id: 'Portals', icon: 'planet' },
  { id: 'Moments', icon: 'aperture' },
  { id: 'Settings', icon: 'settings' },
];

export default function MainAppTabs({ navigation }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('Chats');
  const scales = useRef(TABS.reduce((a, tab) => ({ ...a, [tab.id]: new Animated.Value(1) }), {})).current;

  const pressTab = (id) => {
    if (id === activeTab) return;
    Animated.sequence([
      Animated.spring(scales[id], { toValue: 0.84, useNativeDriver: true, speed: 28 }),
      Animated.spring(scales[id], { toValue: 1, useNativeDriver: true, bounciness: 12 }),
    ]).start();
    setActiveTab(id);
  };

  const renderScreen = () => {
    if (activeTab === 'Portals') {
      const Screen = require('../screens/ExperienceHome').default;
      return <Screen navigation={navigation} />;
    }
    if (activeTab === 'Moments') {
      const Screen = require('../screens/MomentsScreen').default;
      return <Screen navigation={navigation} />;
    }
    if (activeTab === 'Settings') {
      const Screen = require('../screens/SettingsScreen').default;
      return <Screen navigation={navigation} />;
    }
    return <ChatsScreen navigation={navigation} />;
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>{renderScreen()}</View>
        <View pointerEvents="box-none" style={styles.navWrap}>
          <GlassSurface strong radius={26} style={[styles.nav, { backgroundColor: theme.nav }]}>
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <TouchableOpacity key={tab.id} onPress={() => pressTab(tab.id)} activeOpacity={0.88} style={styles.item}>
                  <Animated.View style={{ alignItems: 'center', transform: [{ scale: scales[tab.id] }] }}>
                    {active ? <View style={[styles.activePill, { backgroundColor: theme.blue }]} /> : null}
                    <Ionicons name={active ? tab.icon : `${tab.icon}-outline`} size={23} color={active ? theme.blue : theme.sub} />
                    <Text style={[styles.label, { color: active ? theme.text : theme.sub }]}>{tab.id}</Text>
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </GlassSurface>
        </View>
        <AutoRestorePopup />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, paddingBottom: 92 },
  navWrap: { position: 'absolute', left: 18, right: 18, bottom: Platform.OS === 'ios' ? 18 : 12 },
  nav: { height: 70, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'stretch' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  activePill: { width: 20, height: 3, borderRadius: 2, marginBottom: 4 },
  label: { fontSize: 10, fontWeight: '700', marginTop: 3 },
});
