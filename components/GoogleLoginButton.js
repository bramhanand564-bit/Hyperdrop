import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// 🔥 यहाँ Drive बैकअप के लिए scopes और offlineAccess ऐड किया गया है
GoogleSignin.configure({
  webClientId: '138730719673-5vn0agd7hibmqd87b5a82l2q66dqnij9.apps.googleusercontent.com',
  scopes: ['https://www.googleapis.com/auth/drive.appdata'],
  offlineAccess: true, 
});

export default function GoogleLoginButton({ textMain, disabled }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      
      const idToken = response.data?.idToken || response.idToken;
      if (!idToken) throw new Error('Google Sign-In failed to get token.');

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);
      const user = userCredential.user;

      // नए यूजर के लिए रैंडम यूज़रनेम बनाना (ताकि ऐप क्रैश न हो)
      const emailPrefix = user.email ? user.email.split('@')[0].replace(/[^a-z0-9_]/g, '') : 'user';
      const randomNum = Math.floor(Math.random() * 10000);
      const fallbackUsername = `${emailPrefix}${randomNum}`;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email || '',
        username: `@${fallbackUsername}`,
        usernameLower: fallbackUsername,
        online: true,
        createdAt: new Date()
      }, { merge: true });

    } catch (error) {
      console.log('Google Auth Error:', error);
      Alert.alert('Google Login Failed', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.googleBtn} 
      onPress={handleGoogleAuth} 
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={textMain} />
      ) : (
        <>
          <Ionicons name="logo-google" size={20} color={textMain} />
          <Text style={[styles.googleBtnText, { color: textMain }]}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  googleBtn: {
    flexDirection: 'row', 
    height: 55, 
    borderRadius: 12, 
    justifyContent: 'center',
    alignItems: 'center', 
    marginTop: 15, 
    borderWidth: 1, 
    borderColor: 'rgba(150,150,150,0.3)'
  },
  googleBtnText: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginLeft: 10 
  }
});
