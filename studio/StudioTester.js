import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  TextInput,
  Alert,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function StudioTester({ route, navigation }) {
  const { isDark } = useTheme();

  // Retrieve the generated config passed from Preview
  const { appConfig } = route.params || {};

  // Store local state for test inputs
  const [testInputs, setTestInputs] = useState({});

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const testBg = isDark ? '#101A26' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';
  const purple = '#AF52DE'; 
  const warning = '#FF9500'; // For Test Mode Badge

  if (!appConfig) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: textMain }}>No App Configuration to test.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: blue }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- MOCK ACTION HANDLER ---
  const handleTestButton = (btnConfig) => {
    Alert.alert(
      "Test Mode", 
      `Button clicked!\nAction bound: ${btnConfig.action || 'None'}\n\nThis is just a sandbox test. In the real published app, this will execute its logic.`
    );
  };

  // --- INTERACTIVE UI RENDERER ---
  const renderInteractiveComponent = (comp, index) => {
    switch (comp.type) {
      case 'header':
        return <Text key={index} style={[styles.compHeader, { color: textMain }]}>{comp.text}</Text>;
      
      case 'text':
        return <Text key={index} style={[styles.compText, { color: textSub }]}>{comp.text}</Text>;
      
      case 'input':
        return (
          <TextInput 
            key={index} 
            style={[styles.compInput, { borderColor: border, color: textMain, backgroundColor: isDark ? '#14202E' : '#EEF3F7' }]} 
            placeholder={comp.placeholder || 'Type here to test...'} 
            placeholderTextColor={textSub}
            value={testInputs[`input_${index}`] || ''}
            onChangeText={(text) => setTestInputs({ ...testInputs, [`input_${index}`]: text })}
            editable={true} // Enabled in tester!
          />
        );
      
      case 'button':
        return (
          <TouchableOpacity 
            key={index} 
            style={[styles.compButton, { backgroundColor: appConfig.color || blue }]}
            activeOpacity={0.8}
            onPress={() => handleTestButton(comp)}
          >
            <Text style={styles.compButtonText}>{comp.label || 'Submit'}</Text>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER WITH TEST BADGE */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color={textMain} />
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <Text style={[styles.headerTitle, { color: textMain }]}>{appConfig.name}</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setTestInputs({})}>
          <Ionicons name="refresh" size={22} color={textMain} />
        </TouchableOpacity>
      </View>

      <View style={[styles.testBadgeBar, { backgroundColor: warning }]}>
        <Ionicons name="construct" size={16} color="#000" style={{ marginRight: 6 }} />
        <Text style={styles.testBadgeText}>SANDBOX TEST MODE</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={[styles.appFrame, { backgroundColor: testBg, borderColor: border }]}>
            {/* Render the interactive components */}
            {appConfig.components && appConfig.components.length > 0 ? (
              appConfig.components.map((comp, index) => renderInteractiveComponent(comp, index))
            ) : (
              <Text style={{ color: textSub, textAlign: 'center' }}>No components to test.</Text>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* FOOTER ACTIONS */}
      <View style={[styles.bottomBar, { backgroundColor: headerBg, borderTopColor: border }]}>
        <Text style={[styles.statusText, { color: textSub }]}>App is working properly?</Text>
        <TouchableOpacity 
          style={[styles.publishBtn, { backgroundColor: purple }]}
          onPress={() => navigation.navigate('StudioPublisher', { appConfig })}
        >
          <Text style={styles.publishBtnText}>Yes, Proceed to Publish</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 10, 
    paddingTop: Platform.OS === 'ios' ? 10 : 15, 
    paddingBottom: 15, 
    borderBottomWidth: 1 
  },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  titleBox: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  
  testBadgeBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  testBadgeText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  scrollContent: { padding: 20, paddingBottom: 40 },
  
  appFrame: { 
    minHeight: '100%', 
    borderRadius: 24, 
    borderWidth: 1, 
    padding: 20,
    paddingTop: 30
  },

  // Dynamic Component Styles (Interactive)
  compHeader: { fontSize: 24, fontWeight: '900', marginBottom: 15 },
  compText: { fontSize: 15, lineHeight: 22, marginBottom: 15 },
  compInput: { height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, fontSize: 16, marginBottom: 15 },
  compButton: { height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 15 },
  compButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  bottomBar: { padding: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 15, borderTopWidth: 1, alignItems: 'center' },
  statusText: { fontSize: 13, marginBottom: 10, fontWeight: '500' },
  publishBtn: { 
    flexDirection: 'row', 
    width: '100%', 
    height: 54, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  publishBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});
