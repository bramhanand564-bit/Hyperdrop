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

// --- MOCK DATA ---
const TEMPLATES = [
  { id: 't1', title: 'Expense Tracker', desc: 'Track daily spendings', icon: 'wallet', color: '#34C759' },
  { id: 't2', title: 'Quiz App', desc: 'Multiple choice trivia', icon: 'help-circle', color: '#FF9500' },
  { id: 't3', title: 'To-Do List', desc: 'Manage daily tasks', icon: 'list', color: '#087EFF' },
  { id: 't4', title: 'Translator Bot', desc: 'Multi-language bot', icon: 'language', color: '#AF52DE' },
];

const MY_CREATIONS = [
  { id: 'c1', name: 'My Diet Planner', type: 'Mini App', status: 'Published', date: 'Today', icon: 'restaurant', color: '#FF3B30' },
  { id: 'c2', name: 'Study Buddy', type: 'Bot', status: 'Draft', date: 'Yesterday', icon: 'book', color: '#087EFF' },
];

export default function StudioHome({ navigation }) {
  const { isDark } = useTheme();

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';
  const purple = '#AF52DE'; // AI Theme color

  // --- HANDLERS ---
  const handleCreateNew = (prefillPrompt = '') => {
    // Navigate to Step 2: StudioPrompt
    navigation.navigate('StudioPrompt', { initialPrompt: prefillPrompt });
  };

  const handleOpenCreation = (item) => {
    // For now, just a placeholder. Later it will go to StudioPreview or Publisher
    console.log('Open Creation:', item.name);
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
        <TouchableOpacity style={styles.iconBtn}>
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
            <TouchableOpacity><Text style={{ color: blue, fontWeight: '600' }}>See All</Text></TouchableOpacity>
          </View>
          
          {MY_CREATIONS.length > 0 ? (
            MY_CREATIONS.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.creationCard, { backgroundColor: cardBg, borderColor: border }]}
                onPress={() => handleOpenCreation(item)}
              >
                <View style={[styles.creationIcon, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <View style={styles.creationInfo}>
                  <Text style={[styles.creationName, { color: textMain }]}>{item.name}</Text>
                  <View style={styles.creationMeta}>
                    <Text style={[styles.metaText, { color: textSub }]}>{item.type} • {item.date}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'Published' ? '#34C75920' : '#FF950020' }]}>
                  <Text style={[styles.statusText, { color: item.status === 'Published' ? '#34C759' : '#FF9500' }]}>
                    {item.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
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
  emptyText: { fontSize: 13, marginTop: 4 }
});
