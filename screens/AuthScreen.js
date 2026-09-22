import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';

// यहाँ हमने अपनी तीनों नई फाइलों को इंपोर्ट कर लिया है
import GoogleLoginButton from '../components/GoogleLoginButton';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

export default function AuthScreen() {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const inputBg = isDark ? '#1E1E1E' : '#FFFFFF';

  const normalizeUsername = (value) => {
    return value.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  };

  const validateUsername = (value) => {
    const clean = normalizeUsername(value);
    if (!clean) return 'Username is required.';
    if (clean.length < 3) return 'Username must be at least 3 characters.';
    if (clean.length > 20) return 'Username must be 20 characters or less.';
    if (!/^[a-z0-9_]+$/.test(clean)) return 'Use only letters, numbers and _.';
    return '';
  };

  const checkUsername = async () => {
    const clean = normalizeUsername(username);
    const validation = validateUsername(username);
    if (validation) {
      setUsernameStatus(validation);
      return false;
    }
    setCheckingUsername(true);
    setUsernameStatus('');
    try {
      const usernameQuery = query(collection(db, 'users'), where('usernameLower', '==', clean));
      const snapshot = await getDocs(usernameQuery);
      if (!snapshot.empty) {
        setUsernameStatus('❌ Username already taken.');
        return false;
      }
      setUsernameStatus('✓ Username is available.');
      return true;
    } catch (error) {
      console.log('Username check error:', error);
      setUsernameStatus('Could not check username.');
      return false;
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    const validation = validateUsername(username);
    if (validation) {
      Alert.alert('Username', validation);
      return;
    }
    setLoading(true);
    try {
      const cleanUsername = normalizeUsername(username);
      const available = await checkUsername();
      if (!available) {
        setLoading(false);
        return;
      }
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = credential.user;
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email || '',
          username: `@${cleanUsername}`,
          usernameLower: cleanUsername,
          online: true,
          createdAt: new Date()
        }, { merge: true });
      } catch (profileError) {
        try { await deleteUser(user); } catch (deleteError) { console.log('Cleanup error:', deleteError); }
        throw profileError;
      }
      Alert.alert('Welcome to Nax! 🎉', `Your username is @${cleanUsername}`);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (error) => {
    console.log('Authentication error:', error);
    let message = error?.message || 'Something went wrong.';
    if (error?.code === 'auth/email-already-in-use') message = 'This email is already registered.';
    if (error?.code === 'auth/invalid-email') message = 'Please enter a valid email address.';
    if (error?.code === 'auth/weak-password') message = 'Password should be at least 6 characters.';
    if (error?.code === 'auth/invalid-credential') message = 'Invalid email or password.';
    Alert.alert('Oops!', message);
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setUsername('');
    setUsernameStatus('');
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: textMain }]}>Nax Chat</Text>
      <Text style={[styles.subtitle, { color: textSub }]}>
        {isLogin ? 'Welcome back! Sign in to continue.' : 'Create your Nax identity and get started.'}
      </Text>

      {/* यहाँ हमारी LoginForm या RegisterForm फाइल अपने आप कॉल हो जाएगी */}
      {isLogin ? (
        <LoginForm 
          email={email} setEmail={setEmail}
          password={password} setPassword={setPassword}
          handleLogin={handleLogin} loading={loading}
          inputBg={inputBg} textMain={textMain} textSub={textSub}
        />
      ) : (
        <RegisterForm 
          email={email} setEmail={setEmail}
          password={password} setPassword={setPassword}
          username={username} setUsername={setUsername}
          usernameStatus={usernameStatus} setUsernameStatus={setUsernameStatus}
          checkUsername={checkUsername} checkingUsername={checkingUsername}
          handleRegister={handleRegister} loading={loading}
          inputBg={inputBg} textMain={textMain} textSub={textSub}
          normalizeUsername={normalizeUsername}
        />
      )}

      {/* यहाँ हमारा Google Login का बटन आ गया */}
      <GoogleLoginButton textMain={textMain} disabled={loading} />

      <TouchableOpacity onPress={switchMode} style={styles.switchBtn}>
        <Text style={[styles.switchText, { color: textSub }]}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>{isLogin ? 'Sign Up' : 'Login'}</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 25 },
  title: { fontSize: 36, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, marginBottom: 32, textAlign: 'center' },
  switchBtn: { marginTop: 30, alignItems: 'center' },
  switchText: { fontSize: 14 }
});
