import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, Image 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location'; // 📍 Expo Location API
import { useTheme } from '../context/ThemeContext';
import GlassScene from '../components/ui/GlassScene';

// 🔥 REAL FIREBASE IMPORTS
import { db, auth } from '../firebaseConfig';
import { DiscoverService } from '../discover/DiscoverService';
import * as Linking from 'expo-linking';

export default function DiscoverScreen({ navigation }) {
  const { isDark, theme } = useTheme();
  const user = auth.currentUser;

  // 📍 Location & Data States
  const [locationStatus, setLocationStatus] = useState('requesting'); // requesting, granted, denied
  const [currentCity, setCurrentCity] = useState('Locating...');
  const [nearbyApps, setNearbyApps] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState(10);

  // 🎨 Super Glassy, Zero-Neon Palette
  const bg = theme.bg;
  const textMain = theme.text;
  const textSub = theme.sub;
  const headerBg = theme.surface;
  const cardBg = theme.surface;
  const cardBorder = theme.border;
  const naxBlue = theme.blue;

  const categories = [
    { id: 'All', icon: 'compass' },
    { id: 'Restaurants', icon: 'restaurant' },
    { id: 'Shops', icon: 'cart' },
    { id: 'Events', icon: 'calendar' },
    { id: 'Local Bots', icon: 'robot-outline' }
  ];

  // 🚀 1. REQUEST REAL GPS PERMISSION & FETCH LOCAL APPS
  useEffect(() => {
    (async () => {
      try {
        // Step 1: Request Permission (As per your Blueprint rule)
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationStatus('denied');
          setLoading(false);
          return;
        }
        
        setLocationStatus('granted');
        
        // Step 2: Get Real Device Coordinates
        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        
        // Step 3: Reverse Geocoding (Lat/Lng to City Name)
        let geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        if (geocode.length > 0) {
          // It will detect your real location (e.g., Salempur Mahdood, Uttarakhand)
          setCurrentCity(`${geocode[0].city || geocode[0].district || geocode[0].name}, ${geocode[0].region}`);
        }

        // Step 4: Fetch Nearby Mini-Apps from Firebase (Geo-query simulation)
        fetchNearbyEcosystem(location.coords.latitude, location.coords.longitude);

      } catch (error) {
        Alert.alert("GPS Error", "Failed to fetch device location.");
        setLocationStatus('denied');
        setLoading(false);
      }
    })();
  }, []);

  const fetchNearbyEcosystem = async (lat, lng) => {
    try {
      const results = await DiscoverService.nearby({ lat, lng, radiusKm });
      setNearbyApps(results.map(item => ({
        ...item,
        type: item.type || 'app',
        category: item.category || 'Tools',
        rating: Number(item.rating || 0),
        distance: item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)} m` : `${item.distanceKm.toFixed(1)} km`,
      })));
    } catch (error) {
      console.log('Discover query failed:', error);
      setNearbyApps([]);
    } finally {
      setLoading(false);
    }
  };

  // 🖱️ SMART ROUTER
  const handleOpenItem = (item) => {
    if (item.type === 'bot') {
      navigation.navigate('BotChatScreen', { botData: { botName: item.name, systemPrompt: `You are a helpful local guide for ${item.name}.` } });
    } else {
      navigation.navigate('WebPortalScreen', { title: item.name, url: item.url || 'https://html5games.com' });
    }
  };

  // 🛑 UI FOR DENIED PERMISSION
  if (locationStatus === 'denied') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="location-outline" size={80} color={textSub} style={{ marginBottom: 20, opacity: 0.5 }} />
        <Text style={{ color: textMain, fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Location Required</Text>
        <Text style={{ color: textSub, textAlign: 'center', marginBottom: 30 }}>
          Nax Discover needs your GPS permission to find Mini-Apps, Bots, and Stores near you.
        </Text>
        <TouchableOpacity style={[styles.permissionBtn, { backgroundColor: naxBlue }]} onPress={async () => { const r = await Location.requestForegroundPermissionsAsync(); if (r.granted) { setLocationStatus('requesting'); setLoading(true); } else { await Linking.openSettings(); } }}>
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Enable Location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: textSub, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}><GlassScene>
      
      {/* 🌟 Glassy Header with Live Location */}
      <View style={[styles.header, { borderBottomColor: cardBorder, backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={textMain} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerSubtitle, { color: naxBlue }]}>NAX DISCOVER</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="location" size={16} color={textMain} style={{ marginRight: 4 }} />
            <Text style={[styles.headerTitle, { color: textMain }]} numberOfLines={1}>{currentCity}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => Alert.alert('Search radius', 'Choose how far Nax should search.', [
            { text: '5 km', onPress: () => setRadiusKm(5) },
            { text: '10 km', onPress: () => setRadiusKm(10) },
            { text: '25 km', onPress: () => setRadiusKm(25) },
            { text: 'Cancel', style: 'cancel' },
          ])}>
          <Ionicons name="options-outline" size={24} color={textMain} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 🗺️ Map Placeholder Banner */}
        <View style={[styles.mapBanner, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.radarCircle}>
            <MaterialCommunityIcons name="radar" size={50} color={naxBlue} style={{ opacity: 0.8 }} />
          </View>
          <Text style={[styles.mapBannerText, { color: textMain }]}>Scanning within {radiusKm} km...</Text>
          <Text style={{ color: textSub, fontSize: 12 }}>{nearbyApps.length} ecosystem items found nearby</Text>
        </View>

        {/* 📂 Horizontal Category Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.catChip, activeCategory === cat.id ? { backgroundColor: naxBlue, borderColor: naxBlue } : { backgroundColor: cardBg, borderColor: cardBorder }]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Ionicons name={cat.icon} size={16} color={activeCategory === cat.id ? '#FFF' : textMain} style={{ marginRight: 6 }} />
              <Text style={{ color: activeCategory === cat.id ? '#FFF' : textMain, fontWeight: '600', fontSize: 13 }}>{cat.id}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: textSub }]}>NEARBY RESULTS</Text>

        {/* 📱 Real-time Nearby List */}
        {loading ? (
          <ActivityIndicator size="large" color={naxBlue} style={{ marginTop: 40 }} />
        ) : (
          nearbyApps
            .filter(app => activeCategory === 'All' || app.category === activeCategory)
            .map((app) => (
            <TouchableOpacity 
              key={app.id} 
              style={[styles.appCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
              onPress={() => handleOpenItem(app)}
              activeOpacity={0.7}
            >
              {/* Distance Badge */}
              <View style={styles.distanceBadge}>
                <Ionicons name="navigate-circle" size={14} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>{app.distance}</Text>
              </View>

              <View style={styles.appCardLeft}>
                <View style={[styles.appIcon, { backgroundColor: app.type === 'bot' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(8, 126, 255, 0.1)' }]}>
                  <Ionicons name={app.type === 'bot' ? 'robot-outline' : 'grid-outline'} size={24} color={app.type === 'bot' ? '#34C759' : naxBlue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.appName, { color: textMain }]} numberOfLines={1}>{app.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                    <Text style={{ color: textSub, fontSize: 12, fontWeight: '500' }}>{app.category}</Text>
                    <Text style={{ color: textSub, fontSize: 12, marginHorizontal: 6 }}>•</Text>
                    <Ionicons name="star" size={12} color="#FF9500" />
                    <Text style={{ color: textSub, fontSize: 12, fontWeight: '600', marginLeft: 3 }}>{app.rating}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.actionBtn, { backgroundColor: isDark ? '#FFF' : '#1C1C1E' }]}>
                <Text style={{ color: isDark ? '#000' : '#FFF', fontWeight: '700', fontSize: 12 }}>
                  {app.type === 'bot' ? 'Chat' : 'Open'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {nearbyApps.filter(app => activeCategory === 'All' || app.category === activeCategory).length === 0 && !loading && (
          <Text style={{ color: textSub, textAlign: 'center', marginTop: 40 }}>No {activeCategory.toLowerCase()} found in your current radius.</Text>
        )}

      </ScrollView>
    </GlassScene></SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, zIndex: 10 },
  backBtn: { padding: 4, width: 40, alignItems: 'flex-start' },
  headerTitleWrap: { alignItems: 'center', flex: 1 },
  headerSubtitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  
  permissionBtn: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20, shadowColor: '#087EFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },

  scrollContent: { padding: 20, paddingBottom: 50 },
  
  // Radar Map Banner
  mapBanner: { height: 160, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 20, overflow: 'hidden' },
  radarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(8, 126, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  mapBannerText: { fontSize: 16, fontWeight: '700', marginBottom: 4 },

  // Categories
  categoryScroll: { marginBottom: 25, flexGrow: 0 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderWidth: 1, marginRight: 10, height: 40 },

  sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 15, marginLeft: 4 },

  // App Cards
  appCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  distanceBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderBottomLeftRadius: 16 },
  appCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 15, marginTop: 8 },
  appIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  appName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 10 }
});
