// ==========================================
// FILE: mini-apps/MiniAppInstall.js
// ==========================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Alert, ScrollView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// 🚀 IMPORT OUR REAL API
import { MiniAppAPI } from '../api/MiniAppAPI';

export default function MiniAppInstall({ route, navigation }) {
  const { isDark } = useTheme();
  
  // Params passed from PortalCard
  const { app } = route.params || {};
  
  const [installing, setInstalling] = useState(false);

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';
  const green = '#34C759';

  // 🚀 REAL INSTALL LOGIC
  const handleInstall = async () => {
    if (!app) return;
    setInstalling(true);

    try {
      // Call the secure API
      await MiniAppAPI.installMiniApp(app);

      Alert.alert('Success 🎉', `${app.name} has been added to your Nax Portal!`, [
        { 
          text: 'Open App Now', 
          onPress: () => {
            navigation.replace('MiniAppViewer', { 
              title: app.name, 
              url: app.url, 
              appConfig: app,
              entryType: app.entryType || (app.url ? 'web' : 'declarative')
            });
          } 
        },
        { text: 'Later', style: 'cancel', onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      Alert.alert('Installation Failed', error.message || 'Could not install the app.');
    } finally {
      setInstalling(false);
    }
  };

  if (!app) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: textMain }}>App details not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: blue }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textMain }]}>App Details</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="share-outline" size={24} color={textMain} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* APP IDENTITY */}
        <View style={styles.identitySection}>
          <View style={[styles.bigIconBox, { backgroundColor: `${app.color || blue}20` }]}>
            <Ionicons name={app.icon || 'apps'} size={50} color={app.color || blue} />
          </View>
          <Text style={[styles.appName, { color: textMain }]}>{app.name}</Text>
          <Text style={[styles.appCreator, { color: blue }]}>by {app.creatorId ? 'Nax User' : 'Nax Developer'}</Text>
        </View>

        {/* STATS ROW */}
        <View style={[styles.statsRow, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: textMain }]}>★ {app.rating || 'New'}</Text>
            <Text style={[styles.statLabel, { color: textSub }]}>Rating</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: textMain }]}>{app.category || 'Tool'}</Text>
            <Text style={[styles.statLabel, { color: textSub }]}>Category</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: textMain }]}>{app.installs || 0}</Text>
            <Text style={[styles.statLabel, { color: textSub }]}>Installs</Text>
          </View>
        </View>

        {/* DESCRIPTION */}
        <View style={styles.descSection}>
          <Text style={[styles.sectionTitle, { color: textMain }]}>About this App</Text>
          <Text style={[styles.descText, { color: textSub }]}>
            {app.description || app.desc || 'No description provided.'}
          </Text>
        </View>

        {/* PERMISSIONS */}
        <View style={[styles.permissionBox, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textMain, marginBottom: 12 }]}>Required Permissions</Text>
          {app.entryType === 'web' ? (
            <View style={styles.permItem}>
              <Ionicons name="globe-outline" size={20} color={textSub} />
              <Text style={[styles.permText, { color: textMain }]}>Network Access (Web View)</Text>
            </View>
          ) : (
            <View style={styles.permItem}>
              <Ionicons name="shield-checkmark-outline" size={20} color={green} />
              <Text style={[styles.permText, { color: green }]}>Nax Secure Sandbox (Offline UI)</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* FOOTER ACTION */}
      <View style={[styles.footer, { backgroundColor: headerBg, borderTopColor: border }]}>
        <TouchableOpacity 
          style={[styles.installBtn, { backgroundColor: blue, opacity: installing ? 0.7 : 1 }]} 
          onPress={handleInstall}
          disabled={installing}
        >
          {installing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.installBtnText}>Save & Install</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderBottomWidth: 1, paddingTop: Platform.OS === 'ios' ? 0 : 5 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  content: { padding: 20, paddingBottom: 40 },
  identitySection: { alignItems: 'center', marginBottom: 25 },
  bigIconBox: { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  appName: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  appCreator: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  statsRow: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, paddingVertical: 15, marginBottom: 25 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  divider: { width: 1, height: '80%', alignSelf: 'center' },
  descSection: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  descText: { fontSize: 15, lineHeight: 22 },
  permissionBox: { padding: 18, borderRadius: 16, borderWidth: 1 },
  permItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  permText: { fontSize: 15, marginLeft: 10, fontWeight: '500' },
  footer: { padding: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 15, borderTopWidth: 1 },
  installBtn: { height: 54, borderRadius: 27, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  installBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' }
});
