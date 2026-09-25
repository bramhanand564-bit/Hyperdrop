import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, Alert 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// 🔥 REAL FIREBASE IMPORTS
import { auth } from '../firebaseConfig';
import { MiniAppAPI } from '../api/MiniAppAPI';
import BotAPI from '../api/BotAPI';

const { width } = Dimensions.get('window');

export default function DeveloperDashboardScreen({ navigation }) {
  const { isDark } = useTheme();
  const user = auth.currentUser;

  const [myApps, setMyApps] = useState([]);
  const [totalViews, setTotalViews] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  // 🎨 Super Glassy, Zero-Neon Palette
  const bg = isDark ? '#0A0A0C' : '#F2F2F7';
  const textMain = isDark ? '#F5F5F7' : '#1C1C1E';
  const textSub = isDark ? '#8E8E93' : '#6C6C70';
  const headerBg = isDark ? 'rgba(10, 10, 12, 0.85)' : 'rgba(242, 242, 247, 0.85)';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)';
  const naxBlue = '#087EFF';
  const successGreen = '#34C759';

  // 📡 FETCH REAL CREATOR DATA FROM FIREBASE
  useEffect(() => {
    let mounted = true;
    if (!user?.uid) { setLoading(false); return undefined; }
    (async () => {
      try {
        const [allApps, bots] = await Promise.all([
          MiniAppAPI.getUserMiniApps(user.uid).catch(() => []),
          BotAPI.getUserBots(user.uid).catch(() => []),
        ]);
        const apps = (allApps || []).filter(item => item.creatorId === user.uid || item.ownerId === user.uid);
        const normalizedApps = apps.map(item => ({ ...item, type: item.type || 'app', views: Number(item.views || 0), revenueGenerated: Number(item.revenueGenerated || 0) }));
        const normalizedBots = (bots || []).map(item => ({ ...item, type: 'bot', views: Number(item.weeklyViews || item.usageCount || 0), revenueGenerated: Number(item.revenueGenerated || 0) }));
        const all = [...normalizedApps, ...normalizedBots];
        if (!mounted) return;
        setMyApps(all);
        setTotalViews(all.reduce((sum, item) => sum + Number(item.views || 0), 0));
        setTotalRevenue(all.reduce((sum, item) => sum + Number(item.revenueGenerated || 0), 0));
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [user?.uid]);

  const renderAppCard = (app) => (
    <TouchableOpacity 
      key={app.id} 
      style={[styles.appCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
      onPress={() => app.type === 'bot'
        ? navigation.navigate('BotEdit', { bot: app, botData: app })
        : navigation.navigate('MiniAppViewer', { title: app.name, url: app.url, appConfig: app, htmlCode: app.htmlCode, entryType: app.entryType || (app.htmlCode ? 'html' : (app.url ? 'web' : 'declarative')), appId: app.id })}
    >
      <View style={styles.appHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.appIcon, { backgroundColor: app.type === 'bot' ? 'rgba(52,199,89,0.1)' : 'rgba(8,126,255,0.1)' }]}>
            <Ionicons name={app.type === 'bot' ? 'robot-outline' : 'grid-outline'} size={20} color={app.type === 'bot' ? successGreen : naxBlue} />
          </View>
          <View>
            <Text style={[styles.appName, { color: textMain }]} numberOfLines={1}>{app.name}</Text>
            <Text style={{ color: textSub, fontSize: 12, marginTop: 2, textTransform: 'uppercase', fontWeight: '600' }}>
              {app.type === 'bot' ? 'AI Agent' : 'Mini-App'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={textSub} />
      </View>

      <View style={[styles.appStatsRow, { borderTopColor: cardBorder }]}>
        <View style={styles.statCol}>
          <Text style={[styles.statValue, { color: textMain }]}>{app.views || 0}</Text>
          <Text style={{ color: textSub, fontSize: 11, fontWeight: '600' }}>SESSIONS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={[styles.statValue, { color: successGreen }]}>+{app.revenueGenerated || 0} 🪙</Text>
          <Text style={{ color: textSub, fontSize: 11, fontWeight: '600' }}>REVENUE</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: app.status === 'Offline' ? '#FF3B30' : successGreen }]} />
            <Text style={[styles.statValue, { color: textMain, fontSize: 13 }]}>{app.status || 'Live'}</Text>
          </View>
          <Text style={{ color: textSub, fontSize: 11, fontWeight: '600' }}>STATUS</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      
      {/* 🌟 Header */}
      <View style={[styles.header, { borderBottomColor: cardBorder, backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={textMain} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerSubtitle, { color: naxBlue }]}>CREATOR STUDIO</Text>
          <Text style={[styles.headerTitle, { color: textMain }]}>Dashboard</Text>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => Alert.alert('Dashboard metrics', 'Views are summed from published Mini-App/Bot usage fields. Revenue reflects creator revenue recorded on each item.') } accessibilityLabel="Dashboard help">
          <Ionicons name="help-circle-outline" size={26} color={textMain} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={naxBlue} style={{ flex: 1, justifyContent: 'center' }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 📈 Overall Analytics */}
          <Text style={[styles.sectionTitle, { color: textSub }]}>OVERVIEW (LATEST 30 DAYS)</Text>
          
          <View style={styles.overviewGrid}>
            <View style={[styles.overviewBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(8,126,255,0.1)' }]}>
                <Ionicons name="eye" size={20} color={naxBlue} />
              </View>
              <Text style={[styles.overviewValue, { color: textMain }]}>{(totalViews / 1000).toFixed(1)}k</Text>
              <Text style={{ color: textSub, fontSize: 12, fontWeight: '600' }}>Total Views</Text>
            </View>

            <View style={[styles.overviewBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(52,199,89,0.1)' }]}>
                <MaterialCommunityIcons name="finance" size={20} color={successGreen} />
              </View>
              <Text style={[styles.overviewValue, { color: successGreen }]}>+{totalRevenue} 🪙</Text>
              <Text style={{ color: textSub, fontSize: 12, fontWeight: '600' }}>Total Revenue</Text>
            </View>
          </View>

          {/* 🚀 Create New Button */}
          <TouchableOpacity 
            style={[styles.createBtn, { backgroundColor: textMain }]}
            onPress={() => navigation.navigate('NaxStudio')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color={isDark ? '#000' : '#FFF'} />
            <Text style={[styles.createBtnText, { color: isDark ? '#000' : '#FFF' }]}>Build New App or Bot</Text>
          </TouchableOpacity>

          {/* 📂 My Apps Portfolio */}
          <View style={styles.portfolioHeader}>
            <Text style={[styles.sectionTitle, { color: textSub, marginBottom: 0 }]}>MY CREATIONS</Text>
            <Text style={{ color: naxBlue, fontSize: 13, fontWeight: '700' }}>{myApps.length} Active</Text>
          </View>

          {myApps.length === 0 ? (
            <View style={[styles.emptyState, { borderColor: cardBorder }]}>
              <Ionicons name="rocket-outline" size={48} color={textSub} style={{ opacity: 0.5 }} />
              <Text style={{ color: textMain, fontSize: 16, fontWeight: '700', marginTop: 15 }}>No Apps Yet</Text>
              <Text style={{ color: textSub, textAlign: 'center', marginTop: 5 }}>Your developed Mini-Apps and AI Agents will appear here.</Text>
            </View>
          ) : (
            myApps.map(renderAppCard)
          )}

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
  
  scrollContent: { padding: 20, paddingBottom: 50 },
  sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 15, marginLeft: 4 },
  
  overviewGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  overviewBox: { width: (width - 55) / 2, padding: 20, borderRadius: 24, borderWidth: 1, alignItems: 'flex-start' },
  iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  overviewValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginBottom: 2 },

  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 18, marginBottom: 35, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  createBtnText: { fontSize: 16, fontWeight: '800', marginLeft: 8 },

  portfolioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 4 },

  appCard: { borderRadius: 20, borderWidth: 1, marginBottom: 15, overflow: 'hidden' },
  appHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  appIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  appName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  
  appStatsRow: { flexDirection: 'row', paddingVertical: 15, borderTopWidth: 1, backgroundColor: 'rgba(0,0,0,0.02)' },
  statCol: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  statDivider: { width: 1, backgroundColor: 'rgba(150,150,150,0.2)' },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },

  emptyState: { alignItems: 'center', padding: 40, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed' }
});
