// ==========================================
// FILE: portal/PortalTrending.js
// NAX SUPER APP — PORTAL TRENDING
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

const PortalTrending = ({ navigation }) => {
  const { isDark } = useTheme();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  // LOAD TRENDING DATA
  // ------------------------------------------

  const fetchTrending = useCallback(
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
        // TRENDING SCORE
        //
        // Higher installs + views + rating =
        // higher position.
        // --------------------------------------

        const scoreItem = (item) => {
          const installs =
            Number(item.installs) || 0;

          const views =
            Number(item.views) || 0;

          const usage =
            Number(item.usage) ||
            Number(item.usageCount) ||
            0;

          const rating =
            Number(item.rating) || 0;

          const trendingScore =
            Number(
              item.trendingScore
            ) || 0;

          return (
            trendingScore * 1000 +
            installs * 5 +
            usage * 4 +
            views +
            rating * 25
          );
        };

        ecosystem.sort(
          (a, b) =>
            scoreItem(b) -
            scoreItem(a)
        );

        setItems(
          ecosystem.slice(0, 30)
        );
      } catch (err) {
        console.log(
          'PortalTrending fetch error:',
          err
        );

        setItems([]);

        setError(
          'Unable to load Trending right now.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchTrending(false);
  }, [fetchTrending]);

  // ------------------------------------------
  // RENDER
  // ------------------------------------------

  const renderItem = ({
    item,
    index,
  }) => (
    <View style={styles.itemContainer}>
      <View style={styles.rankContainer}>
        <Text
          style={[
            styles.rankText,
            {
              color:
                index === 0
                  ? '#D4AF37'
                  : index === 1
                  ? '#A8A8A8'
                  : index === 2
                  ? '#B87333'
                  : textSub,
              fontSize:
                index < 3
                  ? 21
                  : 16,
            },
          ]}
        >
          {index + 1}
        </Text>
      </View>

      <View style={styles.cardContainer}>
        <PortalCard
          item={item}
          navigation={navigation}
        />
      </View>
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
          {
            backgroundColor: bg,
          },
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
              {
                color: textSub,
              },
            ]}
          >
            Loading Trending...
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
        {
          backgroundColor: bg,
        },
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
          style={styles.headerButton}
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

        <View
          style={styles.headerCenter}
        >
          <Text
            style={[
              styles.headerTitle,
              {
                color: textMain,
              },
            ]}
          >
            Top Charts
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              {
                color: textSub,
              },
            ]}
          >
            Most popular right now
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() =>
            fetchTrending(true)
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
              {
                backgroundColor: blue,
              },
            ]}
            onPress={() =>
              fetchTrending(false)
            }
          >
            <Text
              style={
                styles.retryText
              }
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* LIST */}
      <FlatList
        data={items}
        keyExtractor={(
          item,
          index
        ) =>
          String(
            item.id ||
              item.uid ||
              item.slug ||
              `trending-${index}`
          )
        }
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              fetchTrending(true)
            }
          />
        }
        contentContainerStyle={
          items.length === 0
            ? styles.emptyList
            : styles.listContent
        }
        showsVerticalScrollIndicator={
          false
        }
        ListEmptyComponent={
          <View
            style={styles.emptyState}
          >
            <Ionicons
              name="trending-up-outline"
              size={58}
              color={textSub}
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  color: textMain,
                },
              ]}
            >
              Nothing Trending Yet
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color: textSub,
                },
              ]}
            >
              As users install and use
              apps and bots, they will
              appear here.
            </Text>

            <TouchableOpacity
              style={[
                styles.browseButton,
                {
                  backgroundColor: blue,
                },
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

  headerButton: {
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
    padding: 12,
    paddingBottom: 40,
  },

  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  rankContainer: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rankText: {
    fontWeight: '900',
  },

  cardContainer: {
    flex: 1,
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
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
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

export default PortalTrending;
