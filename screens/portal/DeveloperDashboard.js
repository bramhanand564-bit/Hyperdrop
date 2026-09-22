import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function DeveloperDashboard({ navigation }) {
  const { isDark } = useTheme();

  // Colors
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#1A222C' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const accentCol = '#087EFF'; // Nax Blue

  // 📊 Dummy Analytics Data (Firebase Firestore se aayega)
  const stats = { views: '142.5K', users: '45.2K', revenue: '8,450 🪙', rating: '4.8' };
  
  const myApps = [
    { id: '1', name: 'Nax Ludo Multi', type: 'Game', users: '12K', status: 'Active', crashes: 0, color: '#FF3B30' },
    { id: '2', name: 'Brahamanand Flix', type: 'Watch Party', users: '5K', status: 'Active', crashes: 2, color: '#AF52DE' },
    { id: '3', name: 'Ollama Local AI', type: 'Bot', users: '28K', status: 'Review', crashes: 0, color: '#34C759' },
  ];

  const StatCard = ({ icon, title, value, color }) => (
    <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}15` }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color: textMain }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: textSub }]}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* 🛠️ HEADER */}
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={textMain} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: textMain }]}>Creator Dashboard</Text>
          <Text style={styles.subText}>Nax Developer Portal 👨‍💻</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="settings-outline" size={22} color={textMain} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 📈 OVERVIEW STATS */}
        <Text style={[styles.sectionTitle, { color: textMain }]}>Overview (Last 30 Days)</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="eye" title="Total Views" value={stats.views} color="#087EFF" />
          <StatCard icon="account-group" title="Active Users" value={stats.users} color="#AF52DE" />
          <StatCard icon="hand-coin" title="Revenue" value={stats.revenue} color="#FFD700" />
          <StatCard icon="star" title="Avg Rating" value={stats.rating} color="#FF9500" />
        </View>

        {/* 📊 MOCK CHART SECTION (Visual representation of growth) */}
        <View style={[styles.chartCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.chartTitle, { color: textMain }]}>Weekly Growth</Text>
          <View style={styles.chartBars}>
            {[40, 65, 30, 85, 55, 95, 70].map((height, i) => (
              <View key={i} style={styles.barWrap}>
                <View style={[styles.bar, { height, backgroundColor: accentCol }]} />
                <Text style={{ color: textSub, fontSize: 10, marginTop: 5 }}>{['M','T','W','T','F','S','S'][i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 🧩 MANAGE MINI-APPS */}
        <View style={styles.appHeaderRow}>
          <Text style={[styles.sectionTitle, { color: textMain, marginBottom: 0 }]}>My Mini-Apps</Text>
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: 'rgba(8, 126, 255, 0.1)' }]}>
            <Ionicons name="add" size={16} color={accentCol} />
            <Text style={[styles.createText, { color: accentCol }]}>New App</Text>
          </TouchableOpacity>
        </View>

        {myApps.map((app) => (
          <View key={app.id} style={[styles.appCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={styles.appInfoRow}>
              <View style={[styles.appIcon, { backgroundColor: app.color }]} />
              <View style={styles.appDetails}>
                <Text style={[styles.appName, { color: textMain }]} numberOfLines={1}>{app.name}</Text>
                <Text style={[styles.appType, { color: textSub }]}>{app.type} • {app.users} Users</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: app.status === 'Active' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 149, 0, 0.15)' }]}>
                <Text style={{ color: app.status === 'Active' ? '#34C759' : '#FF9500', fontSize: 11, fontWeight: 'bold' }}>{app.status}</Text>
              </View>
            </View>

            {/* App Actions & Health */}
            <View style={[styles.appFooter, { borderTopColor: borderCol }]}>
              {app.crashes > 0 ? (
                <View style={styles.crashAlert}>
                  <Ionicons name="warning" size={14} color="#FF3B30" />
                  <Text style={styles.crashText}>{app.crashes} Crash Reports</Text>
                </View>
              ) : (
                <View style={styles.healthOk}>
                  <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                  <Text style={styles.healthText}>100% Stable</Text>
                </View>
              )}
              
              <TouchableOpacity style={styles.manageBtn}>
                <Text style={[styles.manageBtnText, { color: accentCol }]}>Manage</Text>
                <Ionicons name="chevron-forward" size={14} color={accentCol} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1 },
  iconBtn: { padding: 5 },
  titleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  subText: { fontSize: 12, color: '#087EFF', marginTop: 2, fontWeight: '600' },
  scrollContent: { padding: 20 },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  
  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { width: '48%', padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 15 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
  statTitle: { fontSize: 13, fontWeight: '600' },

  // Chart Card
  chartCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 30 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 20 },
  chartBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120 },
  barWrap: { alignItems: 'center' },
  bar: { width: 24, borderRadius: 6 },

  // App List
  appHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  createBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  createText: { fontWeight: 'bold', fontSize: 13, marginLeft: 4 },
  
  appCard: { borderRadius: 16, borderWidth: 1, marginBottom: 15, overflow: 'hidden' },
  appInfoRow: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  appIcon: { width: 45, height: 45, borderRadius: 12, marginRight: 15 },
  appDetails: { flex: 1 },
  appName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  appType: { fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  
  appFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingHorizontal: 15, borderTopWidth: 1, backgroundColor: 'rgba(0,0,0,0.02)' },
  crashAlert: { flexDirection: 'row', alignItems: 'center' },
  crashText: { color: '#FF3B30', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  healthOk: { flexDirection: 'row', alignItems: 'center' },
  healthText: { color: '#34C759', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  manageBtn: { flexDirection: 'row', alignItems: 'center' },
  manageBtnText: { fontWeight: 'bold', fontSize: 13, marginRight: 2 }
});
