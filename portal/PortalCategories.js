// ==========================================
// FILE: portal/PortalCategories.js
// NAX SUPER APP — PORTAL CATEGORIES
// ==========================================

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { MiniAppAPI } from '../api/MiniAppAPI';
import { BotAPI } from '../api/BotAPI';
import PortalCard from './PortalCard';

const CATEGORIES = [
  {
    id: 'All',
    name: 'All Apps',
    icon: 'apps',
  },
  {
    id: 'AI Bots',
    name: 'AI Bots',
    icon: 'hardware-chip',
  },
  {
    id: 'Games',
    name: 'Games',
    icon: 'game-controller',
  },
  {
    id: 'Tools',
    name: 'Tools',
    icon: 'hammer',
  },
  {
    id: 'Productivity',
    name: 'Productivity',
    icon: 'briefcase',
  },
  {
    id: 'Media',
    name: 'Media',
    icon: 'play-circle',
  },
];

const normalizeCategory = (value) => {
  if (!value) return '';

  return String(value)
    .trim()
    .toLowerCase();
};

const PortalCategories = ({
  navigation,
  route,
}) => {
  const { isDark } = useTheme();

  const initialCategory =
    route?.params?.category || 'All';

  const [activeCategory, setActiveCategory] =
    useState(initialCategory);

  const [items, setItems] = useState([]);
  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  // ------------------------------------------
  // THEME
  // ------------------------------------------

  const bg = isDark
    ? '#050A10'
    : '#F3F7FA';

  const headerBg = isDark
    ? '#0B1824'
    : '#FFFFFF';

  const cardBg = isDark
    ? '#101A26'
    : '#FFFFFF';

  const textMain = isDark
    ? '#F4F7FA'
    : '#142532';

  const textSub = isDark
    ? '#8FA6B9'
    : '#6C8494';

  const border = isDark
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.06)';

  const blue = '#087EFF';

  // ------------------------------------------
  // LOAD REAL PORTAL DATA
  // ------------------------------------------

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const [
          publicAppsResult,
          publicBotsResult,
        ] = await Promise.all([
          MiniAppAPI.getPublicMiniApps(),
          BotAPI.searchBots(''),
        ]);

        const apps = Array.isArray(
          publicAppsResult
        )
          ? publicAppsResult
          : [];

        const bots = Array.isArray(
          publicBotsResult
        )
          ? publicBotsResult
          : [];

        const normalizedApps = apps.map(
          (app) => ({
            ...app,
            type: 'MiniApp',
            entryType:
              app.entryType ||
              (app.url
                ? 'web'
                : 'declarative'),
          })
        );

        const normalizedBots = bots.map(
          (bot) => ({
            ...bot,
            type: 'Bot',
            entryType: 'bot',
          })
        );

        setItems([
          ...normalizedBots,
          ...normalizedApps,
        ]);
      } catch (err) {
        console.log(
          'PortalCategories fetch error:',
          err
        );

        setItems([]);

        setError(
          'Unable to load categories right now.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // ------------------------------------------
  // CATEGORY FILTER
  // ------------------------------------------

  const filteredItems =
    activeCategory === 'All'
      ? items
      : items.filter((item) => {
          const itemCategory =
            normalizeCategory(
              item.category
            );

          const selectedCategory =
            normalizeCategory(
              activeCategory
            );

          return (
            itemCategory ===
            selectedCategory
          );
        });

  // ------------------------------------------
  // CATEGORY CHANGE
  // ------------------------------------------

  const handleCategoryChange = (
    category
  ) => {
    setActiveCategory(category);
  };

  // ------------------------------------------
  // RENDER CARD
  // ------------------------------------------

  const renderItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <PortalCard
        item={item}
        navigation={navigation}
      />
    </View>
  );

  // ------------------------------------------
  // LOADING
  // ------------------------------------------

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: bg },
        ]}
      >
        <View style={styles.loadingState}>
          <ActivityIndicator
            size="large"
            color={blue}
          />

          <Text
            style={[
              styles.loadingText,
              { color: textSub },
            ]}
          >
            Loading categories...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ------------------------------------------
  // UI
  // ------------------------------------------

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: bg },
      ]}
    >
      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: headerBg,
            borderBottomColor: border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={textMain}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            { color: textMain },
          ]}
        >
          Categories
        </Text>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() =>
            fetchData(true)
          }
        >
          <Ionicons
            name="refresh"
            size={21}
            color={textMain}
          />
        </TouchableOpacity>
      </View>

      {/* CATEGORY TABS */}
      <View
        style={[
          styles.tabsContainer,
          {
            backgroundColor: headerBg,
            borderBottomColor: border,
          },
        ]}
      >
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          data={CATEGORIES}
          keyExtractor={(item) =>
            item.id
          }
          contentContainerStyle={
            styles.tabsList
          }
          renderItem={({ item }) => {
            const isActive =
              activeCategory === item.id;

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.tabItem,
                  {
                    borderColor:
                      isActive
                        ? blue
                        : border,
                    backgroundColor:
                      isActive
                        ? blue
                        : cardBg,
                  },
                ]}
                onPress={() =>
                  handleCategoryChange(
                    item.id
                  )
                }
              >
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={
                    isActive
                      ? '#FFFFFF'
                      : textSub
                  }
                  style={
                    styles.tabIcon
                  }
                />

                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isActive
                        ? '#FFFFFF'
                        : textSub,
                    },
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ERROR */}
      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor:
                isDark
                  ? '#35151B'
                  : '#FFF1F1',
            },
          ]}
        >
          <Text
            style={[
              styles.errorText,
              {
                color: isDark
                  ? '#FF9AA8'
                  : '#B00020',
              },
            ]}
          >
            {error}
          </Text>

          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: blue },
            ]}
            onPress={() =>
              fetchData(false)
            }
          >
            <Text
              style={styles.retryText}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* RESULT HEADER */}
      <View style={styles.resultHeader}>
        <View>
          <Text
            style={[
              styles.resultTitle,
              { color: textMain },
            ]}
          >
            {activeCategory}
          </Text>

          <Text
            style={[
              styles.resultSubtitle,
              { color: textSub },
            ]}
          >
            {filteredItems.length}{' '}
            {filteredItems.length === 1
              ? 'item'
              : 'items'}
          </Text>
        </View>
      </View>

      {/* LIST */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item, index) =>
          String(
            item.id ||
              item.uid ||
              item.slug ||
              `category-${index}`
          )
        }
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              fetchData(true)
            }
          />
        }
        contentContainerStyle={
          filteredItems.length === 0
            ? styles.emptyList
            : styles.listContent
        }
        showsVerticalScrollIndicator={
          false
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="folder-open-outline"
              size={56}
              color={textSub}
            />

            <Text
              style={[
                styles.emptyTitle,
                { color: textMain },
              ]}
            >
              No Apps Found
            </Text>

            <Text
              style={[
                styles.emptyText,
                { color: textSub },
              ]}
            >
              There are no published apps
              or bots in this category yet.
            </Text>

            <TouchableOpacity
              style={[
                styles.browseButton,
                {
                  backgroundColor: blue,
                },
              ]}
              onPress={() =>
                setActiveCategory('All')
              }
            >
              <Text
                style={
                  styles.browseButtonText
                }
              >
                Browse All
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop:
      Platform.OS === 'ios'
        ? 10
        : 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  refreshButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  tabsContainer: {
    paddingBottom: 12,
    borderBottomWidth: 1,
  },

  tabsList: {
    paddingHorizontal: 15,
    paddingTop: 10,
    gap: 10,
  },

  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },

  tabIcon: {
    marginRight: 6,
  },

  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },

  errorBox: {
    marginHorizontal: 15,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },

  errorText: {
    fontSize: 14,
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  resultHeader: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 5,
  },

  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
  },

  resultSubtitle: {
    marginTop: 3,
    fontSize: 13,
  },

  listContent: {
    padding: 15,
    paddingBottom: 40,
  },

  cardWrapper: {
    marginBottom: 10,
  },

  emptyList: {
    flexGrow: 1,
    padding: 15,
  },

  emptyState: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  emptyTitle: {
    marginTop: 15,
    fontSize: 19,
    fontWeight: '800',
  },

  emptyText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  browseButton: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },

  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default PortalCategories;
