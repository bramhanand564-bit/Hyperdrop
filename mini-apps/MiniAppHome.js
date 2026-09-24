import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Platform,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { MiniAppAPI } from '../api/MiniAppAPI';

const CATEGORIES = ['All', 'Games', 'Tools', 'Productivity'];

export default function MiniAppHome({ navigation }) {
  const { isDark } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await MiniAppAPI.getPublicMiniApps();
        if (mounted) setApps(Array.isArray(data) ? data : []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const inputBg = isDark ? '#14202E' : '#EEF3F7';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';

  // --- FILTER APPS ---
  const filteredApps = apps.filter(app => {
    const matchesSearch = (app.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || app.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // --- OPEN MINI APP ---
  const handleOpenApp = (app) => {
    Keyboard.dismiss();
    // Navigates to the MiniAppViewer we created earlier
    navigation.navigate('MiniAppViewer', {
      title: app.name,
      url: app.url,
      appConfig: app,
      htmlCode: app.htmlCode,
      entryType: app.entryType || (app.htmlCode ? 'html' : (app.url ? 'web' : 'declarative')),
      appId: app.id,
    });
  };

  // --- RENDER APP CARD ---
  const renderAppCard = ({ item }) => (
    <TouchableOpacity 
      activeOpacity={0.8} 
      style={[styles.appCard, { backgroundColor: cardBg, borderColor: border }]}
      onPress={() => handleOpenApp(item)}
    >
      <View style={[styles.iconBox, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon} size={32} color={item.color} />
      </View>
      
      <View style={styles.appInfo}>
        <Text style={[styles.appName, { color: textMain }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.appCreator, { color: textSub }]}>by {item.creator}</Text>
        <Text style={[styles.appDesc, { color: textSub }]} numberOfLines={2}>{item.description || item.desc || ''}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.openBtn, { backgroundColor: `${blue}15` }]}
        onPress={() => handleOpenApp(item)}
      >
        <Text style={[styles.openBtnText, { color: blue }]}>Open</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textMain} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAdd} onPress={() => navigation.navigate('MiniAppImport')}>
          <Ionicons name="cloud-upload-outline" size={21} color={blue} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: textMain }]}>Mini-Apps Store</Text>
          <Text style={[styles.headerSubtitle, { color: textSub }]}>Discover and play</Text>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: border }]}>
          <Ionicons name="search" size={20} color={textSub} style={{ marginLeft: 15 }} />
          <TextInput
            style={[styles.searchInput, { color: textMain }]}
            placeholder="Search mini-apps..."
            placeholderTextColor={textSub}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={{ padding: 10 }} onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={textSub} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CATEGORIES */}
      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isActive = activeCategory === item;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryPill, 
                  { 
                    backgroundColor: isActive ? blue : 'transparent',
                    borderColor: isActive ? blue : border 
                  }
                ]}
                onPress={() => setActiveCategory(item)}
              >
                <Text style={[styles.categoryText, { color: isActive ? '#FFF' : textSub }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* APPS LIST */}
      <FlatList
        data={filteredApps}
        keyExtractor={item => item.id}
        renderItem={renderAppCard}
        contentContainerStyle={styles.appList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="grid-outline" size={50} color={textSub} />
            <Text style={[styles.emptyTitle, { color: textMain }]}>No Apps Found</Text>
            <Text style={[styles.emptyText, { color: textSub }]}>Try searching something else.</Text>
          </View>
        }
      />

    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    borderBottomWidth: 1
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerAdd: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  headerInfo: { flex: 1, marginLeft: 5 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  searchContainer: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 10 },
  searchBox: { height: 48, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, fontSize: 16, height: '100%', paddingHorizontal: 10 },
  categoriesWrapper: { paddingBottom: 10 },
  categoryList: { paddingHorizontal: 15, gap: 10 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  categoryText: { fontSize: 14, fontWeight: '600' },
  appList: { paddingHorizontal: 15, paddingBottom: 40 },
  appCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  iconBox: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  appInfo: { flex: 1, marginLeft: 15, marginRight: 10 },
  appName: { fontSize: 16, fontWeight: '800' },
  appCreator: { fontSize: 12, marginTop: 2, marginBottom: 5, fontWeight: '500' },
  appDesc: { fontSize: 13, lineHeight: 18 },
  openBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  openBtnText: { fontWeight: '700', fontSize: 14 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 15 },
  emptyText: { fontSize: 14, marginTop: 5 }
});
