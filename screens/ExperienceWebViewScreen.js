import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
// Firebase auth इम्पोर्ट कर रहे हैं ताकि मिनी-ऐप को यूज़र की डिटेल दे सकें
import { auth } from '../firebaseConfig';
import PaymentEngine from '../payments/PaymentEngine';
import { URLValidator } from '../security/URLValidator';
import RateLimiter from '../security/RateLimiter';
import AuditLogger from '../security/AuditLogger'; 

export default function ExperienceWebViewScreen({ route, navigation }) {
  // 📥 Nax Studio से AI जनरेटेड `htmlCode` आएगा, या फिर नॉर्मल `url`
  const { title = 'Mini-App', url, htmlCode, isPremium = false } = route.params || {};
  const { isDark } = useTheme();
  const user = auth?.currentUser;
  const portalUser = { uid: user?.uid || 'guest', name: user?.displayName || 'User', isPremium: Boolean(isPremium) };
  const urlCheck = url ? URLValidator.scanMiniAppUrl(url) : { isSafe: !!htmlCode };

  
  const [isLoading, setIsLoading] = useState(true);

  // Super Glassy, No-Neon Colors
  const bg = isDark ? '#0A0A0C' : '#F2F2F7';
  const textMain = isDark ? '#F5F5F7' : '#1C1C1E';
  const textSub = isDark ? '#8E8E93' : '#6C6C70';
  const headerBg = isDark ? 'rgba(10, 10, 12, 0.85)' : 'rgba(242, 242, 247, 0.85)';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';

  // 🧠 THE SUPER BRIDGE: Nax Data & Local AI Hardware Check
  const injectedCode = `
    window.NaxExperience = {
      user: {
        uid: ${JSON.stringify(portalUser.uid)},
        name: ${JSON.stringify(portalUser.name)},
        isPremium: ${JSON.stringify(portalUser.isPremium)}
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
    if (!RateLimiter.allow(`miniapp:${user?.uid || 'guest'}`)) return;
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log("Mini-App Action Received:", message);

      if (message.action === 'REQUEST_PAYMENT') {
        const amount = Number(message.data?.amount);
        const recipientId = String(message.data?.recipientId || message.data?.userId || message.data?.to || '').trim();
        if (!Number.isFinite(amount) || amount <= 0) {
          Alert.alert('Payment request', 'The requested amount is invalid.');
          return;
        }
        if (!recipientId) {
          navigation.navigate('Wallet', { suggestedAmount: amount });
          return;
        }
        Alert.alert('Token Request 🪙', `${title} requests ${amount} NAX.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pay', onPress: async () => {
            try {
              await PaymentEngine.transferTokens({ senderId: user?.uid, recipientId, amount });
              Alert.alert('Payment complete', `${amount} NAX sent successfully.`);
            } catch (error) { Alert.alert('Payment failed', error?.message || 'Please try again.'); }
          } }
        ]);
      } else if (message.action === 'OPEN_AI_SETTINGS') {
        navigation.navigate('AISettings');
      } else if (message.action === 'JOIN_WATCH_PARTY') {
        const targetUrl = String(message.data?.url || '').trim();
        if (!targetUrl || !URLValidator.validateExternalLink(targetUrl).valid) {
          Alert.alert('Watch Party', 'A valid HTTPS watch-party URL is required.');
          return;
        }
        navigation.navigate('ExperienceWebView', { title: `${title} Watch Party`, url: targetUrl });
      }
    } catch (e) {
      console.error("Bridge Error:", e);
    }
  };

  useEffect(() => { if (!urlCheck.isSafe && !htmlCode) AuditLogger.log('miniapp.blocked', { url, reason: urlCheck.message }); }, [url, htmlCode, urlCheck.isSafe]);

  if (!urlCheck.isSafe && !htmlCode) {
    return <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}><Ionicons name="shield-checkmark" size={48} color="#FF3B30" /><Text style={{ color: textMain, marginTop: 12, fontWeight: '700' }}>App blocked by security policy</Text><Text style={{ color: textSub, marginTop: 6 }}>{urlCheck.message}</Text></SafeAreaView>;
  }

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

        <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert("Menu", "Experience Settings")}>
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
          originWhitelist={['https://*']}
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
