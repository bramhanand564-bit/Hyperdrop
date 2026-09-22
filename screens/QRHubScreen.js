import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Alert, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebaseConfig';

const { width } = Dimensions.get('window');

export default function QRHubScreen({ navigation }) {
  const { isDark } = useTheme();
  const user = auth.currentUser;

  const [activeTab, setActiveTab] = useState('Scan'); // 'Scan' or 'My Code'
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // 🎨 Super Glassy, Zero-Neon Palette
  const bg = isDark ? '#0A0A0C' : '#F2F2F7';
  const textMain = isDark ? '#F5F5F7' : '#1C1C1E';
  const textSub = isDark ? '#8E8E93' : '#6C6C70';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const naxBlue = '#087EFF';

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // 🚀 SMART QR ROUTER (Handles Apps, Bots, Profiles, and Payments)
  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    Vibration.vibrate(50); // Haptic feedback on scan

    try {
      // Example payload: nax://app/NaxLudo
      if (data.startsWith('nax://app/')) {
        const appName = data.split('nax://app/')[1];
        navigation.navigate('WebPortalScreen', { title: appName, url: 'https://html5games.com' });
      } 
      else if (data.startsWith('nax://bot/')) {
        const botName = data.split('nax://bot/')[1];
        navigation.navigate('BotChatScreen', { botData: { botName: botName, engine: { mode: 'api', provider: 'gemini' } } });
      }
      else if (data.startsWith('nax://pay/')) {
        const userId = data.split('nax://pay/')[1];
        Alert.alert("Send Tokens", `Transfer Nax Tokens to user: ${userId}?`, [
          { text: "Cancel", onPress: () => setScanned(false) },
          { text: "Send", onPress: () => { Alert.alert("Success", "Tokens Sent!"); setScanned(false); } }
        ]);
      }
      else {
        // External URLs or Text
        Alert.alert("Scanned QR", data, [{ text: "OK", onPress: () => setScanned(false) }]);
      }
    } catch (error) {
      Alert.alert("Invalid QR", "This QR code is not recognized by the Nax Ecosystem.", [{ text: "OK", onPress: () => setScanned(false) }]);
    }
  };

  if (!permission) return <View />;
  if (!permission.granted) return (
    <View style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: textMain, marginBottom: 20 }}>Camera access is required for QR Scanner.</Text>
      <TouchableOpacity style={styles.actionBtn} onPress={requestPermission}>
        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );

  // Generate User's Unique Nax URI
  const myNaxUri = `nax://pay/${user?.uid || 'guest_123'}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      
      {/* 🌟 Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color={textMain} />
        </TouchableOpacity>
        
        {/* Toggle Tabs */}
        <View style={[styles.toggleContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <TouchableOpacity 
            style={[styles.toggleBtn, activeTab === 'Scan' && { backgroundColor: isDark ? '#333' : '#FFF', shadowColor: '#000', elevation: 2 }]} 
            onPress={() => { setActiveTab('Scan'); setScanned(false); }}
          >
            <Text style={{ color: activeTab === 'Scan' ? textMain : textSub, fontWeight: '700' }}>Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, activeTab === 'My Code' && { backgroundColor: isDark ? '#333' : '#FFF', shadowColor: '#000', elevation: 2 }]} 
            onPress={() => setActiveTab('My Code')}
          >
            <Text style={{ color: activeTab === 'My Code' ? textMain : textSub, fontWeight: '700' }}>My Code</Text>
          </TouchableOpacity>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* 📷 SCANNER TAB */}
      {activeTab === 'Scan' ? (
        <View style={styles.scannerWrapper}>
          <CameraView 
            style={StyleSheet.absoluteFillObject} 
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
          {/* Glassy Overlay for Scanner Focus */}
          <View style={styles.overlay}>
            <View style={styles.scanBox} />
            <Text style={styles.scanText}>Align QR code within the frame to scan</Text>
          </View>
        </View>
      ) : (
        /* 📱 MY CODE TAB */
        <View style={styles.myCodeWrapper}>
          <View style={[styles.qrCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.cardTitle, { color: textMain }]}>Your Nax Identity</Text>
            <Text style={{ color: textSub, fontSize: 13, marginBottom: 30, textAlign: 'center' }}>
              Show this code to receive tokens or add friends in the Nax Ecosystem.
            </Text>
            
            <View style={styles.qrCodeBg}>
              <QRCode 
                value={myNaxUri} 
                size={220} 
                color="#000" 
                backgroundColor="#FFF" 
                logo={require('../assets/icon.png')} // Tumhara app icon yahan dalega
                logoSize={40}
                logoBackgroundColor="#FFF"
              />
            </View>

            <Text style={[styles.userName, { color: textMain }]}>@{user?.displayName || 'User'}</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: naxBlue }]}>
              <Ionicons name="share-social" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Share Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 15, zIndex: 10 },
  backBtn: { width: 40, alignItems: 'flex-start' },
  
  toggleContainer: { flexDirection: 'row', borderRadius: 20, padding: 4, borderWidth: 1 },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16 },
  
  // Scanner Styles
  scannerWrapper: { flex: 1, backgroundColor: '#000', overflow: 'hidden', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  scanBox: { width: width * 0.7, height: width * 0.7, borderWidth: 2, borderColor: '#087EFF', borderRadius: 24, backgroundColor: 'transparent' },
  scanText: { color: '#FFF', marginTop: 30, fontSize: 14, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },

  // My Code Styles
  myCodeWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  qrCard: { width: '100%', alignItems: 'center', padding: 30, borderRadius: 32, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  cardTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  qrCodeBg: { padding: 15, backgroundColor: '#FFF', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  userName: { fontSize: 18, fontWeight: '700', marginTop: 25 },
  
  actionRow: { flexDirection: 'row', marginTop: 30, width: '100%' },
  shareBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, borderRadius: 16, shadowColor: '#087EFF', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  actionBtn: { backgroundColor: '#087EFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }
});
