import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { auth, db } from '../../firebaseConfig';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function ProfileCard() {
  const { isDark } = useTheme();
  const user = auth.currentUser;

  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');

  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=007AFF&color=fff&size=120`;

  useEffect(() => {
    const fetchUsername = async () => {
      if (!user?.uid) return;
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) setUsername(snap.data().username || '');
    };
    fetchUsername();
  }, [user]);

  const saveProfile = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await updateProfile(user, { displayName: newName.trim() });
      await setDoc(doc(db, 'users', user.uid), { displayName: newName.trim() }, { merge: true });
      setIsEditing(false);
    } catch (e) {} finally { setLoading(false); }
  };

  return (
    <View style={[styles.profileCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={styles.profileInfo}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <View style={styles.nameWrap}>
          {isEditing ? (
            <View style={styles.editBox}>
              <TextInput style={[styles.nameInput, { color: textMain, borderColor: borderCol }]} value={newName} onChangeText={setNewName} />
              <TouchableOpacity onPress={saveProfile} style={styles.saveBtn} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.userName, { color: textMain }]}>{user?.displayName || 'Set Name'}</Text>
              <Text style={[styles.userHandle, { color: '#007AFF' }]}>{username || 'No username'}</Text>
              <Text style={[styles.userStatus, { color: textSub }]}>{user?.email}</Text>
            </>
          )}
        </View>
      </View>
      {!isEditing && (
        <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
          <Ionicons name="pencil" size={20} color="#007AFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 15, borderWidth: 1, marginBottom: 25 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ccc' },
  nameWrap: { marginLeft: 15, flex: 1 },
  userName: { fontSize: 20, fontWeight: 'bold', marginBottom: 3 },
  userHandle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  userStatus: { fontSize: 12 },
  editBtn: { padding: 8, backgroundColor: 'rgba(0,122,255,0.1)', borderRadius: 50 },
  editBox: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  nameInput: { flex: 1, height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginRight: 10 },
  saveBtn: { backgroundColor: '#007AFF', paddingHorizontal: 15, height: 40, justifyContent: 'center', borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
});
