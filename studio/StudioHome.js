import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Image,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import { MiniAppAPI } from '../api/MiniAppAPI';
import BotAPI from '../api/BotAPI';
import GlassScene from '../components/ui/GlassScene';
import GlassSurface from '../components/ui/GlassSurface';

// --- STUDIO TEMPLATES ---
const TEMPLATES = [
  { id: 't1', title: 'Expense Tracker', desc: 'Track daily spendings', icon: 'wallet', color: '#34C759' },
  { id: 't2', title: 'Quiz App', desc: 'Multiple choice trivia', icon: 'help-circle', color: '#FF9500' },
  { id: 't3', title: 'To-Do List', desc: 'Manage daily tasks', icon: 'list', color: '#087EFF' },
  { id: 't4', title: 'Translator Bot', desc: 'Multi-language bot', icon: 'language', color: '#AF52DE' },
];

export default function StudioHome({ navigation }) {
  const { isDark, theme } = useTheme();
  const [creations, setCreations] = useState([]);
  const [loadingCreations, setLoadingCreations] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const [apps, bots] = await Promise.all([
          MiniAppAPI.getUserMiniApps(uid).catch(() => []),
          BotAPI.getUserBots(uid).catch(() => []),
        ]);
        const mineApps = (apps || []).filter(item => item.creatorId === uid || item.ownerId === uid).map(item => ({ ...item, kind: 'Mini App', type: 'miniapp', dateValue: item.updatedAt || item.createdAt }));
        const mineBots = (bots || []).map(item => ({ ...item, kind: 'Bot', type: 'bot', dateValue: item.updatedAt || item.createdAt }));
        if (mounted) setCreations([...mineApps, ...mineBots].sort((a,b) => (b.dateValue?.seconds || 0) - (a.dateValue?.seconds || 0)));
      } finally { if (mounted) setLoadingCreations(false); }
    })();
    return () => { mounted = false; };
  }, []);

  // --- COLORS ---
  const bg = theme.bg;
  const headerBg = theme.surface;
  const cardBg = theme.surfaceStrong;
  const textMain = theme.text;
  const textSub = theme.sub;
  const border = theme.border;
  const blue = '#087EFF';
  const purple = '#AF52DE'; // AI Theme color

  // --- HANDLERS ---
  const handleCreateNew = (prefillPrompt = '') => {
    // Navigate to Step 2: StudioPrompt
    navigation.navigate('StudioPrompt', { initialPrompt: prefillPrompt });
  };

  const handleOpenCreation = (item) => {
    if (item.type === 'bot') navigation.navigate('BotEdit', { bot: item, botData: item });
    else navigation.navigate('MiniAppViewer', { title: item.name, url: item.url, appConfig: item, htmlCode: item.htmlCode, entryType: item.entryType || (item.htmlCode ? 'html' : (item.url ? 'web' : 'declarative')), appId: item.id });
  };

  const formatDate = value => {
    try {
      const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
      return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : 'Recently';
    } catch { return 'Recently'; }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textMain} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerTitle, { color: textMain }]}>Nax Studio</Text>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={10} color="#FFF" />
            <Text style={styles.aiBadgeText}>AI POWERED</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={22} color={textMain} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HERO SECTION - CREATE WITH AI */}
        <TouchableOpacity 
          activeOpacity={0.85} 
          style={styles.heroCard}
          onPress={() => handleCreateNew()}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: purple, opacity: 0.15 }]} />
          <View style={[styles.heroIconBox, { backgroundColor: purple }]}>
            <Ionicons name="color-wand" size={32} color="#FFF" />
          </View>
          <View style={styles.heroInfo}>
            <Text style={[styles.heroTitle, { color: textMain }]}>Create with AI</Text>
            <Text style={[styles.heroDesc, { color: textSub }]}>Describe your app idea in plain text and let AI build it instantly.</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={32} color={purple} />
        </TouchableOpacity>

        <View style={styles.importRow}>
          <TouchableOpacity
            style={[styles.importButton, { backgroundColor: cardBg, borderColor: border }]}
            onPress={() => navigation.navigate('MiniAppImport')}
            activeOpacity={0.85}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={blue} />
            <Text style={[styles.importText, { color: textMain }]}>Import HTML / ZIP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.importButton, { backgroundColor: cardBg, borderColor: border }]}
            onPress={() => navigation.navigate('MiniAppLibrary')}
            activeOpacity={0.85}
          >
            <Ionicons name="folder-open-outline" size={18} color={blue} />
            <Text style={[styles.importText, { color: textMain }]}>My Local Apps</Text>
          </TouchableOpacity>
        </View>

        {/* TEMPLATES & INSPIRATION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textMain }]}>Inspiration Templates</Text>
          <Text style={[styles.sectionSubtitle, { color: textSub }]}>Tap to quick-start the AI generator</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
            {TEMPLATES.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.templateCard, { backgroundColor: cardBg, borderColor: border }]}
                onPress={() => handleCreateNew(`Build an app for ${item.title.toLowerCase()} that can ${item.desc.toLowerCase()}`)}
              >
                <View style={[styles.templateIconBox, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon} size={28} color={item.color} />
                </View>
                <Text style={[styles.templateTitle, { color: textMain }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.templateDesc, { color: textSub }]} numberOfLines={2}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* MY CREATIONS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textMain }]}>My Creations</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DeveloperDashboard')}><Text style={{ color: blue, fontWeight: '600' }}>See All</Text></TouchableOpacity>
          </View>
          
          {loadingCreations ? (
            <View style={styles.loadingCreations}><Text style={{ color: textSub }}>Loading your creations…</Text></View>
          ) : creations.length > 0 ? (
            creations.map((item) => {
              const published = item.status === 'published' || item.status === 'active';
              const color = item.color || (item.type === 'bot' ? '#34C759' : '#087EFF');
              const icon = item.icon || (item.type === 'bot' ? 'chatbubble-ellipses' : 'apps');
              return (
                <TouchableOpacity key={item.id} style={[styles.creationCard, { backgroundColor: cardBg, borderColor: border }]} onPress={() => handleOpenCreation(item)}>
                  <View style={[styles.creationIcon, { backgroundColor: `${color}20` }]}>
                    <Ionicons name={icon} size={24} color={color} />
                  </View>
                  <View style={styles.creationInfo}>
                    <Text style={[styles.creationName, { color: textMain }]} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.creationMeta}>
                      <Text style={[styles.metaText, { color: textSub }]}>{item.kind} • {formatDate(item.dateValue)}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: published ? '#34C75920' : '#FF950020' }]}>
                    <Text style={[styles.statusText, { color: published ? '#34C759' : '#FF9500' }]}>{published ? 'Live' : 'Draft'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={[styles.emptyBox, { backgroundColor: cardBg, borderColor: border }]}>
              <Ionicons name="folder-open-outline" size={40} color={textSub} />
              <Text style={[styles.emptyTitle, { color: textMain }]}>No creations yet</Text>
              <Text style={[styles.emptyText, { color: textSub }]}>Your generated apps will appear here.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 10, 
    paddingTop: Platform.OS === 'ios' ? 10 : 15, 
    paddingBottom: 15, 
    borderBottomWidth: 1 
  },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitleBox: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#AF52DE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  aiBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900', marginLeft: 4, letterSpacing: 0.5 },
  
  scrollContent: { padding: 20 },
  importRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  importButton: { flex: 1, minHeight: 46, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  importText: { fontSize: 12, fontWeight: '800', marginLeft: 6 },
  
  heroCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: 'rgba(175, 82, 222, 0.3)',
    marginBottom: 30,
    overflow: 'hidden'
  },
  heroIconBox: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroInfo: { flex: 1, marginLeft: 15, marginRight: 10 },
  heroTitle: { fontSize: 20, fontWeight: '900', marginBottom: 5 },
  heroDesc: { fontSize: 13, lineHeight: 18 },
  
  section: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  sectionSubtitle: { fontSize: 13, marginTop: 2, marginBottom: 15 },
  
  hList: { paddingRight: 20, gap: 15 },
  templateCard: { width: 140, padding: 15, borderRadius: 20, borderWidth: 1 },
  templateIconBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  templateTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  templateDesc: { fontSize: 12, lineHeight: 16 },
  
  creationCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  creationIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  creationInfo: { flex: 1, marginLeft: 15, marginRight: 10 },
  creationName: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  creationMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 12, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '800' },
  
  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 30, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed' },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptyText: { fontSize: 13, marginTop: 4 },
  loadingCreations: { padding: 22, alignItems: 'center' }
});
