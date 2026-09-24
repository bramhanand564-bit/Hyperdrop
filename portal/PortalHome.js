// ==========================================
// FILE: portal/PortalHome.js
// NAX SUPER APP — PORTAL HOME (FUTURISTIC GLASS)
// ==========================================

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import GlassScene from '../components/ui/GlassScene';
import GlassButton from '../components/ui/GlassButton';

import { MiniAppAPI } from '../api/MiniAppAPI';
import { BotAPI } from '../api/BotAPI';
import PortalCard from './PortalCard';

const PortalHome = ({ navigation }) => {
  const { isDark, theme } = useTheme();

  const [apps, setApps] = useState([]);
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // 🎨 Super Glassy, No-Neon, Futuristic Palette
  const bg = theme.bg;
  const textMain = theme.text;
  const textSub = theme.sub;
  const cardBg = theme.surface;
  const cardBorder = theme.border;
  const studioBg = theme.blue;
  const studioBorder = theme.border;

  // 1️⃣ ORIGINAL LOGIC (UNTOUCHED / SAFE)
  const fetchPortalData = useCallback(async () => {
    setError('');

    try {
      const [publicAppsResult, publicBotsResult] = await Promise.all([
        MiniAppAPI.getPublicMiniApps(),
        BotAPI.searchBots(''),
      ]);

      const publicApps = Array.isArray(publicAppsResult)
        ? publicAppsResult
        : [];

      const publicBots = Array.isArray(publicBotsResult)
        ? publicBotsResult
        : [];

      setApps(publicApps);
      setBots(publicBots);
    } catch (err) {
      console.log('PortalHome fetch error:', err);
      setError('Unable to load Portal right now.');
      setApps([]);
      setBots([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPortalData();
  };

  const ecosystemItems = [
    ...bots.map((bot) => ({
      ...bot,
      type: 'Bot',
      entryType: 'bot',
    })),
    ...apps.map((app) => ({
      ...app,
      type: 'MiniApp',
      entryType:
        app.entryType || (app.url ? 'web' : 'declarative'),
    })),
  ];

  const handleOpenSearch = () => {
    navigation.navigate('PortalSearch');
  };

  const handleOpenCategories = () => {
    navigation.navigate('PortalCategories');
  };

  const handleOpenFeatured = () => {
    navigation.navigate('PortalFeatured');
  };

  const handleOpenTrending = () => {
    navigation.navigate('PortalTrending');
  };

  const handleOpenStore = () => {
    navigation.navigate('PortalStore');
  };

  const handleOpenStudio = () => {
    navigation.navigate('StudioHome');
  };

  const handleOpenImport = () => {
    navigation.navigate('MiniAppImport');
  };

  const handleOpenLocalApps = () => {
    navigation.navigate('MiniAppLibrary');
  };

  const renderItem = ({ item }) => (
    <PortalCard
      item={item}
      navigation={navigation}
    />
  );

  // 🌟 LOADING STATE (Glassy)
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={textMain} />
        <Text style={[styles.loadingText, { color: textSub }]}>
          Connecting to Nax Mesh...
        </Text>
      </View>
    );
  }

  // 🌟 HEADER COMPONENT (To keep FlatList smooth)
  const renderHeader = () => (
    <View>
      {/* Sleek Futuristic Title & Reload */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerSubtitle, { color: textSub }]}>PORTAL</Text>
          <Text style={[styles.title, { color: textMain }]}>Nax Portal</Text>
          <Text style={[styles.subtitle, { color: textSub }]}>
            Apps, Bots, Games & Tools
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          <Ionicons name="reload" size={16} color={textMain} />
        </TouchableOpacity>
      </View>

      {/* Futuristic Glass Action Buttons (Row 1) */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
          onPress={handleOpenSearch}
          activeOpacity={0.7}
        >
          <Ionicons name="search-outline" size={16} color={textSub} style={{ marginRight: 6 }} />
          <Text style={[styles.actionText, { color: textMain }]}>Search</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
          onPress={handleOpenCategories}
          activeOpacity={0.7}
        >
          <Ionicons name="grid-outline" size={16} color={textSub} style={{ marginRight: 6 }} />
          <Text style={[styles.actionText, { color: textMain }]}>Categories</Text>
        </TouchableOpacity>
      </View>

      {/* Futuristic Glass Action Buttons (Row 2) */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
          onPress={handleOpenFeatured}
          activeOpacity={0.7}
        >
          <Ionicons name="star-outline" size={16} color={textSub} style={{ marginRight: 6 }} />
          <Text style={[styles.actionText, { color: textMain }]}>Featured</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
          onPress={handleOpenTrending}
          activeOpacity={0.7}
        >
          <Ionicons name="trending-up-outline" size={16} color={textSub} style={{ marginRight: 6 }} />
          <Text style={[styles.actionText, { color: textMain }]}>Trending</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.studioButton, { backgroundColor: isDark ? '#101820' : '#FFFFFF', borderColor: studioBorder }]}
        onPress={handleOpenStore}
        activeOpacity={0.85}
      >
        <View style={styles.studioContent}>
          <Text style={[styles.studioTitle, { color: textMain }]}>Nax Store</Text>
          <Text style={[styles.studioSubtitle, { color: textSub }]}>Publish, discover and open community apps & bots</Text>
        </View>
        <View style={[styles.studioArrow, { backgroundColor: 'rgba(8,126,255,0.1)' }]}>
          <Ionicons name="storefront-outline" size={20} color="#087EFF" />
        </View>
      </TouchableOpacity>

      <View style={styles.importRow}>
        <TouchableOpacity
          style={[styles.importButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
          onPress={handleOpenImport}
          activeOpacity={0.85}
        >
          <Ionicons name="cloud-upload-outline" size={18} color={textMain} />
          <Text style={[styles.importText, { color: textMain }]}>Import App</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.importButton, { backgroundColor: cardBg, borderColor: cardBorder }]}
          onPress={handleOpenLocalApps}
          activeOpacity={0.85}
        >
          <Ionicons name="folder-open-outline" size={18} color={textMain} />
          <Text style={[styles.importText, { color: textMain }]}>My Apps</Text>
        </TouchableOpacity>
      </View>

      {/* Nax Studio Banner (Matte Glass, No Neon) */}
      <TouchableOpacity
        style={[styles.studioButton, { backgroundColor: studioBg, borderColor: studioBorder }]}
        onPress={handleOpenStudio}
        activeOpacity={0.85}
      >
        <View style={styles.studioContent}>
          <Text style={styles.studioTitle}>Nax Studio</Text>
          <Text style={styles.studioSubtitle}>
            Create your own Mini-App with AI
          </Text>
        </View>
        <View style={styles.studioArrow}>
          <Ionicons name="chevron-forward" size={20} color="#FFF" />
        </View>
      </TouchableOpacity>

      {/* Error Box */}
      {error ? (
        <View style={[styles.errorBox, { backgroundColor: 'rgba(255, 59, 48, 0.08)', borderColor: 'rgba(255, 59, 48, 0.2)' }]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchPortalData}
          >
            <Text style={styles.retryText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: textMain }]}>
          Latest Ecosystem
        </Text>
        <Text style={[styles.countText, { color: textSub }]}>
          {ecosystemItems.length} items
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}><GlassScene>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <FlatList
        data={ecosystemItems}
        keyExtractor={(item, index) =>
          String(item.id || item.uid || item.slug || index)
        }
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={textMain}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Ionicons name="cube-outline" size={36} color={textSub} style={{ marginBottom: 10 }} />
            <Text style={[styles.emptyTitle, { color: textMain }]}>
              Ecosystem Empty
            </Text>
            <Text style={[styles.emptyText, { color: textSub }]}>
              Be the first to publish a mini-app or bot using Nax Studio.
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: textMain }]}
              onPress={handleOpenStudio}
            >
              <Text style={[styles.createButtonText, { color: isDark ? '#000' : '#FFF' }]}>
                Launch Studio
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </GlassScene>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '500',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Action Buttons (Glass Pills)
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Studio Banner
  studioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 26,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  },
  studioContent: {
    flex: 1,
  },
  studioTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.3,
  },
  studioSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
  },
  studioArrow: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  importRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  importButton: { flex: 1, height: 46, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  importText: { fontSize: 13, fontWeight: '800', marginLeft: 7 },

  // Error Card
  errorBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
  },
  retryText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty Box
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  createButton: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  createButtonText: {
    fontWeight: '700',
    fontSize: 13,
  },
});

export default PortalHome;
