import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
// Firebase auth इम्पोर्ट कर रहे हैं ताकि मिनी-ऐप को यूज़र की डिटेल दे सकें
import { auth } from '../firebaseConfig'; 

export default function WebPortalScreen({ route, navigation }) {
  // 📥 Nax Studio से AI जनरेटेड `htmlCode` आएगा, या फिर नॉर्मल `url`
  const { title = 'Mini-App', url, htmlCode, isPremium = false } = route.params || {};
  const { isDark } = useTheme();
  const user = auth?.currentUser;
  
  const [isLoading, setIsLoading] = useState(true);

  // Super Glassy, No-Neon Colors
  const bg = isDark ? '#0A0A0C' : '#F2F2F7';
  const textMain = isDark ? '#F5F5F7' : '#1C1C1E';
  const textSub = isDark ? '#8E8E93' : '#6C6C70';
  const headerBg = isDark ? 'rgba(10, 10, 12, 0.85)' : 'rgba(242, 242, 247, 0.85)';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';

  // 🧠 THE SUPER BRIDGE: Nax Data & Local AI Hardware Check
  const injectedCode = `
    window.NaxPortal = {
      user: {
        uid: "${user?.uid || 'guest'}",
        name: "${user?.displayName || 'User'}",
        isPremium: ${isPremium}
      },
      theme: "${isDark ? 'dark' : 'light'}",
      hardware: {
        ram: navigator.deviceMemory || "Unknown",
        cores: navigator.hardwareConcurrency || "Unknown",
        suggestedAI: (navigator.deviceMemory >= 6) ? "Local AI (Llama.cpp)" : "Cloud API (BYOK)"
      },
      sendAction: function(action, data) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ action, data }));
      }
    };
    true;
  `;

  // 🔥 ACTION RECEIVER (Tokens, Watch Party, AI Settings)
  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log("Mini-App Action Received:", message);

      if (message.action === 'REQUEST_PAYMENT') {
        Alert.alert("Token Request 🪙", `${title} needs ${message.data?.amount || 0} Nax Tokens.`, [
          { text: "Cancel", style: "cancel" },
          { text: "Pay", onPress: () => Alert.alert("Success", "Tokens Sent!") }
        ]);
      } else if (message.action === 'OPEN_AI_SETTINGS') {
        Alert.alert("AI Engine", "Hardware Limit Reached. Please enter your API Key to use Premium Cloud AI.");
      } else if (message.action === 'JOIN_WATCH_PARTY') {
        Alert.alert("Watch Party 🎬", "Connecting to P2P Video Sync...");
      }
    } catch (e) {
      console.error("Bridge Error:", e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* 🌟 Glassy Header */}
      <View style={[styles.header, { borderBottomColor: borderCol, backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={26} color={textMain} />
        </TouchableOpacity>
        
        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: textMain }]} numberOfLines={1}>{title}</Text>
          <View style={styles.badgeRow}>
            <Ionicons name="shield-checkmark" size={12} color="#34C759" />
            <Text style={{ color: '#34C759', fontSize: 10, fontWeight: 'bold', marginLeft: 4 }}>
              {htmlCode ? 'Nax AI Engine' : 'Secure Web Sandbox'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert("Menu", "Portal Settings")}>
          <Ionicons name="ellipsis-vertical" size={24} color={textMain} />
        </TouchableOpacity>
      </View>

      {/* 🚀 REAL APP RENDERER (WebView Sandbox) */}
      <View style={styles.webviewContainer}>
        <WebView
          // 💡 YAHAN MAGIC HAI: Agar htmlCode hai toh direct HTML render karo, warna URL kholo
          source={htmlCode ? { html: htmlCode } : { uri: url }}
          style={{ flex: 1, backgroundColor: isDark ? '#000' : '#FFF' }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          injectedJavaScriptBeforeContentLoaded={injectedCode}
          onMessage={handleMessage}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          renderLoading={() => (
            <View style={[styles.loaderView, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
              <ActivityIndicator size="large" color="#087EFF" />
              <Text style={{ color: textSub, marginTop: 12, fontWeight: '600' }}>
                {htmlCode ? 'Compiling AI Code...' : 'Initializing Sandbox...'}
              </Text>
            </View>
          )}
          startInLoadingState={true}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingVertical: 10, paddingHorizontal: 15, borderBottomWidth: 1, zIndex: 10
  },
  iconBtn: { padding: 5, width: 40, alignItems: 'center' },
  titleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginBottom: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  
  webviewContainer: { flex: 1 },
  loaderView: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 9
  }
});
