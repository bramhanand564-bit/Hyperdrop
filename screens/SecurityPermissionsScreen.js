import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Switch, Alert, ActivityIndicator 
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

// 🔥 REAL FIREBASE IMPORTS
import { db, auth } from '../firebaseConfig';
import { MiniAppAPI } from '../api/MiniAppAPI';
import BotAPI from '../api/BotAPI';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

export default function SecurityPermissionsScreen({ navigation }) {
  const { isDark } = useTheme();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    globalLocation: true,
    globalCamera: true,
    walletAutoPay: false,
    apps: []
  });

  // 🎨 Super Glassy, Zero-Neon Palette
  const bg = isDark ? '#0A0A0C' : '#F2F2F7';
  const textMain = isDark ? '#F5F5F7' : '#1C1C1E';
  const textSub = isDark ? '#8E8E93' : '#6C6C70';
  const headerBg = isDark ? 'rgba(10, 10, 12, 0.85)' : 'rgba(242, 242, 247, 0.85)';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)';
  const naxBlue = '#087EFF';
  const dangerRed = '#FF3B30';

  // 📡 FETCH REAL SECURITY PREFERENCES
  useEffect(() => {
    const fetchSecurityData = async () => {
      if (!user?.uid) return;
      try {
        const docRef = doc(db, 'users', user.uid, 'settings', 'security');
        const docSnap = await getDoc(docRef);
        const saved = docSnap.exists() ? docSnap.data() : { globalLocation: true, globalCamera: true, walletAutoPay: false };
        const [installed, bots] = await Promise.all([
          MiniAppAPI.getInstalledApps().catch(() => []),
          BotAPI.getUserBots(user.uid).catch(() => []),
        ]);
        const installedApps = (installed || []).map(app => {
          const granted = Array.isArray(app.grantedPermissions) ? app.grantedPermissions : [];
          return {
            id: app.appId || app.id,
            name: app.name || 'Mini-App',
            type: 'app',
            wallet: granted.includes('payments'),
            location: granted.includes('location.coarse') || granted.includes('location.precise') || granted.includes('device.location'),
            camera: granted.includes('device.camera'),
            grantedPermissions: granted,
          };
        });
        const botApps = (bots || []).map(bot => ({
          id: bot.id,
          name: bot.name || 'Bot',
          type: 'bot',
          wallet: false,
          location: false,
          camera: false,
          grantedPermissions: [],
        }));
        const apps = [...installedApps, ...botApps];
        if (!docSnap.exists()) {
          await setDoc(docRef, { ...saved, apps });
        }
        setPermissions({ ...saved, apps });
      } catch (error) {
        console.log("Security fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSecurityData();
  }, [user]);

  // 🔒 TOGGLE APP-SPECIFIC PERMISSION
  const toggleAppPermission = async (appId, permType, currentValue) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});
    
    // Update Local State for instant UI feedback
    const permissionMap = { wallet: 'payments', location: 'location.coarse', camera: 'device.camera' };
    const permissionName = permissionMap[permType];
    const updatedApps = permissions.apps.map(app => {
      if (app.id !== appId) return app;
      const currentGranted = Array.isArray(app.grantedPermissions) ? app.grantedPermissions : [];
      const nextGranted = currentValue
        ? currentGranted.filter(p => p !== permissionName)
        : [...new Set([...currentGranted, permissionName])];
      return { ...app, [permType]: !currentValue, grantedPermissions: nextGranted };
    });
    setPermissions(prev => ({ ...prev, apps: updatedApps }));

    // Update Firebase
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'security');
      await updateDoc(docRef, { apps: updatedApps });
    } catch (error) {
      Alert.alert("Sync Error", "Failed to save permission.");
    }
  };

  // 🛑 REVOKE ALL TOKENS (Kill Switch)
  const handleKillSwitch = () => {
    Alert.alert(
      "Revoke All Access 🛑", 
      "This will disconnect your Wallet and GPS from ALL Mini-Apps and AI Bots instantly. Proceed?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Revoke", 
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(()=>{});
            const revokedApps = permissions.apps.map(app => ({ ...app, wallet: false, location: false, camera: false, grantedPermissions: [] }));
            setPermissions(prev => ({ ...prev, apps: revokedApps, walletAutoPay: false, globalLocation: false, globalCamera: false }));
            updateDoc(doc(db, 'users', user.uid, 'settings', 'security'), { apps: revokedApps, walletAutoPay: false, globalLocation: false, globalCamera: false });
            Alert.alert("Secured", "All third-party access has been revoked.");
          }
        }
      ]
    );
  };

  const renderAppPermissionCard = (app) => (
    <View key={app.id} style={[styles.appCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.appHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.appIcon, { backgroundColor: app.type === 'bot' ? 'rgba(52,199,89,0.1)' : 'rgba(8,126,255,0.1)' }]}>
            <Ionicons name={app.type === 'bot' ? 'robot-outline' : 'grid-outline'} size={20} color={app.type === 'bot' ? '#34C759' : naxBlue} />
          </View>
          <Text style={[styles.appName, { color: textMain }]} numberOfLines={1}>{app.name}</Text>
        </View>
      </View>

      <View style={styles.permList}>
        {/* Wallet Permission */}
        <View style={[styles.permRow, { borderBottomColor: cardBorder, borderBottomWidth: 1 }]}>
          <View style={styles.permLeft}>
            <Ionicons name="wallet-outline" size={18} color={textSub} style={{ marginRight: 8 }} />
            <Text style={[styles.permText, { color: textMain }]}>Wallet Access (Tokens)</Text>
          </View>
          <Switch 
            value={app.wallet} 
            onValueChange={() => toggleAppPermission(app.id, 'wallet', app.wallet)}
            trackColor={{ false: '#39393D', true: '#34C759' }}
            thumbColor={'#FFF'}
          />
        </View>

        {/* Location Permission */}
        <View style={[styles.permRow, { borderBottomColor: cardBorder, borderBottomWidth: app.type === 'bot' ? 0 : 1 }]}>
          <View style={styles.permLeft}>
            <Ionicons name="location-outline" size={18} color={textSub} style={{ marginRight: 8 }} />
            <Text style={[styles.permText, { color: textMain }]}>GPS Location</Text>
          </View>
          <Switch 
            value={app.location} 
            onValueChange={() => toggleAppPermission(app.id, 'location', app.location)}
            trackColor={{ false: '#39393D', true: naxBlue }}
            thumbColor={'#FFF'}
          />
        </View>

        {/* Camera Permission (Hide for bots) */}
        {app.type === 'app' && (
          <View style={styles.permRow}>
            <View style={styles.permLeft}>
              <Ionicons name="camera-outline" size={18} color={textSub} style={{ marginRight: 8 }} />
              <Text style={[styles.permText, { color: textMain }]}>Camera / Scanner</Text>
            </View>
            <Switch 
              value={app.camera} 
              onValueChange={() => toggleAppPermission(app.id, 'camera', app.camera)}
              trackColor={{ false: '#39393D', true: '#FF9500' }}
              thumbColor={'#FFF'}
            />
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      
      {/* 🌟 Header */}
      <View style={[styles.header, { borderBottomColor: cardBorder, backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={textMain} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerSubtitle, { color: '#34C759' }]}>SANDBOX SYSTEM</Text>
          <Text style={[styles.headerTitle, { color: textMain }]}>Security</Text>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => Alert.alert("Audit Log", "View active sessions")}>
          <MaterialIcons name="security" size={24} color={textMain} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={naxBlue} style={{ flex: 1, justifyContent: 'center' }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 🛡️ Global Security Status */}
          <View style={[styles.statusBanner, { backgroundColor: 'rgba(52, 199, 89, 0.1)', borderColor: 'rgba(52, 199, 89, 0.3)' }]}>
            <Ionicons name="shield-checkmark" size={32} color="#34C759" style={{ marginRight: 15 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: textMain, fontSize: 16, fontWeight: '700', marginBottom: 2 }}>Nax Sandbox Active</Text>
              <Text style={{ color: textSub, fontSize: 12, lineHeight: 18 }}>Mini-Apps run in isolated environments and cannot access your phone data without permission.</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: textSub }]}>GLOBAL PREFERENCES</Text>

          {/* Global Toggles */}
          <View style={[styles.globalCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.permRow, { borderBottomColor: cardBorder, borderBottomWidth: 1 }]}>
              <View style={styles.permLeft}>
                <Ionicons name="finger-print" size={20} color={textMain} style={{ marginRight: 10 }} />
                <View>
                  <Text style={[styles.permText, { color: textMain }]}>Auto-Pay Approvals</Text>
                  <Text style={{ color: textSub, fontSize: 11, marginTop: 2 }}>Allow trusted apps to deduct tokens</Text>
                </View>
              </View>
              <Switch value={permissions.walletAutoPay} onValueChange={async (v) => { setPermissions(p => ({...p, walletAutoPay: v})); await updateDoc(doc(db, 'users', user.uid, 'settings', 'security'), { walletAutoPay: v }); }} trackColor={{ true: '#34C759' }} />
            </View>
          </View>

          <View style={styles.dividerWrap}>
            <Text style={[styles.sectionTitle, { color: textSub, marginBottom: 0 }]}>APP PERMISSIONS</Text>
            <Text style={{ color: naxBlue, fontSize: 13, fontWeight: '700' }}>{permissions.apps.length} Installed</Text>
          </View>

          {/* Render Installed Apps */}
          {permissions.apps.map(renderAppPermissionCard)}

          {/* 🛑 The Kill Switch */}
          <TouchableOpacity 
            style={[styles.killSwitchBtn, { borderColor: dangerRed, backgroundColor: 'rgba(255, 59, 48, 0.05)' }]}
            onPress={handleKillSwitch}
            activeOpacity={0.8}
          >
            <Ionicons name="warning-outline" size={20} color={dangerRed} style={{ marginRight: 8 }} />
            <Text style={{ color: dangerRed, fontSize: 15, fontWeight: '700' }}>Revoke All Permissions</Text>
          </TouchableOpacity>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, zIndex: 10 },
  backBtn: { padding: 4, width: 40, alignItems: 'flex-start' },
  headerTitleWrap: { alignItems: 'center', flex: 1 },
  headerSubtitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  
  scrollContent: { padding: 20, paddingBottom: 60 },
  
  statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 25 },
  sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  
  globalCard: { borderRadius: 20, borderWidth: 1, marginBottom: 25, paddingHorizontal: 15 },
  
  dividerWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },

  appCard: { borderRadius: 20, borderWidth: 1, marginBottom: 15, overflow: 'hidden' },
  appHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'rgba(0,0,0,0.02)', borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  appIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  appName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  
  permList: { paddingHorizontal: 16 },
  permRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  permLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  permText: { fontSize: 15, fontWeight: '600' },

  killSwitchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 18, borderWidth: 1, marginTop: 25 }
});
