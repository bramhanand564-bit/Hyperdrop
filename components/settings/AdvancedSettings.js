import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { auth, db } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system'; // 🔥 Cache clear karne ke liye

export default function AdvancedSettings() {
  const { isDark, themeMode, changeTheme } = useTheme();
  const [ghostMode, setGhostMode] = useState(false);
  const [clearing, setClearing] = useState(false);
  const user = auth.currentUser;

  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  useEffect(() => {
    if(user) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if(snap.exists()) setGhostMode(snap.data().ghostMode || false);
      });
    }
  }, [user]);

  // 🔥 1. New Working Feature: Ghost Mode 
  const toggleGhostMode = async (val) => {
    setGhostMode(val);
    if(user) await updateDoc(doc(db, 'users', user.uid), { ghostMode: val, online: !val });
  };

  // 🔥 2. New Working Feature: Clear Cache
  const clearAppCache = async () => {
    setClearing(true);
    try {
      const cacheDir = FileSystem.cacheDirectory;
      await FileSystem.deleteAsync(cacheDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      setTimeout(() => {
        Alert.alert("Cache Cleared 🧹", "Junk files deleted. App speed optimized successfully!");
        setClearing(false);
      }, 800);
    } catch(e) {
      setClearing(false);
    }
  };

  return (
    <View style={{ marginBottom: 40 }}>
      <Text style={[styles.sectionTitle, { color: textSub }]}>APPEARANCE</Text>
      <View style={[styles.themeCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.themeRow}>
          {['system', 'light', 'dark'].map((mode) => (
            <TouchableOpacity key={mode} style={[styles.themeBtn, themeMode === mode ? styles.themeBtnActive : { borderColor: isDark ? '#333' : '#ddd' }]} onPress={() => changeTheme(mode)}>
              <Text style={{ color: themeMode === mode ? '#fff' : isDark ? '#aaa' : '#555', textTransform: 'capitalize', fontWeight: themeMode === mode ? 'bold' : 'normal' }}>
                {mode === 'system' ? 'Auto' : mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: textSub }]}>PRIVACY & STORAGE</Text>
      <View style={[styles.themeCard, { backgroundColor: cardBg, borderColor: borderCol, padding: 0, overflow: 'hidden' }]}>
        
        {/* Ghost Mode Toggle */}
        <View style={[styles.settingItem, { borderBottomWidth: 1, borderBottomColor: borderCol }]}>
          <View style={[styles.iconWrap, { backgroundColor: '#5856D6' }]}><Ionicons name="eye-off" size={20} color="#FFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingText, { color: textMain }]}>Ghost Mode</Text>
            <Text style={{ fontSize: 12, color: textSub, marginTop: 2 }}>Hide online status</Text>
          </View>
          <Switch value={ghostMode} onValueChange={toggleGhostMode} trackColor={{ false: isDark ? "#333" : "#e5e5ea", true: "#5856D6" }} thumbColor={"#fff"} />
        </View>

        {/* Clear Cache */}
        <TouchableOpacity onPress={clearAppCache} disabled={clearing} style={[styles.settingItem, { borderBottomWidth: 1, borderBottomColor: borderCol }]}>
          <View style={[styles.iconWrap, { backgroundColor: '#FF3B30' }]}>
            {clearing ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="trash-bin" size={20} color="#FFF" />}
          </View>
          <Text style={[styles.settingText, { color: textMain }]}>{clearing ? 'Clearing Storage...' : 'Clear App Cache'}</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.settingItem} onPress={() => signOut(auth)}>
          <View style={[styles.iconWrap, { backgroundColor: '#333' }]}><Ionicons name="log-out" size={20} color="#FFF" /></View>
          <Text style={[styles.settingText, { color: textMain }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginLeft: 10, marginBottom: 10, letterSpacing: 1, marginTop: 15 },
  themeCard: { borderRadius: 15, borderWidth: 1, marginBottom: 10 },
  themeRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 15 },
  themeBtn: { flex: 1, paddingVertical: 10, marginHorizontal: 5, borderWidth: 1, borderRadius: 8, alignItems: 'center' },
  themeBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  settingText: { flex: 1, fontSize: 16, fontWeight: '500' }
});
