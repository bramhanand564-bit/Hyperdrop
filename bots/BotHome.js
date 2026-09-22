// bots/BotHome.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { auth } from '../firebaseConfig';

import {
  getMyBots,
  getPublicBots,
} from '../api/BotAPI';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const FILTERS = [
  {
    id: 'mine',
    label: 'My Bots',
  },
  {
    id: 'public',
    label: 'Discover',
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getCurrentUserId() {
  return auth?.currentUser?.uid || null;
}

function getBotDisplayName(bot) {
  return (
    bot?.name ||
    bot?.displayName ||
    bot?.username ||
    'Unnamed Bot'
  );
}

function getBotUsername(bot) {
  if (!bot?.username) {
    return '';
  }

  const username = String(bot.username);

  return username.startsWith('@')
    ? username
    : `@${username}`;
}

function getBotDescription(bot) {
  return (
    bot?.description ||
    'No description available.'
  );
}

function getBotInitial(bot) {
  const name = getBotDisplayName(bot);

  return name
    .trim()
    .charAt(0)
    .toUpperCase() || 'B';
}

function getBotStatus(bot) {
  if (bot?.status === 'suspended') {
    return 'Suspended';
  }

  if (bot?.status === 'published') {
    return 'Published';
  }

  if (bot?.status === 'draft') {
    return 'Draft';
  }

  return bot?.visibility === 'public'
    ? 'Public'
    : 'Bot';
}

/* -------------------------------------------------------------------------- */
/* BotCard                                                                    */
/* -------------------------------------------------------------------------- */

function BotCard({
  bot,
  isOwner,
  onPress,
}) {
  const name = getBotDisplayName(bot);
  const username = getBotUsername(bot);
  const description = getBotDescription(bot);
  const initial = getBotInitial(bot);
  const status = getBotStatus(bot);

  const installs =
    Number(bot?.installs || bot?.installCount || 0);

  const usage =
    Number(bot?.usageCount || bot?.uses || 0);

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => onPress?.(bot)}
      style={styles.botCard}
    >
      <View style={styles.botIcon}>
        <Text style={styles.botIconText}>
          {initial}
        </Text>
      </View>

      <View style={styles.botContent}>
        <View style={styles.botTitleRow}>
          <View style={styles.botTitleContainer}>
            <Text
              numberOfLines={1}
              style={styles.botName}
            >
              {name}
            </Text>

            {!!username && (
              <Text
                numberOfLines={1}
                style={styles.botUsername}
              >
                {username}
              </Text>
            )}
          </View>

          <View
            style={[
              styles.statusBadge,
              status === 'Suspended' &&
                styles.statusBadgeDanger,
              status === 'Published' &&
                styles.statusBadgeSuccess,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                status === 'Suspended' &&
                  styles.statusTextDanger,
                status === 'Published' &&
                  styles.statusTextSuccess,
              ]}
            >
              {status}
            </Text>
          </View>
        </View>

        <Text
          numberOfLines={2}
          style={styles.botDescription}
        >
          {description}
        </Text>

        <View style={styles.botMetaRow}>
          <Text style={styles.metaText}>
            {installs} installs
          </Text>

          <Text style={styles.metaSeparator}>
            •
          </Text>

          <Text style={styles.metaText}>
            {usage} uses
          </Text>

          {isOwner && (
            <>
              <Text style={styles.metaSeparator}>
                •
              </Text>

              <Text style={styles.ownerText}>
                Owner
              </Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* -------------------------------------------------------------------------- */
/* EmptyState                                                                 */
/* -------------------------------------------------------------------------- */

function EmptyState({
  filter,
  onCreateBot,
  onDiscover,
}) {
  const isMine = filter === 'mine';

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>
          🤖
        </Text>
      </View>

      <Text style={styles.emptyTitle}>
        {isMine
          ? 'No bots yet'
          : 'No bots found'}
      </Text>

      <Text style={styles.emptyDescription}>
        {isMine
          ? 'Create your first Nax bot and customize its commands, buttons and behavior.'
          : 'Public bots will appear here when they are available.'}
      </Text>

      {isMine ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onCreateBot}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            Create Bot
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onDiscover}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            Refresh
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* ErrorState                                                                 */
/* -------------------------------------------------------------------------- */

function ErrorState({
  message,
  onRetry,
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.errorIcon}>
        <Text style={styles.errorIconText}>
          !
        </Text>
      </View>

      <Text style={styles.emptyTitle}>
        Couldn't load bots
      </Text>

      <Text style={styles.emptyDescription}>
        {message ||
          'Something went wrong while loading the bot list.'}
      </Text>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onRetry}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>
          Try Again
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* BotHome                                                                    */
/* -------------------------------------------------------------------------- */

export default function BotHome({
  navigation,
  onCreateBot,
  onOpenBot,
}) {
  const [filter, setFilter] = useState('mine');

  const [bots, setBots] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState('');

  const userId = getCurrentUserId();

  /* ------------------------------------------------------------------------ */
  /* Load bots                                                                */
  /* ------------------------------------------------------------------------ */

  const loadBots = useCallback(
    async ({
      isRefresh = false,
    } = {}) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        let result = [];

        if (filter === 'mine') {
          if (!userId) {
            result = [];
          } else {
            result = await getMyBots(userId);
          }
        } else {
          result = await getPublicBots();
        }

        if (!Array.isArray(result)) {
          result = [];
        }

        setBots(result);
      } catch (loadError) {
        console.error(
          '[BotHome] Failed to load bots:',
          loadError
        );

        setBots([]);

        setError(
          loadError?.message ||
            'Unable to load bots right now.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter, userId]
  );

  /* ------------------------------------------------------------------------ */
  /* Initial / filter loading                                                 */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  /* ------------------------------------------------------------------------ */
  /* Navigation                                                               */
  /* ------------------------------------------------------------------------ */

  const handleCreateBot = useCallback(() => {
    if (onCreateBot) {
      onCreateBot();
      return;
    }

    if (navigation?.navigate) {
      navigation.navigate('BotCreate');
    }
  }, [
    navigation,
    onCreateBot,
  ]);

  const handleOpenBot = useCallback(
    (bot) => {
      if (!bot) {
        return;
      }

      if (onOpenBot) {
        onOpenBot(bot);
        return;
      }

      if (navigation?.navigate) {
        navigation.navigate(
          'BotEdit',
          {
            botId: bot.id,
            bot,
          }
        );
      }
    },
    [
      navigation,
      onOpenBot,
    ]
  );

  /* ------------------------------------------------------------------------ */
  /* Filter change                                                            */
  /* ------------------------------------------------------------------------ */

  const handleFilterChange =
    useCallback((nextFilter) => {
      if (nextFilter === filter) {
        return;
      }

      setFilter(nextFilter);
    }, [filter]);

  /* ------------------------------------------------------------------------ */
  /* Refresh                                                                  */
  /* ------------------------------------------------------------------------ */

  const handleRefresh = useCallback(() => {
    loadBots({
      isRefresh: true,
    });
  }, [loadBots]);

  /* ------------------------------------------------------------------------ */
  /* Header                                                                    */
  /* ------------------------------------------------------------------------ */

  const header = useMemo(
    () => (
      <View>
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>
              Bots
            </Text>

            <Text style={styles.subtitle}>
              Create and manage your Nax bots
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCreateBot}
            style={styles.createButton}
          >
            <Text style={styles.createButtonText}>
              + Create
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          {FILTERS.map((item) => {
            const active =
              item.id === filter;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() =>
                  handleFilterChange(item.id)
                }
                style={[
                  styles.filterButton,
                  active &&
                    styles.filterButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    active &&
                      styles.filterTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {filter === 'mine' && !userId && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              Sign in to create and manage your bots.
            </Text>
          </View>
        )}
      </View>
    ),
    [
      filter,
      handleCreateBot,
      handleFilterChange,
      userId,
    ]
  );

  /* ------------------------------------------------------------------------ */
  /* Footer                                                                   */
  /* ------------------------------------------------------------------------ */

  const footer = useMemo(() => {
    if (!loading && bots.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {bots.length}{' '}
            {bots.length === 1
              ? 'bot'
              : 'bots'}
          </Text>
        </View>
      );
    }

    return null;
  }, [
    bots.length,
    loading,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Render item                                                              */
  /* ------------------------------------------------------------------------ */

  const renderItem = useCallback(
    ({ item }) => (
      <BotCard
        bot={item}
        isOwner={
          filter === 'mine' ||
          item?.creatorId === userId ||
          item?.ownerId === userId
        }
        onPress={handleOpenBot}
      />
    ),
    [
      filter,
      handleOpenBot,
      userId,
    ]
  );

  const keyExtractor = useCallback(
    (item, index) =>
      String(
        item?.id ||
          item?.botId ||
          item?.username ||
          `bot-${index}`
      ),
    []
  );

  /* ------------------------------------------------------------------------ */
  /* Loading state                                                            */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {header}

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>
            Loading bots...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Error state                                                              */
  /* ------------------------------------------------------------------------ */

  if (error && bots.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {header}

        <ErrorState
          message={error}
          onRetry={handleRefresh}
        />
      </SafeAreaView>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Main render                                                              */
  /* ------------------------------------------------------------------------ */

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={bots}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            filter={filter}
            onCreateBot={handleCreateBot}
            onDiscover={() =>
              loadBots({
                isRefresh: true,
              })
            }
          />
        }
        ListFooterComponent={footer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        contentContainerStyle={
          bots.length === 0
            ? styles.emptyList
            : styles.listContent
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },

  createButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },

  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  filterContainer: {
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 4,
    borderRadius: 14,
    flexDirection: 'row',
    backgroundColor: '#E9ECF1',
  },

  filterButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterButtonActive: {
    backgroundColor: '#FFFFFF',
  },

  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  filterTextActive: {
    color: '#111827',
    fontWeight: '800',
  },

  infoBanner: {
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
  },

  infoBannerText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#9A3412',
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  emptyList: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  botCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },

  botIcon: {
    width: 52,
    height: 52,
    marginRight: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },

  botIconText: {
    fontSize: 21,
    fontWeight: '800',
    color: '#3730A3',
  },

  botContent: {
    flex: 1,
    minWidth: 0,
  },

  botTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  botTitleContainer: {
    flex: 1,
    paddingRight: 8,
  },

  botName: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    color: '#111827',
  },

  botUsername: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },

  statusBadgeSuccess: {
    backgroundColor: '#ECFDF5',
  },

  statusBadgeDanger: {
    backgroundColor: '#FEF2F2',
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4B5563',
  },

  statusTextSuccess: {
    color: '#047857',
  },

  statusTextDanger: {
    color: '#B91C1C',
  },

  botDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
  },

  botMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  metaText: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  metaSeparator: {
    marginHorizontal: 6,
    fontSize: 11,
    color: '#D1D5DB',
  },

  ownerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  emptyState: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    marginBottom: 18,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },

  emptyIconText: {
    fontSize: 32,
  },

  errorIcon: {
    width: 64,
    height: 64,
    marginBottom: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },

  errorIconText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#DC2626',
  },

  emptyTitle: {
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },

  emptyDescription: {
    maxWidth: 340,
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
  },

  primaryButton: {
    marginTop: 20,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  secondaryButton: {
    marginTop: 20,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  footer: {
    paddingTop: 4,
    paddingBottom: 20,
    alignItems: 'center',
  },

  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
