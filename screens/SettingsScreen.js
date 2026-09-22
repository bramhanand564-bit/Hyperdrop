import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const ROWS = [
  { id: 'AISettings', title: 'AI & Models', subtitle: 'Connect APIs, multiple models, or local AI', icon: 'sparkles', color: '#AF52DE' },
  { id: 'SecurityPermissions', title: 'Security & Permissions', subtitle: 'Control apps, wallet, camera, and location', icon: 'shield-checkmark-outline', color: '#34C759' },
  { id: 'Wallet', title: 'Wallet', subtitle: 'Tokens and transaction history', icon: 'wallet-outline', color: '#087EFF' },
  { id: 'DeveloperDashboard', title: 'Developer Dashboard', subtitle: 'Apps, bots, usage, and analytics', icon: 'bar-chart-outline', color: '#FF9500' },
];

export default function SettingsScreen({ navigation }) {
  const { isDark } = useTheme();
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const card = isDark ? '#101A26' : '#FFFFFF';
  const text = isDark ? '#F4F7FA' : '#142532';
  const sub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Ionicons name="settings-outline" size={34} color={text} />
          <Text style={[styles.title, { color: text }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: sub }]}>Control Nax, AI connections, security, and developer tools.</Text>
        </View>

        {ROWS.map(row => (
          <TouchableOpacity
            key={row.id}
            style={[styles.row, { backgroundColor: card, borderColor: border }]}
            onPress={() => navigation.navigate(row.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: `${row.color}20` }]}>
              <Ionicons name={row.icon} size={22} color={row.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.rowTitle, { color: text }]}>{row.title}</Text>
              <Text style={[styles.rowSubtitle, { color: sub }]}>{row.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={sub} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 100 },
  hero: { alignItems: 'center', paddingVertical: 24, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', marginTop: 8 },
  subtitle: { textAlign: 'center', marginTop: 5, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  iconBox: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '800' },
  rowSubtitle: { fontSize: 12, marginTop: 3, lineHeight: 17 },
});
