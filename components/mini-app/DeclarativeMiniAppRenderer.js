// ==========================================
// FILE: components/mini-app/DeclarativeMiniAppRenderer.js
// ==========================================
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView, Share } from 'react-native';

export default function DeclarativeMiniAppRenderer({ components, themeColor, isTestMode = false, navigation }) {
  const [inputs, setInputs] = useState({});

  // 🛡️ SAFE ACTION HANDLER (No eval allowed)
  const handleAction = async (action, componentLabel) => {
    if (!action) return;

    if (isTestMode) {
      Alert.alert("Test Mode", `Button '${componentLabel}' clicked!\nAction: ${action}`);
      return;
    }

    if (action === 'alert') {
      Alert.alert("Action", `You clicked: ${componentLabel}`);
    } else if (action === 'continue' || action === 'submit') {
      const values = Object.values(inputs).filter(Boolean);
      Alert.alert("Done", values.length ? `Saved: ${values.join(', ')}` : "Action completed.");
    } else if (action === 'share') {
      await Share.share({ message: `Check out this mini-app: ${componentLabel}` });
    } else if (action === 'add_expense') {
      Alert.alert("Expense", "Expense action completed. Connect a wallet transaction from the host app when payment is required.");
    } else if (action.startsWith('navigate:')) {
      const target = action.slice('navigate:'.length).trim();
      const allowedTargets = new Set(['MainTabs', 'PortalHome', 'MiniAppHome', 'Discover', 'Moments', 'Settings', 'Wallet', 'DeveloperDashboard']);
      if (navigation && allowedTargets.has(target)) navigation.navigate(target);
      else Alert.alert("Navigation", "That destination is not available from this app.");
    } else {
      Alert.alert("Action", `Completed: ${action}`);
    }
  };

  if (!components || !Array.isArray(components)) {
    return <Text style={styles.errorText}>Invalid App Configuration: Components missing.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {components.map((comp, index) => {
        switch (comp.type) {
          case 'header':
            return <Text key={index} style={[styles.header, { color: themeColor || '#FFF' }]}>{comp.text}</Text>;
          
          case 'text':
            return <Text key={index} style={styles.text}>{comp.text}</Text>;
          
          case 'input':
            return (
              <TextInput 
                key={index} 
                style={styles.input} 
                placeholder={comp.placeholder || 'Type here...'} 
                placeholderTextColor="#6C8494"
                value={inputs[`input_${index}`] || ''}
                onChangeText={(text) => setInputs({ ...inputs, [`input_${index}`]: text })}
                editable={true} // If in preview, it might be disabled, but let's keep it simple
              />
            );
          
          case 'button':
            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.button, { backgroundColor: themeColor || '#087EFF' }]}
                activeOpacity={0.8}
                onPress={() => handleAction(comp.action, comp.label)}
              >
                <Text style={styles.buttonText}>{comp.label || 'Submit'}</Text>
              </TouchableOpacity>
            );
            
          default:
            return <Text key={index} style={styles.errorText}>Unsupported component: {comp.type}</Text>;
        }
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 10 },
  header: { fontSize: 24, fontWeight: '900', marginBottom: 15 },
  text: { fontSize: 16, marginBottom: 15, color: '#8FA6B9', lineHeight: 22 },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginBottom: 15, color: '#FFF', fontSize: 16 },
  button: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 5, marginBottom: 15 },
  buttonText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  errorText: { color: '#FF3B30', fontSize: 14, marginBottom: 10, fontStyle: 'italic' }
});
