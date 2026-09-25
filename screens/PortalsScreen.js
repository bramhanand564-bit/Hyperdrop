import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { MiniAppAPI } from '../api/MiniAppAPI';
import { BotAPI } from '../api/BotAPI';
import GlassScene from '../components/ui/GlassScene';

export default function PortalsScreen({ navigation }) {
  const { isDark, theme } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const bg = theme.bg;
  const textMain = theme.text;
  const textSub = theme.sub;
  const cardBg = theme.surface;
  const cardBorder = theme.border;
  const blue = theme.blue || '#087EFF';

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const [apps, bots] = await Promise.all([
        MiniAppAPI.getPublicMiniApps().catch(() => []),
        BotAPI.searchBots('').catch(() => []),
      ]);
      setItems([
        ...(Array.isArray(bots) ? bots : []).map(bot => ({ ...bot, type: 'Bot', entryType: 'bot' })),
        ...(Array.isArray(apps) ? apps : []).map(app => ({
          ...app,
          type: 'MiniApp',
          entryType: app.entryType || (app.htmlCode ? 'html' : (app.url ? 'web' : 'declarative')),
        })),
      ]);
    } catch (error) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleItemPress = item => {
    if (item.type === 'Bot' || item.type === 'bot' || item.isBot || item.entryType === 'bot') {
      navigation.navigate('BotChat', { botData: item, botId: item.id });
      return;
    }
    navigation.navigate('MiniAppInstall', { app: item });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <GlassScene>
        <View style={[styles.header, { borderBottomColor: cardBorder, backgroundColor: cardBg }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: textMain }]}>Nax Portal</Text>
            <Text style={[styles.headerSubtitle, { color: textSub }]}>Apps, Bots, Games & Tools</Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, { borderColor: cardBorder, backgroundColor: cardBg }]}
            onPress={loadItems}
            accessibilityLabel="Refresh portal"
          >
            <Ionicons name="reload" size={18} color={textMain} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.filterGrid}>
            {[
              ['Search', 'PortalSearch', 'search-outline'],
              ['Categories', 'PortalCategories', 'grid-outline'],
              ['Featured', 'PortalFeatured', 'star-outline'],
              ['Trending', 'PortalTrending', 'trending-up-outline'],
              ['Store', 'PortalStore', 'storefront-outline'],
            ].map(([label, routeName, icon]) => (
              <TouchableOpacity
                key={routeName}
                onPress={() => navigation.navigate(routeName)}
                style={[styles.filter, { borderColor: cardBorder, backgroundColor: cardBg }]}
              >
                <Ionicons name={icon} size={16} color={blue} />
                <Text style={[styles.filterText, { color: textMain }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.studioBanner, { backgroundColor: blue }]}
            onPress={() => navigation.navigate('StudioHome')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.studioTitle}>Nax Studio</Text>
              <Text style={styles.studioSubtitle}>Create and publish Mini-Apps with AI</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textMain }]}>Latest Ecosystem</Text>
            <Text style={[styles.countText, { color: textSub }]}>{items.length} items</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={blue} style={{ marginTop: 30 }} />
          ) : items.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Ionicons name="cube-outline" size={44} color={textSub} />
              <Text style={[styles.emptyTitle, { color: textMain }]}>No public apps or bots yet</Text>
              <Text style={[styles.emptyText, { color: textSub }]}>Publish from Nax Studio and your creation will appear here.</Text>
              <TouchableOpacity style={[styles.emptyAction, { backgroundColor: textMain }]} onPress={() => navigation.navigate('StudioHome')}>
                <Text style={{ color: isDark ? '#000' : '#FFF', fontWeight: '800' }}>Open Studio</Text>
              </TouchableOpacity>
            </View>
          ) : (
            items.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.82}
              >
                <View style={[styles.avatar, { backgroundColor: item.type === 'Bot' ? 'rgba(52,199,89,0.14)' : 'rgba(8,126,255,0.12)' }]}>
                  <Ionicons name={item.type === 'Bot' ? 'robot-outline' : 'apps-outline'} size={23} color={item.type === 'Bot' ? '#34C759' : blue} />
                </View>
                <View style={{ flex: 1, marginLeft: 13, marginRight: 10 }}>
                  <Text style={[styles.itemName, { color: textMain }]} numberOfLines={1}>{item.name || 'Untitled'}</Text>
                  <Text style={[styles.itemMeta, { color: textSub }]} numberOfLines={1}>{item.type} · {item.category || item.username || 'Ecosystem'}</Text>
                  {item.description ? <Text style={[styles.itemDesc, { color: textSub }]} numberOfLines={2}>{item.description}</Text> : null}
                </View>
                <View style={[styles.openPill, { backgroundColor: isDark ? '#FFF' : '#1C1C1E' }]}>
                  <Text style={{ color: isDark ? '#000' : '#FFF', fontWeight: '800', fontSize: 12 }}>{item.type === 'Bot' ? 'Chat' : 'Install'}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </GlassScene>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 3, fontWeight: '500' },
  refreshBtn: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, paddingBottom: 110 },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  filter: { width: '48%', minHeight: 46, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  filterText: { fontSize: 13, fontWeight: '700' },
  studioBanner: { padding: 18, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  studioTitle: { color: '#FFF', fontSize: 19, fontWeight: '900' },
  studioSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  countText: { fontSize: 12, fontWeight: '700' },
  itemCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 11 },
  avatar: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 16, fontWeight: '800' },
  itemMeta: { fontSize: 11, marginTop: 3, fontWeight: '600' },
  itemDesc: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  openPill: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 12 },
  emptyCard: { borderWidth: 1, borderRadius: 22, padding: 30, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 10 },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  emptyAction: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14, marginTop: 16 },
});