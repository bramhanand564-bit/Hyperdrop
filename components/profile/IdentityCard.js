import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';

export default function IdentityCard() {
  const { isDark } = useTheme();
  const user = auth.currentUser;

  const [username, setUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);

  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  useEffect(() => {
    const fetchUser = async () => {
      if (!user?.uid) return;
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setUsername(snap.data().username || '');
        setNewUsername((snap.data().username || '').replace(/^@/, ''));
      }
    };
    fetchUser();
  }, [user]);

  const normalizeUsername = (val) => val.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');

  const checkUsername = async () => {
    const clean = normalizeUsername(newUsername);
    if (clean.length < 3) { setUsernameStatus('Min 3 chars needed.'); return false; }
    if (clean === normalizeUsername(username)) { setUsernameStatus('✓ Current username.'); return true; }
    
    setUsernameStatus('');
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('usernameLower', '==', clean)));
      if (!snap.empty) { setUsernameStatus('❌ Username taken.'); return false; }
      setUsernameStatus('✓ Available.'); return true;
    } catch (e) { return false; }
  };

  const saveUsername = async () => {
    if (!user?.uid) return;
    const clean = normalizeUsername(newUsername);
    if (clean === normalizeUsername(username)) { setEditingUsername(false); return; }
    
    setLoading(true);
    try {
      const available = await checkUsername();
      if (!available) return;

      await runTransaction(db, async (t) => {
        const newRef = doc(db, 'usernames', clean);
        const oldRef = username ? doc(db, 'usernames', normalizeUsername(username)) : null;
        
        const check = await t.get(newRef);
        if (check.exists() && check.data().uid !== user.uid) throw new Error('TAKEN');
        
        t.set(newRef, { uid: user.uid, username: `@${clean}`, createdAt: serverTimestamp() });
        t.set(doc(db, 'users', user.uid), { username: `@${clean}`, usernameLower: clean }, { merge: true });
        if (oldRef && oldRef.id !== clean) t.delete(oldRef);
      });

      setUsername(`@${clean}`); setNewUsername(clean);
      setEditingUsername(false); Alert.alert('Success', `Username updated to @${clean}`);
    } catch (e) { Alert.alert('Error', e.message); } finally { setLoading(false); }
  };

  return (
    <View style={[styles.usernameCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={styles.usernameHeader}>
        <View style={[styles.identityIcon, { backgroundColor: 'rgba(0,122,255,0.12)' }]}><Ionicons name="at" size={22} color="#007AFF" /></View>
        <View style={styles.identityText}>
          <Text style={[styles.identityTitle, { color: textMain }]}>Username</Text>
          <Text style={[styles.identityValue, { color: username ? '#007AFF' : textSub }]}>{username || 'Create @username'}</Text>
        </View>
      </View>
      {!editingUsername ? (
        <TouchableOpacity style={styles.changeUsernameBtn} onPress={() => { setNewUsername(normalizeUsername(username)); setUsernameStatus(''); setEditingUsername(true); }}>
          <Ionicons name="create-outline" size={19} color="#FFF" />
          <Text style={styles.changeUsernameText}>Change Username</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.usernameEditor}>
          <View style={[styles.usernameInputBox, { borderColor: borderCol }]}>
            <Text style={[styles.atText, { color: textSub }]}>@</Text>
            <TextInput style={[styles.usernameInput, { color: textMain }]} value={newUsername} onChangeText={v => {setNewUsername(normalizeUsername(v)); setUsernameStatus('')}} autoCapitalize="none" maxLength={20} />
          </View>
          {!!usernameStatus && <Text style={[styles.usernameStatus, { color: usernameStatus.includes('✓') ? '#22C55E' : '#FF4D4F' }]}>{usernameStatus}</Text>}
          <View style={styles.usernameActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: borderCol }]} onPress={() => setEditingUsername(false)}><Text style={{ color: textMain }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.checkUsernameBtn} onPress={checkUsername}><Text style={styles.checkUsernameText}>Check</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveUsernameBtn} onPress={saveUsername} disabled={loading}>{loading ? <ActivityIndicator color="#FFF" size="small"/> : <Text style={styles.saveUsernameText}>Save</Text>}</TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  usernameCard: { padding: 16, borderRadius: 15, borderWidth: 1, marginBottom: 25 },
  usernameHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  identityIcon: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  identityText: { marginLeft: 12, flex: 1 },
  identityTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  identityValue: { fontSize: 14, fontWeight: '600' },
  changeUsernameBtn: { height: 46, borderRadius: 11, backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  changeUsernameText: { color: '#FFF', fontSize: 15, fontWeight: '700', marginLeft: 8 },
  usernameEditor: { marginTop: 2 },
  usernameInputBox: { height: 50, borderRadius: 11, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  atText: { fontSize: 18, fontWeight: '700' },
  usernameInput: { flex: 1, fontSize: 16, marginLeft: 4 },
  usernameStatus: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  usernameActions: { flexDirection: 'row', alignItems: 'center', marginTop: 13 },
  cancelBtn: { height: 42, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  checkUsernameBtn: { height: 42, paddingHorizontal: 13, marginLeft: 7, borderRadius: 9, backgroundColor: '#5856D6', justifyContent: 'center', alignItems: 'center' },
  checkUsernameText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  saveUsernameBtn: { height: 42, paddingHorizontal: 13, marginLeft: 7, borderRadius: 9, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  saveUsernameText: { color: '#FFF', fontSize: 13, fontWeight: '700' }
});
