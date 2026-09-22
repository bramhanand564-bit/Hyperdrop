// ==========================================
// FILE: mini-apps/MiniAppViewer.js
// ==========================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import DeclarativeMiniAppRenderer from '../components/mini-app/DeclarativeMiniAppRenderer';

export default function MiniAppViewer({ route, navigation }) {
  const { isDark } = useTheme();

  // Receives the full app object from Portal or Installer
  const { title, url, appConfig, entryType = 'web' } = route?.params || {};
  
  const [loading, setLoading] = useState(entryType === 'web'); // Only show loader for WebViews

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';

  // Security Check for WebView (Block unsafe schemes)
  const isSafeUrl = (testUrl) => {
    if (!testUrl) return false;
    return testUrl.startsWith('https://'); 
  };

  const getDomain = (urlStr) => {
    try { return urlStr.split('/')[2] || 'Nax Mini App'; } catch (e) { return 'Nax Mini App'; }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: headerBg }]}>
      
      {/* SECURE HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color={textMain} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: textMain }]} numberOfLines={1}>
            {appConfig?.name || title || 'Nax Mini App'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: textSub }]} numberOfLines={1}>
            {entryType === 'web' ? getDomain(url) : 'AI Generated App'}
          </Text>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert("Options", "Mini App Options")}>
          <Ionicons name="ellipsis-horizontal" size={22} color={textMain} />
        </TouchableOpacity>
      </View>

      {/* APP RUNTIME CONTAINER */}
      <View style={[styles.webContainer, { backgroundColor: bg }]}>
        
        {/* CONDITION 1: WEBVIEW MINI APP */}
        {entryType === 'web' && url && isSafeUrl(url) ? (
          <>
            {loading && (
              <View style={[styles.loaderBox, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color={blue} />
                <Text style={[styles.loaderText, { color: textSub }]}>Loading {title}...</Text>
              </View>
            )}
            <WebView
              source={{ uri: url }}
              style={styles.webview}
              onLoadEnd={() => setLoading(false)}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          </>
        ) : entryType === 'web' && url && !isSafeUrl(url) ? (
          // SECURITY BLOCK
          <View style={styles.errorBox}>
            <Ionicons name="shield-half" size={50} color="#FF3B30" />
            <Text style={[styles.errorText, { color: textMain }]}>Unsafe URL Blocked</Text>
            <Text style={{ color: textSub, marginTop: 5 }}>Only HTTPS URLs are permitted in Nax Sandbox.</Text>
          </View>
        ) 
        
        /* CONDITION 2: AI DECLARATIVE JSON MINI APP */
        : entryType === 'declarative' && appConfig ? (
          <View style={{ flex: 1, padding: 10 }}>
            <DeclarativeMiniAppRenderer 
              components={appConfig.components} 
              themeColor={appConfig.color}
              isTestMode={false} // Real mode!
            />
          </View>
        ) 
        
        /* FALLBACK */
        : (
          <View style={styles.errorBox}>
            <Ionicons name="warning" size={50} color="#FF9500" />
            <Text style={[styles.errorText, { color: textMain }]}>Invalid App Format</Text>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: 1, paddingTop: Platform.OS === 'ios' ? 0 : 5 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, marginHorizontal: 8, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSubtitle: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  webContainer: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loaderBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  errorBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 18, fontWeight: '800', marginTop: 15 }
});
