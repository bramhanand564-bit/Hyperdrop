import React from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterForm({
  email, setEmail,
  password, setPassword,
  username, setUsername,
  usernameStatus, setUsernameStatus,
  checkUsername, checkingUsername,
  handleRegister, loading,
  inputBg, textMain, textSub, normalizeUsername
}) {
  return (
    <View>
      {/* Username Input */}
      <View style={[styles.inputContainer, { backgroundColor: inputBg }]}>
        <Ionicons name="at-outline" size={20} color={textSub} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: textMain }]}
          placeholder="Choose username"
          placeholderTextColor={textSub}
          value={username}
          onChangeText={(value) => {
            const clean = normalizeUsername(value);
            setUsername(clean);
            setUsernameStatus('');
          }}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
      </View>

      {/* Username Check Button */}
      <View style={styles.usernameRow}>
        <Text style={[styles.usernameHint, { color: textSub }]}>3–20 characters: letters, numbers, _</Text>
        <TouchableOpacity onPress={checkUsername} disabled={checkingUsername} style={styles.checkButton}>
          {checkingUsername ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.checkText}>Check</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Username Status Message */}
      {!!usernameStatus && (
        <Text style={[styles.usernameStatus, { color: usernameStatus.startsWith('✓') ? '#22C55E' : '#FF4D4F' }]}>
          {usernameStatus}
        </Text>
      )}

      {/* Email Input */}
      <View style={[styles.inputContainer, { backgroundColor: inputBg }]}>
        <Ionicons name="mail-outline" size={20} color={textSub} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: textMain }]}
          placeholder="Email address"
          placeholderTextColor={textSub}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
      </View>

      {/* Password Input */}
      <View style={[styles.inputContainer, { backgroundColor: inputBg }]}>
        <Ionicons name="lock-closed-outline" size={20} color={textSub} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: textMain }]}
          placeholder="Password"
          placeholderTextColor={textSub}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      {/* Create Account Button */}
      <TouchableOpacity style={styles.mainBtn} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.mainBtnText}>Create Account</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.1)'
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16 },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -7,
    marginBottom: 10
  },
  usernameHint: { fontSize: 12, flex: 1 },
  checkButton: { paddingHorizontal: 12, paddingVertical: 6 },
  checkText: { color: '#007AFF', fontWeight: 'bold', fontSize: 14 },
  usernameStatus: { fontSize: 13, marginTop: -3, marginBottom: 10, fontWeight: '600' },
  mainBtn: {
    backgroundColor: '#007AFF',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5
  },
  mainBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});
