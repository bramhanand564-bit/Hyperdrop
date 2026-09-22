import React from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LoginForm({ 
  email, setEmail, 
  password, setPassword, 
  handleLogin, loading, 
  inputBg, textMain, textSub 
}) {
  return (
    <View>
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

      <TouchableOpacity style={styles.mainBtn} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.mainBtnText}>Login</Text>
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
