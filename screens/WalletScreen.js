import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, SafeAreaView, StatusBar, Modal, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebaseConfig';
import GlassScene from '../components/ui/GlassScene';
import GlassSurface from '../components/ui/GlassSurface';

// 🧩 All Modular Components Imported
import ProfileCard from '../components/profile/ProfileCard';
import IdentityCard from '../components/profile/IdentityCard';
import WalletDashboard from '../components/wallet/WalletDashboard';
import BackupSection from '../components/settings/BackupSection';
import AdvancedSettings from '../components/settings/AdvancedSettings';
import PaymentEngine from '../payments/PaymentEngine';

export default function WalletScreen({ navigation, route }) {
  const { isDark, theme } = useTheme();
  const [sendOpen, setSendOpen] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const scannedRecipient = route?.params?.transactionId;
    if (scannedRecipient) {
      setRecipientId(String(scannedRecipient));
      setAmount('');
      setSendOpen(true);
      navigation?.setParams?.({ transactionId: undefined });
    }
  }, [route?.params?.transactionId, navigation]);

  const submitTransfer = async () => {
    const senderId = auth.currentUser?.uid;
    const recipient = recipientId.trim();
    const value = Number(amount);
    if (!senderId) return Alert.alert('Login required', 'Please sign in again.');
    if (!recipient) return Alert.alert('Recipient required', 'Scan a NAX payment QR or enter a recipient UID.');
    if (!Number.isFinite(value) || value <= 0) return Alert.alert('Invalid amount', 'Enter a positive NAX amount.');
    setSending(true);
    try {
      await PaymentEngine.transferTokens({ senderId, recipientId: recipient, amount: value });
      setSendOpen(false);
      setRecipientId('');
      setAmount('');
      Alert.alert('Transfer complete', `${value} NAX sent successfully.`);
    } catch (error) {
      Alert.alert('Transfer failed', error?.message || 'Please try again.');
    } finally { setSending(false); }
  };
  const bg = theme.bg;
  const textMain = theme.text;
  const textSub = theme.sub;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}><GlassScene>
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
        <WalletDashboard navigation={navigation} />

        {/* 4. Settings Section */}
        <Text style={[styles.sectionTitle, { color: textSub, marginTop: 25 }]}>SYSTEM SETTINGS</Text>
        <BackupSection />
        <AdvancedSettings />

      </ScrollView>
      </GlassScene>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginLeft: 10, marginBottom: 10, letterSpacing: 1 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sendSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: 22, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  modalSubtitle: { fontSize: 13, marginTop: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 7, marginTop: 8 },
  field: { height: 48, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, fontSize: 15 },
  transferBtn: { height: 50, borderRadius: 16, backgroundColor: '#087EFF', justifyContent: 'center', alignItems: 'center', marginTop: 18 },
  transferText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  securityNote: { fontSize: 11, textAlign: 'center', marginTop: 12 }
});
