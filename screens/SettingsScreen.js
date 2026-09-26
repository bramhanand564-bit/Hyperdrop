import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import GlassScene from '../components/ui/GlassScene';
import GlassSurface from '../components/ui/GlassSurface';

const ROWS = [
  { id: 'ExperienceStore', title: 'Experience Store', subtitle: 'Discover, install, and customize creator-made tools', icon: 'storefront-outline' },
  { id: 'ExperienceDashboard', title: 'Experience Dashboard', subtitle: 'Your apps, growth, audience, and activity', icon: 'analytics-outline' },
  { id: 'AISettings', title: 'AI & Models', subtitle: 'Connect APIs, multiple models, or local AI', icon: 'sparkles-outline' },
  { id: 'SecurityPermissions', title: 'Security & Permissions', subtitle: 'Control apps, wallet, camera, and location', icon: 'shield-checkmark-outline' },
  { id: 'Wallet', title: 'Wallet', subtitle: 'Tokens and transaction history', icon: 'wallet-outline' },
  { id: 'DeveloperDashboard', title: 'Developer Dashboard', subtitle: 'Apps, bots, usage, and analytics', icon: 'bar-chart-outline' },
];

export default function SettingsScreen({ navigation }) {
  const { theme } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <GlassScene>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={[styles.icon, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
              <Ionicons name="settings-outline" size={30} color={theme.blue} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
            <Text style={[styles.subtitle, { color: theme.sub }]}>One visual language across every Nax screen.</Text>
          </View>

          {ROWS.map(row => (
            <TouchableOpacity key={row.id} activeOpacity={0.88} onPress={() => navigation.navigate(row.id)}>
              <GlassSurface strong radius={22} style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(8,126,255,0.10)' }]}>
                  <Ionicons name={row.icon} size={21} color={theme.blue} />
                </View>
                <View style={styles.copy}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>{row.title}</Text>
                  <Text style={[styles.rowSubtitle, { color: theme.sub }]}>{row.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.sub} />
              </GlassSurface>
            </TouchableOpacity>
          ))}

          <GlassSurface radius={22} style={styles.note}>
            <View style={[styles.dot, { backgroundColor: theme.green }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.noteTitle, { color: theme.text }]}>Nax visual system</Text>
              <Text style={[styles.noteText, { color: theme.sub }]}>Glassy white, calm blue, and deep night surfaces stay consistent with the active theme.</Text>
            </View>
          </GlassSurface>
        </ScrollView>
      </GlassScene>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, paddingBottom: 120 },
  hero: { alignItems: 'center', paddingTop: 14, paddingBottom: 22 },
  icon: { width: 62, height: 62, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 29, fontWeight: '900', marginTop: 10 },
  subtitle: { textAlign: 'center', marginTop: 5, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 15, marginBottom: 12 },
  iconBox: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 13 },
  rowTitle: { fontSize: 16, fontWeight: '800' },
  rowSubtitle: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  note: { flexDirection: 'row', alignItems: 'center', padding: 16, marginTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  noteTitle: { fontSize: 14, fontWeight: '800' },
  noteText: { fontSize: 12, lineHeight: 17, marginTop: 3 },
});
