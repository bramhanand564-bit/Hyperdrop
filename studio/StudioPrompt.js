import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// --- MOCK PROMPT SUGGESTIONS ---
const SUGGESTIONS = [
  "A habit tracker that gives daily streaks",
  "A bot that translates English to Hindi",
  "A classic Tic-Tac-Toe game",
  "A simple daily expense calculator",
  "A bot to summarize long articles"
];

export default function StudioPrompt({ route, navigation }) {
  const { isDark } = useTheme();
  
  // If a prompt was passed from the Home screen templates, set it initially
  const initialPrompt = route?.params?.initialPrompt || '';
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // --- COLORS ---
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const purple = '#AF52DE'; // AI Theme color

  useEffect(() => {
    // Auto-focus the input when screen opens
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  }, []);

  // --- HANDLERS ---
  const handleGenerate = () => {
    if (!prompt.trim()) return;
    Keyboard.dismiss();
    
    // Navigate to Step 3: StudioGenerator to process the prompt
    navigation.navigate('StudioGenerator', { prompt: prompt.trim() });
  };

  const handleSuggestionSelect = (text) => {
    setPrompt(text);
    inputRef.current?.focus();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color={textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textMain }]}>AI Builder</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setPrompt('')}>
          <Text style={{ color: textSub, fontSize: 14, fontWeight: '600' }}>Clear</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={styles.introBox}>
            <View style={[styles.aiIconBox, { backgroundColor: `${purple}20` }]}>
              <Ionicons name="color-wand" size={36} color={purple} />
            </View>
            <Text style={[styles.introTitle, { color: textMain }]}>What do you want to build?</Text>
            <Text style={[styles.introSub, { color: textSub }]}>
              Describe your mini-app or bot in plain English. The more details you provide, the better the result.
            </Text>
          </View>

          {/* INPUT AREA */}
          <View 
            style={[
              styles.inputContainer, 
              { backgroundColor: cardBg, borderColor: isFocused ? purple : border }
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: textMain }]}
              placeholder="E.g., Make a quiz app about space..."
              placeholderTextColor={textSub}
              multiline
              autoFocus
              value={prompt}
              onChangeText={setPrompt}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </View>

          {/* SUGGESTIONS */}
          {prompt.length === 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={[styles.suggestionsTitle, { color: textSub }]}>Try asking for:</Text>
              <View style={styles.chipsWrapper}>
                {SUGGESTIONS.map((sug, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.chip, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => handleSuggestionSelect(sug)}
                  >
                    <Ionicons name="sparkles" size={12} color={purple} style={{ marginRight: 6 }} />
                    <Text style={[styles.chipText, { color: textMain }]}>{sug}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

        </ScrollView>

        {/* BOTTOM GENERATE BUTTON */}
        <View style={[styles.bottomBar, { backgroundColor: headerBg, borderTopColor: border }]}>
          <TouchableOpacity 
            style={[styles.generateBtn, { backgroundColor: prompt.trim() ? purple : textSub, opacity: prompt.trim() ? 1 : 0.5 }]}
            disabled={!prompt.trim()}
            onPress={handleGenerate}
          >
            <Ionicons name="flash" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.generateBtnText}>Generate with AI</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
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
  iconBtn: { width: 50, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  
  scrollContent: { padding: 20 },
  introBox: { alignItems: 'center', marginBottom: 25, marginTop: 10 },
  aiIconBox: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  introTitle: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  introSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
  
  inputContainer: { 
    minHeight: 180, 
    borderRadius: 24, 
    borderWidth: 2, 
    padding: 18,
    marginBottom: 25 
  },
  input: { flex: 1, fontSize: 18, lineHeight: 26, textAlignVertical: 'top' },
  
  suggestionsContainer: { marginTop: 10 },
  suggestionsTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  chipsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '500' },
  
  bottomBar: { padding: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 15, borderTopWidth: 1 },
  generateBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  generateBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' }
});
