// ==========================================
// FILE: portal/PortalSearch.js
// NAX SUPER APP — PORTAL SEARCH
// ==========================================

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { MiniAppAPI } from '../api/MiniAppAPI';
import { BotAPI } from '../api/BotAPI';
import PortalCard from './PortalCard';

const TRENDING_TAGS = [
  'AI Bots',
  'Games',
  'Productivity',
  'Finance',
];

const SEARCH_DELAY = 350;
const SEARCH_TIMEOUT = 12000;

export default function PortalSearch({ navigation }) {
  const { isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [recentSearches, setRecentSearches] = useState([
    'Translator',
    'Tic Tac Toe',
  ]);

  const inputRef = useRef(null);
  const searchTimerRef = useRef(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  // ------------------------------------------
  // THEME
  // ------------------------------------------

  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const inputBg = isDark ? '#14202E' : '#EEF3F7';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';

  // ------------------------------------------
  // CLEANUP
  // ------------------------------------------

  useEffect(() => {
    mountedRef.current = true;

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);

    return () => {
      mountedRef.current = false;

      clearTimeout(timer);

      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  // ------------------------------------------
  // TIMEOUT HELPER
  // ------------------------------------------

  const withTimeout = (promise, timeoutMs = SEARCH_TIMEOUT) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Search request timed out.'));
        }, timeoutMs);
      }),
    ]);
  };

  // ------------------------------------------
  // NORMALIZE RESULT
  // ------------------------------------------

  const normalizeResults = (botResults, appResults) => {
    const safeBots = Array.isArray(botResults)
      ? botResults
      : [];

    const safeApps = Array.isArray(appResults)
      ? appResults
      : [];

    const bots = safeBots.map((bot) => ({
      ...bot,
      type: 'Bot',
      entryType: 'bot',
    }));

    const apps = safeApps.map((app) => ({
      ...app,
      type: 'MiniApp',
      entryType:
        app.entryType ||
        (app.url ? 'web' : 'declarative'),
    }));

    return [...bots, ...apps];
  };

  // ------------------------------------------
  // SEARCH
  // ------------------------------------------

  const performSearch = async (text) => {
    const queryText = text.trim();

    const currentRequestId = ++requestIdRef.current;

    if (!queryText) {
      if (!mountedRef.current) return;

      setResults([]);
      setIsSearching(false);
      setSearchError('');

      return;
    }

    if (!mountedRef.current) return;

    setIsSearching(true);
    setSearchError('');

    try {
      const [appResults, botResults] = await withTimeout(
        Promise.all([
          MiniAppAPI.searchMiniApps(queryText),
          BotAPI.searchBots(queryText),
        ])
      );

      // Ignore old/stale requests.
      if (
        currentRequestId !== requestIdRef.current ||
        !mountedRef.current
      ) {
        return;
      }

      const combinedResults = normalizeResults(
        botResults,
        appResults
      );

      setResults(combinedResults);

      // Save search term to recent searches.
      setRecentSearches((previous) => {
        const cleaned = previous.filter(
          (item) =>
            item.toLowerCase() !== queryText.toLowerCase()
        );

        return [queryText, ...cleaned].slice(0, 5);
      });
    } catch (error) {
      console.log('Portal search error:', error);

      if (
        currentRequestId !== requestIdRef.current ||
        !mountedRef.current
      ) {
        return;
      }

      setResults([]);
      setSearchError(
        'Search could not be completed. Please try again.'
      );
    } finally {
      if (
        currentRequestId === requestIdRef.current &&
        mountedRef.current
      ) {
        setIsSearching(false);
      }
    }
  };

  // ------------------------------------------
  // INPUT CHANGE
  // ------------------------------------------

  const handleSearch = (text) => {
    setSearchQuery(text);
    setSearchError('');

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!text.trim()) {
      requestIdRef.current += 1;

      setResults([]);
      setIsSearching(false);

      return;
    }

    setIsSearching(true);

    searchTimerRef.current = setTimeout(() => {
      performSearch(text);
    }, SEARCH_DELAY);
  };

  // ------------------------------------------
  // CLEAR
  // ------------------------------------------

  const handleClear = () => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    requestIdRef.current += 1;

    setSearchQuery('');
    setResults([]);
    setSearchError('');
    setIsSearching(false);

    Keyboard.dismiss();

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // ------------------------------------------
  // SUGGESTION
  // ------------------------------------------

  const handleSuggestionPress = (term) => {
    setSearchQuery(term);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    performSearch(term);
  };

  // ------------------------------------------
  // RETRY
  // ------------------------------------------

  const handleRetry = () => {
    if (!searchQuery.trim()) return;

    performSearch(searchQuery);
  };

  // ------------------------------------------
  // RENDER ITEM
  // ------------------------------------------

  const renderItem = ({ item }) => (
    <PortalCard
      item={item}
      navigation={navigation}
    />
  );

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
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={textMain}
          />
        </TouchableOpacity>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: inputBg },
          ]}
        >
          <Ionicons
            name="search"
            size={19}
            color={textSub}
            style={styles.searchIcon}
          />

          <TextInput
            ref={inputRef}
            style={[
              styles.searchInput,
              { color: textMain },
            ]}
            placeholder="Search Nax Portal..."
            placeholderTextColor={textSub}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="never"
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClear}
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={textSub}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* EMPTY SEARCH / DISCOVERY */}
      {searchQuery.trim().length === 0 ? (
        <View style={styles.idleState}>
          {/* RECENT SEARCHES */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: textMain },
                ]}
              >
                Recent Searches
              </Text>

              {recentSearches.length > 0 && (
                <TouchableOpacity
                  onPress={() => setRecentSearches([])}
                >
                  <Text
                    style={[
                      styles.clearRecentText,
                      { color: textSub },
                    ]}
                  >
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {recentSearches.length > 0 ? (
              recentSearches.map((term, index) => (
                <TouchableOpacity
                  key={`${term}-${index}`}
                  style={[
                    styles.recentItem,
                    {
                      borderBottomColor: border,
                    },
                  ]}
                  onPress={() =>
                    handleSuggestionPress(term)
                  }
                >
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={textSub}
                  />

                  <Text
                    style={[
                      styles.recentText,
                      { color: textMain },
                    ]}
                  >
                    {term}
                  </Text>

                  <Ionicons
                    name="search-outline"
                    size={17}
                    color={textSub}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <Text
                style={[
                  styles.noRecentText,
                  { color: textSub },
                ]}
              >
                No recent searches.
              </Text>
            )}
          </View>

          {/* TRENDING */}
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: textMain,
                  marginBottom: 15,
                },
              ]}
            >
              Trending Now
            </Text>

            <View style={styles.tagsContainer}>
              {TRENDING_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tag,
                    {
                      backgroundColor: cardBg,
                      borderColor: border,
                    },
                  ]}
                  onPress={() =>
                    handleSuggestionPress(tag)
                  }
                >
                  <Ionicons
                    name="trending-up"
                    size={14}
                    color={blue}
                  />

                  <Text
                    style={[
                      styles.tagText,
                      { color: textMain },
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.resultsContainer}>
          {/* SEARCHING */}
          {isSearching ? (
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
                Searching Portal...
              </Text>
            </View>
          ) : searchError ? (
            /* ERROR */
            <View style={styles.emptyState}>
              <Ionicons
                name="cloud-offline-outline"
                size={52}
                color={textSub}
              />

              <Text
                style={[
                  styles.emptyTitle,
                  { color: textMain },
                ]}
              >
                Search unavailable
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  { color: textSub },
                ]}
              >
                {searchError}
              </Text>

              <TouchableOpacity
                style={[
                  styles.retryButton,
                  { backgroundColor: blue },
                ]}
                onPress={handleRetry}
              >
                <Text style={styles.retryText}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : results.length === 0 ? (
            /* NO RESULTS */
            <View style={styles.emptyState}>
              <Ionicons
                name="search-outline"
                size={52}
                color={textSub}
              />

              <Text
                style={[
                  styles.emptyTitle,
                  { color: textMain },
                ]}
              >
                No results found
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  { color: textSub },
                ]}
              >
                No bots or apps found for "{searchQuery}"
              </Text>
            </View>
          ) : (
            /* RESULTS */
            <FlatList
              data={results}
              keyExtractor={(item, index) =>
                String(
                  item.id ||
                    item.uid ||
                    item.slug ||
                    `portal-result-${index}`
                )
              }
              renderItem={renderItem}
              contentContainerStyle={
                styles.listContent
              }
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop:
      Platform.OS === 'ios' ? 10 : 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },

  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginRight: 10,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    paddingVertical: 0,
  },

  clearBtn: {
    padding: 5,
  },

  idleState: {
    padding: 20,
  },

  section: {
    marginBottom: 30,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  clearRecentText: {
    fontSize: 13,
  },

  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
  },

  recentText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },

  noRecentText: {
    marginTop: 10,
    fontSize: 14,
  },

  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },

  tagText: {
    fontSize: 14,
    fontWeight: '600',
  },

  resultsContainer: {
    flex: 1,
  },

  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  listContent: {
    padding: 15,
    paddingBottom: 30,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 80,
  },

  emptyTitle: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '700',
  },

  emptyText: {
    marginTop: 8,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },

  retryButton: {
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
  },

  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
