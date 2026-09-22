import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function CloudApiSettings({ provider, setProvider, apiKey, setApiKey, customUrl, setCustomUrl }) {
  const { isDark } = useTheme();
  
  const textMain = isDark ? '#F5F5F7' : '#1C1C1E';
  const textSub = isDark ? '#8E8E93' : '#6C6C70';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const inputBg = isDark ? 'rgba(0, 0, 0, 0.2)' : '#E5E5EA';

  const providers = ['gemini', 'openai', 'custom'];

  return (
    <View>
      <Text style={[styles.label, { color: textMain }]}>Provider Endpoint</Text>
      <View style={styles.row}>
        {providers.map((p) => (
          <TouchableOpacity 
            key={p} 
            style={[styles.chip, provider === p ? { backgroundColor: 'rgba(8,126,255,0.2)', borderColor: '#087EFF' } : { borderColor: borderCol }]}
            onPress={() => setProvider(p)}
          >
            <Text style={{ color: provider === p ? '#087EFF' : textSub, textTransform: 'capitalize', fontWeight: 'bold' }}>
              {p === 'custom' ? 'Localhost/Custom' : p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {provider === 'custom' && (
        <>
          <Text style={[styles.label, { color: textMain, marginTop: 15 }]}>Custom Base URL (Your PC / Termux)</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: inputBg, color: textMain, borderColor: borderCol }]}
            placeholder="e.g. http://127.0.0.1:11434/v1"
            placeholderTextColor={textSub}
            autoCapitalize="none"
            value={customUrl}
            onChangeText={setCustomUrl}
          />
        </>
      )}

      <Text style={[styles.label, { color: textMain, marginTop: 15 }]}>
        {provider === 'custom' ? 'API Key (Optional)' : 'API Key'}
      </Text>
      <TextInput 
        style={[styles.input, { backgroundColor: inputBg, color: textMain, borderColor: borderCol }]}
        placeholder="Enter your API Key"
        placeholderTextColor={textSub}
        secureTextEntry
        value={apiKey}
        onChangeText={setApiKey}
      />
      <Text style={{ color: textSub, fontSize: 11, marginTop: 5 }}>Keys are processed locally. We never store them.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  input: { borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, fontSize: 15 }
});
