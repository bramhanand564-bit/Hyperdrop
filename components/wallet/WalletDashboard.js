import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import PaymentEngine from '../../payments/PaymentEngine';

// 🔥 REAL FIREBASE IMPORTS
import { db, auth } from '../../firebaseConfig';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';

export default function WalletDashboard({ navigation }) {
  const { isDark } = useTheme();
  const user = auth.currentUser;

  // 💰 Real Wallet States
  const [tokens, setTokens] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);

  // UI Colors (Super Glassy, Zero-Neon)
  const textMain = isDark ? '#F5F5F7' : '#1C1C1E';
  const textSub = isDark ? '#8E8E93' : '#6C6C70';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.85)';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)';
  const naxBlue = '#087EFF'; 

  useEffect(() => {
    if (!user?.uid) return;

    // 1. 📡 REAL-TIME BALANCE LISTENER
    const userRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTokens(Number(data.walletBalance || 0));
        setRevenue(Number(data.creatorRevenue || 0)); 
      }
      setLoading(false);
    });

    // 2. 📡 REAL-TIME TRANSACTION HISTORY
    const txRef = collection(db, 'users', user.uid, 'transactions');
    const q = query(txRef, orderBy('timestamp', 'desc'), limit(5));
    const unsubTx = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setTransactions([]);
      }
    });

    return () => { unsubUser(); unsubTx(); };
  }, [user]);

  const handleWithdraw = async () => {
    if (revenue < 100 || actionBusy) {
      Alert.alert('Minimum Limit', 'You need at least 100 NAX Tokens in Creator Revenue to request a withdrawal.');
      return;
    }
    setActionBusy(true);
    try {
      const result = await PaymentEngine.requestWithdrawal({ userId: user.uid, amount: revenue });
      Alert.alert('Withdrawal requested', `Request ${result.id.slice(0, 8)}… is pending processing.`);
    } catch (error) {
      Alert.alert('Withdrawal failed', error?.message || 'Please try again.');
    } finally { setActionBusy(false); }
  };

  return (
    <View style={styles.container}>
      
      {/* 💳 1. MAIN WALLET CARD (Premium Blue Gradient Style) */}
      <View style={[styles.walletCard, { backgroundColor: naxBlue }]}>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 }}>Total Tokens</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 30 }}>🪙</Text>
          <Text style={{ color: '#FFF', fontSize: 36, fontWeight: '900', marginLeft: 8, letterSpacing: -1 }}>
            {loading ? '...' : tokens}
          </Text>
        </View>
        
        <View style={styles.walletActions}>
          <TouchableOpacity style={styles.walletBtn} activeOpacity={0.8} onPress={() => Alert.alert('Add NAX', 'Use your NAX receive QR so another wallet can send you tokens.', [{ text: 'Show Receive QR', onPress: () => navigation?.navigate?.('QRHub') }, { text: 'Cancel', style: 'cancel' }])}>
            <Ionicons name="add-circle" size={20} color={naxBlue} />
            <Text style={styles.walletBtnText}>Top Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.walletBtn} activeOpacity={0.8} onPress={() => Alert.alert('Send Tokens', 'Scan a NAX payment QR to continue.', [{ text: 'Open QR Scanner', onPress: () => navigation?.navigate?.('QRHub') }, { text: 'Cancel', style: 'cancel' }])}>
            <Ionicons name="send" size={18} color={naxBlue} />
            <Text style={styles.walletBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 📈 2. CREATOR REVENUE BOX (Point #8 of Blueprint) */}
      <View style={[styles.revenueCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.revHeader}>
          <Text style={[styles.revTitle, { color: textMain }]}>App Revenue (Creator)</Text>
          <Text style={{ color: '#34C759', fontSize: 18, fontWeight: '800' }}>+{loading ? '...' : revenue} 🪙</Text>
        </View>
        <TouchableOpacity 
          style={[styles.withdrawBtn, { borderColor: cardBorder, backgroundColor: isDark ? 'rgba(52, 199, 89, 0.05)' : '#FFF' }]}
          onPress={handleWithdraw}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#34C759', fontWeight: '700', fontSize: 13 }}>Withdraw to Bank</Text>
        </TouchableOpacity>
      </View>

      {/* 📜 3. TRANSACTION HISTORY */}
      {loading ? (
        <ActivityIndicator color={naxBlue} style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.txContainer}>
          {transactions.map(tx => (
            <View key={tx.id} style={styles.txRow}>
              <View style={[styles.txIconBox, { backgroundColor: tx.isCredit ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)' }]}>
                <Ionicons name={tx.isCredit ? "arrow-down" : "game-controller"} size={18} color={tx.isCredit ? "#34C759" : "#FF3B30"} />
              </View>
              <View style={styles.txInfo}>
                <Text style={[styles.txTitle, { color: textMain }]} numberOfLines={1}>{tx.title}</Text>
                <Text style={{ color: textSub, fontSize: 12, marginTop: 2, fontWeight: '500' }}>{tx.time}</Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.isCredit ? '#34C759' : textMain }]}>
                {tx.isCredit ? '+' : ''}{tx.amount} 🪙
              </Text>
            </View>
          ))}
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  
  // Wallet Card
  walletCard: { padding: 24, borderRadius: 24, marginBottom: 20, shadowColor: '#087EFF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
  walletActions: { flexDirection: 'row', gap: 12 },
  walletBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#FFF', paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  walletBtnText: { color: '#087EFF', fontWeight: '800', fontSize: 14, marginLeft: 6 },

  // Revenue Card
  revenueCard: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 25 },
  revHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  revTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  withdrawBtn: { paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },

  // Transactions
  txContainer: { marginTop: 5 },
  txRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  txIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txInfo: { flex: 1, paddingRight: 10 },
  txTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  txAmount: { fontSize: 16, fontWeight: '800' }
});
