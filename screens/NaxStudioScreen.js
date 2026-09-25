import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, 
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// 🧩 AI Engine Components (Jo humne pichle step me banaye the)
import LocalEngineSettings from '../components/studio/LocalEngineSettings';
import CloudApiSettings from '../components/studio/CloudApiSettings';

// 🔥 REAL FIREBASE IMPORTS
import { db, auth } from '../firebaseConfig';
import OnDeviceAIService from '../ai/on-device/OnDeviceAIService';
import { SEED_MODELS } from '../ai/on-device/OnDeviceModelCatalog';
import AIService from '../ai/AIService';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function NaxStudioScreen({ navigation }) {
  const { isDark } = useTheme();
  const user = auth.currentUser;

  // 🤖 Bot Details States
  const [botName, setBotName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(''); // Personality of the AI Bot
  const [loading, setLoading] = useState(false);

  // 🧠 AI Engine States (Local vs API)
  const [aiMode, setAiMode] = useState('local'); 
  
  // Local Settings
  const [selectedLocalModel, setSelectedLocalModel] = useState(SEED_MODELS[0].id);
  const [downloadedModels, setDownloadedModels] = useState([]);

  useEffect(() => {
    let mounted = true;
    Promise.all(SEED_MODELS.map(async model => ((await OnDeviceAIService.isInstalled(model).catch(() => false)) ? model.id : null)))
      .then(ids => { if (mounted) setDownloadedModels(ids.filter(Boolean)); });
    return () => { mounted = false; };
  }, []);

  // API/Cloud Settings
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('');

  // UI Colors (Futuristic & Glassy)
  const bg = isDark ? '#0A0A0C' : '#F2F2F7';
  const textMain = isDark ? '#F5F5F7' : '#1C1C1E';
  const textSub = isDark ? '#8E8E93' : '#6C6C70';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.85)';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)';
  const inputBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const buttonBg = isDark ? '#FFFFFF' : '#1C1C1E';
  const buttonText = isDark ? '#000000' : '#FFFFFF';

  // 🔥 Handlers for In-App Download (Props for LocalEngineSettings)
  const handleDownloadModel = async (model) => {
    if (!model?.id) return;
    try {
      setLoading(true);
      await OnDeviceAIService.downloadModel(model);
      setDownloadedModels(prev => [...new Set([...prev, model.id])]);
      Alert.alert('Ready', `${model.name} is downloaded for offline AI.`);
    } catch (error) {
      Alert.alert('Download failed', error?.message || 'Could not download the model.');
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteModel = async (model) => {
    if (!model?.id) return;
    try {
      await OnDeviceAIService.removeModel(model);
      setDownloadedModels(prev => prev.filter(m => m !== model.id));
    } catch (error) {
      Alert.alert('Remove failed', error?.message || 'Could not remove the model.');
    }
  };

  // 🔥 100% REAL BOT PUBLISHING LOGIC
  const handlePublishBot = async () => {
    if (!botName.trim() || !systemPrompt.trim()) {
      Alert.alert("Incomplete", "Bot Name और Personality (System Prompt) डालना ज़रूरी है।");
      return;
    }

    if (aiMode === 'api' && selectedProvider !== 'custom' && !apiKey.trim()) {
      Alert.alert("API Key Required", "Cloud बॉट के लिए API Key डालें।");
      return;
    }

    if (aiMode === 'local' && !downloadedModels.includes(selectedLocalModel)) {
      Alert.alert("Model Not Ready", "पहले Local Model डाउनलोड करें।");
      return;
    }

    setLoading(true);
    try {
      let aiConnectionId = null;
      if (aiMode === 'local') {
        const selectedModel = SEED_MODELS.find(model => model.id === selectedLocalModel);
        if (!selectedModel) throw new Error('Selected offline model is unavailable.');
        const connection = await AIService.saveConnection({
          name: `Nax Offline • ${botName.trim()}`,
          type: 'on-device',
          baseUrl: 'on-device://',
          model: JSON.stringify(selectedModel),
          models: [JSON.stringify(selectedModel)],
        });
        aiConnectionId = connection.id;
      }
      // 🚀 Save Real AI Agent Configuration to Firebase
      await addDoc(collection(db, 'custom_bots'), {
        botName: botName,
        creatorId: user?.uid,
        creatorName: user?.displayName || 'Unknown',
        systemPrompt: systemPrompt, // <-- Asli AI logic yahan se chalega
        engine: {
          mode: aiMode,
          provider: aiMode === 'local' ? selectedLocalModel : selectedProvider,
          endpoint: customEndpoint || null,
          // Note: Real apps me API Key ko backend encryption ke saath save karte hain
          aiConnectionId,
          // API secrets stay in local AI settings; never persist raw keys in bot records.
        },
        type: 'ai-agent',
        installs: 0,
        createdAt: serverTimestamp()
      });
      
      Alert.alert("Success! 🎉", `${botName} AI Agent is now live!`);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Sleek Futuristic Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={textMain} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerSubtitle, { color: textSub }]}>AI BUILDER</Text>
          <Text style={[styles.headerTitle, { color: textMain }]}>Nax Studio</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 🎛️ AI ENGINE SELECTOR (Reuse the logic we built) */}
        <Text style={[styles.sectionTitle, { color: textMain }]}>Bot Brain (Engine)</Text>
        <View style={styles.engineToggleRow}>
          <TouchableOpacity style={[styles.toggleBtn, aiMode === 'local' ? { backgroundColor: '#34C759', borderColor: '#34C759' } : { backgroundColor: cardBg, borderColor: cardBorder }]} onPress={() => setAiMode('local')}>
            <Ionicons name="hardware-chip" size={18} color={aiMode === 'local' ? '#FFF' : textSub} />
            <Text style={[styles.toggleText, { color: aiMode === 'local' ? '#FFF' : textMain }]}>Local AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, aiMode === 'api' ? { backgroundColor: '#087EFF', borderColor: '#087EFF' } : { backgroundColor: cardBg, borderColor: cardBorder }]} onPress={() => setAiMode('api')}>
            <Ionicons name="cloud" size={18} color={aiMode === 'api' ? '#FFF' : textSub} />
            <Text style={[styles.toggleText, { color: aiMode === 'api' ? '#FFF' : textMain }]}>Cloud API</Text>
          </TouchableOpacity>
        </View>

        {/* 💻 DYNAMIC SETTINGS COMPONENT */}
        <View style={[styles.settingsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {aiMode === 'local' ? (
            <LocalEngineSettings 
              selectedModel={selectedLocalModel} setSelectedModel={setSelectedLocalModel}
              isDownloaded={downloadedModels.includes(selectedLocalModel)}
              onDownload={handleDownloadModel} onDelete={handleDeleteModel}
            />
          ) : (
            <CloudApiSettings 
              provider={selectedProvider} setProvider={setSelectedProvider}
              apiKey={apiKey} setApiKey={setApiKey}
              customUrl={customEndpoint} setCustomUrl={setCustomEndpoint}
            />
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: cardBorder }]} />

        {/* 📝 AI BOT DETAILS (Replaced old Trigger-Reply with System Prompt) */}
        <Text style={[styles.sectionTitle, { color: textMain }]}>Bot Identity & Rules</Text>
        <Text style={[styles.subText, { color: textSub, marginBottom: 24 }]}>Define how your AI Agent should behave.</Text>

        <Text style={[styles.inputLabel, { color: textMain }]}>Bot Name</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: inputBg, color: textMain, borderColor: cardBorder }]}
          placeholder="e.g. Travel Buddy"
          placeholderTextColor={textSub}
          value={botName}
          onChangeText={setBotName}
        />

        {/* Frosted Logic Box for System Prompt */}
        <View style={[styles.logicBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.logicHeader}>
            <Ionicons name="git-network-outline" size={16} color={textMain} style={{ marginRight: 6 }} />
            <Text style={[styles.logicTitle, { color: textMain }]}>SYSTEM PROMPT (AI PERSONALITY)</Text>
          </View>
          
          <Text style={[styles.inputLabel, { color: textSub, fontSize: 12 }]}>Give instructions to your AI:</Text>
          <TextInput 
            style={[styles.input, styles.textArea, { backgroundColor: inputBg, color: textMain, borderColor: cardBorder }]}
            placeholder="e.g. You are a helpful travel assistant. You only answer questions about flights and hotels. Be polite and concise."
            placeholderTextColor={textSub}
            multiline
            value={systemPrompt}
            onChangeText={setSystemPrompt}
          />
        </View>

        <TouchableOpacity 
          style={[styles.publishBtn, { backgroundColor: loading ? textSub : buttonBg }]} 
          onPress={handlePublishBot} 
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={buttonText} />
          ) : (
            <Text style={[styles.publishBtnText, { color: buttonText }]}>Deploy AI Bot 🚀</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { alignItems: 'center' },
  headerSubtitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  
  sectionTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  subText: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  
  engineToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 20, marginTop: 15 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  toggleText: { fontWeight: '700', marginLeft: 8 },

  settingsCard: { padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  
  divider: { height: 1, marginVertical: 32 },
  
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4, letterSpacing: -0.2 },
  input: { height: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, marginBottom: 20, fontSize: 15, fontWeight: '500' },
  textArea: { height: 120, paddingTop: 16, textAlignVertical: 'top' },
  
  logicBox: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 },
  logicHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logicTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  
  publishBtn: { height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 5 },
  publishBtnText: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }
});
