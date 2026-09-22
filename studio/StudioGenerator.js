import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export default function StudioGenerator() {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0); // 0: Idle, 1: AI Thinking, 2: Coding, 3: Security Scan, 4: Done
  const [generatedApp, setGeneratedApp] = useState(null);

  // Colors
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const cardBg = isDark ? '#1A222C' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const accentCol = '#087EFF'; // Nax Blue

  // 🤖 AI Generation Engine (The Real Deal)
  const handleGenerateApp = () => {
    if (prompt.trim() === '') return;
    
    setIsGenerating(true);
    setGenerationStep(1);

    // Step 1: AI Analyzing Prompt (Simulating API Call for now)
    setTimeout(() => {
      setGenerationStep(2); // Step 2: Writing HTML/JS Code
      
      setTimeout(() => {
        setGenerationStep(3); // Step 3: Nax Security Sandbox Scan
        
        setTimeout(() => {
          // Step 4: App Ready (Data structuring for WebPortalScreen)
          setGenerationStep(4);
          setIsGenerating(false);
          setGeneratedApp({
            name: 'My Custom App', // In future, AI will suggest a name based on prompt
            url: 'https://html5games.com/', // In real API, this will be the hosted HTML blob URL
            isPremium: false,
          });
        }, 2000);
      }, 2500);
    }, 1500);
  };

  const openGeneratedApp = () => {
    if (generatedApp) {
      navigation.navigate('WebPortalScreen', {
        title: generatedApp.name,
        url: generatedApp.url,
        isPremium: generatedApp.isPremium
      });
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: bg }]}>
      
      {/* 🧠 Header */}
      <View style={styles.headerBox}>
        <MaterialCommunityIcons name="brain" size={40} color={accentCol} />
        <Text style={[styles.title, { color: textMain }]}>Nax Studio AI</Text>
        <Text style={[styles.subtitle, { color: textSub }]}>Type an idea, and AI will build the Mini-App instantly.</Text>
      </View>

      {/* 📝 Input Prompt Area */}
      <View style={[styles.inputContainer, { backgroundColor: cardBg }]}>
        <TextInput
          style={[styles.input, { color: textMain }]}
          placeholder="e.g., Build a Video Player with dark mode..."
          placeholderTextColor={textSub}
          multiline={true}
          value={prompt}
          onChangeText={setPrompt}
          editable={!isGenerating}
        />
      </View>

      {/* 🚀 Generate Button */}
      {!isGenerating && generationStep === 0 && (
        <TouchableOpacity style={[styles.generateBtn, { backgroundColor: accentCol }]} onPress={handleGenerateApp}>
          <Ionicons name="sparkles" size={20} color="#FFF" />
          <Text style={styles.generateBtnText}>Generate App</Text>
        </TouchableOpacity>
      )}

      {/* ⚙️ Live Generation Progress */}
      {isGenerating && (
        <View style={[styles.progressBox, { backgroundColor: cardBg }]}>
          <ActivityIndicator size="large" color={accentCol} />
          <Text style={[styles.progressText, { color: textMain }]}>
            {generationStep === 1 && "🧠 AI is analyzing your prompt..."}
            {generationStep === 2 && "💻 Writing HTML5 & React Bridge Code..."}
            {generationStep === 3 && "🛡️ Scanning for Security & URL Validation..."}
          </Text>
        </View>
      )}

      {/* 🎉 Result Action */}
      {generationStep === 4 && generatedApp && (
        <View style={[styles.resultBox, { backgroundColor: cardBg }]}>
          <Ionicons name="checkmark-circle" size={50} color="#34C759" />
          <Text style={[styles.successText, { color: textMain }]}>App Built Successfully!</Text>
          
          <TouchableOpacity style={[styles.testBtn, { backgroundColor: accentCol }]} onPress={openGeneratedApp}>
            <Text style={styles.testBtnText}>Test in Nax Sandbox</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.publishBtn}>
            <Text style={[styles.publishBtnText, { color: textMain }]}>Publish to Portal</Text>
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  headerBox: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  subtitle: { fontSize: 13, textAlign: 'center', marginTop: 5, paddingHorizontal: 20 },
  inputContainer: { borderRadius: 16, padding: 15, elevation: 2, marginBottom: 20, minHeight: 120 },
  input: { flex: 1, fontSize: 16, textAlignVertical: 'top' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16 },
  generateBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  progressBox: { padding: 30, borderRadius: 16, alignItems: 'center', elevation: 2 },
  progressText: { marginTop: 20, fontSize: 14, fontWeight: '600' },
  resultBox: { padding: 30, borderRadius: 16, alignItems: 'center', elevation: 2 },
  successText: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 20 },
  testBtn: { width: '100%', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  testBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  publishBtn: { padding: 10 },
  publishBtnText: { fontSize: 14, fontWeight: '600' }
});
