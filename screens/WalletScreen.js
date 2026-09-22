import React from 'react';
import { ScrollView, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// 🧩 All Modular Components Imported
import ProfileCard from '../components/profile/ProfileCard';
import IdentityCard from '../components/profile/IdentityCard';
import WalletDashboard from '../components/wallet/WalletDashboard';
import BackupSection from '../components/settings/BackupSection';
import AdvancedSettings from '../components/settings/AdvancedSettings';

export default function WalletScreen() {
  const { isDark } = useTheme();
  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 100 }} 
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headerTitle, { color: textMain }]}>Profile & Wallet</Text>

        {/* 1. Profile Section */}
        <ProfileCard />

        {/* 2. Identity / Username Section */}
        <Text style={[styles.sectionTitle, { color: textSub }]}>NAX IDENTITY</Text>
        <IdentityCard />

        {/* 3. Wallet & Earnings Section */}
        <Text style={[styles.sectionTitle, { color: textSub, marginTop: 15 }]}>WALLET & EARNINGS</Text>
        <WalletDashboard />

        {/* 4. Settings Section */}
        <Text style={[styles.sectionTitle, { color: textSub, marginTop: 25 }]}>SYSTEM SETTINGS</Text>
        <BackupSection />
        <AdvancedSettings />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginLeft: 10, marginBottom: 10, letterSpacing: 1 },
});
