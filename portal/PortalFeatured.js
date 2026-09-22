// ==========================================
// FILE: portal/PortalFeatured.js
// NAX SUPER APP — FEATURED
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

const PortalFeatured = ({ navigation }) => {
  const { isDark } = useTheme();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState('');

  // ------------------------------------------
  // THEME
  // ------------------------------------------

  const bg = isDark
    ? '#050A10'
    : '#F3F7FA';

  const headerBg = isDark
    ? '#0B1824'
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
  // LOAD FEATURED DATA
  // ------------------------------------------

  const fetchFeatured = useCallback(
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

        const ecosystem = [
          ...normalizedBots,
          ...normalizedApps,
        ];

        // --------------------------------------
        // FEATURED SORT
        // --------------------------------------

        ecosystem.sort((a, b) => {
          const aFeatured =
            a.featured === true ||
            a.isFeatured === true;

          const bFeatured =
            b.featured === true ||
            b.isFeatured === true;

          if (
            aFeatured &&
            !bFeatured
          ) {
            return -1;
          }

          if (
            !aFeatured &&
            bFeatured
          ) {
            return 1;
          }

          const aRating =
            Number(a.rating) || 0;

          const bRating =
            Number(b.rating) || 0;

          if (bRating !== aRating) {
            return bRating - aRating;
          }

          const aViews =
            Number(a.views) || 0;

          const bViews =
            Number(b.views) || 0;

          return bViews - aViews;
        });

        // --------------------------------------
        // SHOW FEATURED FIRST
        //
        // If no item is explicitly featured,
        // show the best available public items
        // instead of a blank screen.
        // --------------------------------------

        setItems(ecosystem.slice(0, 30));
      } catch (err) {
        console.log(
          'PortalFeatured fetch error:',
          err
        );

        setItems([]);

        setError(
          'Unable to load Featured right now.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchFeatured(false);
  }, [fetchFeatured]);

  // ------------------------------------------
  // RENDER
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
            Loading Featured...
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

        <View style={styles.headerCenter}>
          <Text
            style={[
              styles.headerTitle,
              { color: textMain },
            ]}
          >
            Featured
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              { color: textSub },
            ]}
          >
            Popular apps & bots
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() =>
            fetchFeatured(true)
          }
        >
          <Ionicons
            name="refresh"
            size={21}
            color={textMain}
          />
        </TouchableOpacity>
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
              fetchFeatured(false)
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

      {/* LIST */}
      <FlatList
        data={items}
        keyExtractor={(item, index) =>
          String(
            item.id ||
              item.uid ||
              item.slug ||
              `featured-${index}`
          )
        }
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              fetchFeatured(true)
            }
          />
        }
        contentContainerStyle={
          items.length === 0
            ? styles.emptyList
            : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="star-outline"
              size={58}
              color={textSub}
            />

            <Text
              style={[
                styles.emptyTitle,
                { color: textMain },
              ]}
            >
              Nothing Featured Yet
            </Text>

            <Text
              style={[
                styles.emptyText,
                { color: textSub },
              ]}
            >
              Published apps and bots will
              appear here.
            </Text>

            <TouchableOpacity
              style={[
                styles.browseButton,
                { backgroundColor: blue },
              ]}
              onPress={() =>
                navigation.goBack()
              }
            >
              <Text
                style={
                  styles.browseButtonText
                }
              >
                Back to Portal
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
    paddingBottom: 13,
    borderBottomWidth: 1,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
  },

  refreshButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 350,
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

export default PortalFeatured;
