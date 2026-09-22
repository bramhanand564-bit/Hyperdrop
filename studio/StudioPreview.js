// ==========================================
// FILE: studio/StudioPreview.js
// ==========================================
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import DeclarativeMiniAppRenderer from '../components/mini-app/DeclarativeMiniAppRenderer';

export default function StudioPreview({ route, navigation }) {
  const { isDark } = useTheme();
  const { appConfig } = route.params || {};

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const previewBg = isDark ? '#101A26' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const purple = '#AF52DE'; 

  if (!appConfig) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: textMain }}>No App Configuration Found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#087EFF' }}>Go Back</Text>
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
        <Text style={[styles.headerTitle, { color: textMain }]}>Preview</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* APP META INFO */}
      <View style={[styles.appMetaBar, { borderBottomColor: border }]}>
        <View style={[styles.appIconBox, { backgroundColor: `${appConfig.color || purple}20` }]}>
          <Ionicons name={appConfig.icon || 'apps'} size={24} color={appConfig.color || purple} />
        </View>
        <View style={styles.appMetaText}>
          <Text style={[styles.appName, { color: textMain }]}>{appConfig.name || 'Generated App'}</Text>
          <Text style={[styles.appPrompt, { color: textSub }]} numberOfLines={1}>
            "{appConfig.originalPrompt || appConfig.description}"
          </Text>
        </View>
      </View>

      {/* SECURE PREVIEW FRAME */}
      <View style={styles.previewWrapper}>
        <Text style={[styles.previewLabel, { color: textSub }]}>LIVE UI PREVIEW</Text>
        <View style={[styles.previewFrame, { backgroundColor: previewBg, borderColor: border }]}>
          
          {/* 🔥 SHARED DECLARATIVE RENDERER 🔥 */}
          {appConfig.components && appConfig.components.length > 0 ? (
            <DeclarativeMiniAppRenderer 
              components={appConfig.components} 
              themeColor={appConfig.color || purple}
              isTestMode={true} 
            />
          ) : (
            <Text style={{ color: textSub, textAlign: 'center', marginTop: 20 }}>No components generated.</Text>
          )}

        </View>
      </View>

      {/* BOTTOM ACTIONS */}
      <View style={[styles.bottomBar, { backgroundColor: headerBg, borderTopColor: border }]}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.testBtn, { borderColor: border }]}
          onPress={() => navigation.navigate('StudioTester', { appConfig })}
        >
          <Ionicons name="bug-outline" size={20} color={textMain} style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnText, { color: textMain }]}>Test Sandbox</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, styles.publishBtn, { backgroundColor: purple }]}
          onPress={() => navigation.navigate('StudioPublisher', { appConfig })}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Publish</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: Platform.OS === 'ios' ? 10 : 15, paddingBottom: 15, borderBottomWidth: 1 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  appMetaBar: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  appIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  appMetaText: { flex: 1, marginLeft: 15 },
  appName: { fontSize: 18, fontWeight: '800' },
  appPrompt: { fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  previewWrapper: { flex: 1, padding: 20 },
  previewLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10, marginLeft: 5 },
  previewFrame: { flex: 1, borderRadius: 24, borderWidth: 1, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  bottomBar: { flexDirection: 'row', padding: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 15, borderTopWidth: 1, gap: 15 },
  actionBtn: { flex: 1, height: 54, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  testBtn: { borderWidth: 1 },
  publishBtn: {},
  actionBtnText: { fontSize: 16, fontWeight: '700' }
});
