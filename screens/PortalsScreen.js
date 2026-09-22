import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function PortalsScreen({ navigation }) {
  const { isDark } = useTheme();
  const [ecosystemItems, setEcosystemItems] = useState([]);

  // Super Glassy, No-Neon, Futuristic Palette
  const bg = isDark ? '#0A0A0C' : '#F2F2F7';
  const textMain = isDark ? '#F5F5F7' : '#1C1C1E';
  const textSub = isDark ? '#8E8E93' : '#6C6C70';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.85)';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)';
  const actionBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 122, 255, 0.1)';
  const actionText = isDark ? '#FFFFFF' : '#007AFF';

  // Firebase से रियल डेटा मंगाना (जैसे 'Ee', 'Hi', 'Generated App' आदि)[span_6](start_span)[span_6](end_span)[span_7](start_span)[span_7](end_span)
  useEffect(() => {
    const q = query(collection(db, 'portals'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEcosystemItems(items);
    });
    return unsubscribe;
  }, []);

  const handleItemPress = (item) => {
    if (item.type === 'bot' || item.isBot) {
      navigation.navigate('BotChat', { botData: item });
    } else {
      navigation.navigate('WebPortal', { 
        title: item.name || 'Generated App', 
        url: item.url || 'https://html5games.com/' 
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      
      {/* Sleek Futuristic Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: textMain }]}>Nax Portal</Text>
          <Text style={[styles.headerSubtitle, { color: textSub }]}>Apps, Bots, Games & Tools</Text>
        </View>
        <TouchableOpacity 
          style={[styles.refreshIconBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
          onPress={() => {/* Refresh logic agar ho */}}
        >
          <Ionicons name="reload" size={16} color={textMain} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        
        {/* Filter Pills Grid (Search, Categories, Featured, Trending) */}
        <View style={styles.filterGrid}>
          {['Search', 'Categories', 'Featured', 'Trending'].map((filter, index) => (
            <TouchableOpacity key={index} style={[styles.filterPill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.filterText, { color: textMain }]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nax Studio Banner */}
        <TouchableOpacity 
          style={[styles.studioBanner, { backgroundColor: isDark ? '#141416' : '#1C1C1E' }]}
          onPress={() => navigation.navigate('NaxStudio')}
          activeOpacity={0.9}
        >
          <Text style={styles.studioTitle}>Nax Studio</Text>
          <Text style={styles.studioDesc}>Create your own Mini-App with AI</Text>
        </TouchableOpacity>

        {/* Latest Ecosystem Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textMain }]}>Latest Ecosystem</Text>
          <Text style={[styles.itemCountText, { color: textSub }]}>{ecosystemItems.length || 5} items</Text>
        </View>

        {/* Ecosystem Dynamic List */}
        {ecosystemItems.length === 0 ? (
          // Fallback UI matching your exact screenshot structure if firebase data is empty
          [
            { id: '1', name: 'Ee', creator: 'ree', desc: 'Rr', type: 'bot' },
            { id: '2', name: 'Hi', creator: 'helloboy', desc: 'Anything', type: 'bot' },
            { id: '3', name: 'Big', creator: 'red', desc: 'Ffrr', type: 'bot' },
            { id: '4', name: 'Generated App', creator: 'Productivity', desc: '', type: 'app' },
            { id: '5', name: 'Generated App', creator: 'Games', desc: '', type: 'app' },
          ].map((item, idx) => (
            <View key={idx} style={[styles.ecosystemCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.cardLeft}>
                <View style={styles.avatarBox}>
                  <Text style={styles.avatarText}>{item.name.substring(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.cardName, { color: textMain }]}>{item.name}</Text>
                    <Ionicons name="checkmark-circle" size={14} color="#007AFF" style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={[styles.cardCreator, { color: textSub }]}>{item.creator}</Text>
                  {item.desc ? <Text style={[styles.cardDesc, { color: textSub }]} numberOfLines={1}>{item.desc}</Text> : null}
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: actionBg }]}
                onPress={() => handleItemPress(item)}
              >
                <Text style={[styles.actionBtnText, { color: actionText }]}>
                  {item.type === 'bot' ? 'Chat' : 'Open'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          ecosystemItems.map((item) => (
            <View key={item.id} style={[styles.ecosystemCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.cardLeft}>
                <View style={styles.avatarBox}>
                  <Text style={styles.avatarText}>{(item.name || 'App').substring(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: textMain }]}>{item.name}</Text>
                  <Text style={[styles.cardCreator, { color: textSub }]}>{item.creator || item.category || 'Ecosystem'}</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: actionBg }]}
                onPress={() => handleItemPress(item)}
              >
                <Text style={[styles.actionBtnText, { color: actionText }]}>
                  {item.isBot ? 'Chat' : 'Open'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 45 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  headerSubtitle: { fontSize: 13, fontWeight: '500' },
  refreshIconBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, justifyContent: 'space-between', marginBottom: 16 },
  filterPill: { width: '48%', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10, alignItems: 'center' },
  filterText: { fontSize: 14, fontWeight: '600' },

  studioBanner: { marginHorizontal: 20, padding: 20, borderRadius: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 3 },
  studioTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  studioDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  itemCountText: { fontSize: 12, fontWeight: '600' },

  ecosystemCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, marginHorizontal: 20, marginBottom: 12, borderRadius: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 1 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  avatarBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  cardInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  cardName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  cardCreator: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  cardDesc: { fontSize: 11, fontWeight: '400', marginTop: 1, opacity: 0.7 },

  actionBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12 },
  actionBtnText: { fontWeight: '700', fontSize: 13 }
});
