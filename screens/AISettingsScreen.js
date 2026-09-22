import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AIService from '../ai/AIService';
import { AI_CONNECTION_TYPES, AIConnectionRegistry } from '../ai/AIProviderRegistry';

function maskKey(key = '') {
  if (!key) return 'Not set';
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

export default function AISettingsScreen({ navigation }) {
  const { isDark } = useTheme();
  const [connections, setConnections] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [type, setType] = useState(AI_CONNECTION_TYPES.OPENAI_COMPATIBLE);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [modelsText, setModelsText] = useState('');

  const bg = isDark ? '#050A10' : '#F3F7FA';
  const card = isDark ? '#101A26' : '#FFFFFF';
  const text = isDark ? '#F4F7FA' : '#142532';
  const sub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';
  const green = '#34C759';
  const purple = '#AF52DE';

  const preset = useMemo(() => AIConnectionRegistry.getPreset(type), [type]);

  const load = async () => {
    setLoading(true);
    try {
      const result = await AIService.listConnections();
      setConnections(result.connections || []);
      setActiveId(result.activeConnectionId || result.connections?.[0]?.id || null);
    } catch (error) {
      Alert.alert('AI Settings', error?.message || 'Unable to load AI connections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setType(AI_CONNECTION_TYPES.OPENAI_COMPATIBLE);
    setName('');
    setBaseUrl('https://api.openai.com/v1');
    setApiKey('');
    setModel('');
    setModelsText('');
  };

  const selectType = nextType => {
    setType(nextType);
    const nextPreset = AIConnectionRegistry.getPreset(nextType);
    setBaseUrl(nextPreset.baseUrl);
    if (!name) setName(nextPreset.label);
  };

  const save = async () => {
    try {
      const saved = await AIService.saveConnection({
        id: editingId || undefined,
        name,
        type,
        baseUrl,
        apiKey,
        model,
        models: modelsText,
      });
      await AIService.setActiveConnection(saved.id);
      resetForm();
      await load();
      Alert.alert('Connected', `${saved.name} is ready. Model: ${saved.model}`);
    } catch (error) {
      Alert.alert('Connection Error', error?.message || 'Could not save connection.');
    }
  };

  const edit = async connection => {
    const detailed = await (async () => {
      const all = await AIService.listConnections();
      return all.connections.find(item => item.id === connection.id) || connection;
    })();
    const full = await import('../ai/AISettingsService');
    const secretConnection = await full.default.getConnection(connection.id, { includeSecret: true });
    setEditingId(connection.id);
    setType(secretConnection.type);
    setName(secretConnection.name);
    setBaseUrl(secretConnection.baseUrl);
    setApiKey(secretConnection.apiKey || '');
    setModel(secretConnection.model || '');
    setModelsText((secretConnection.models || []).join(', '));
  };

  const test = async id => {
    setTestingId(id);
    try {
      const reply = await AIService.testConnection(id);
      Alert.alert('Connection OK', reply || 'Provider responded successfully.');
    } catch (error) {
      Alert.alert('Test Failed', error?.message || 'AI provider did not respond.');
    } finally {
      setTestingId(null);
    }
  };

  const remove = connection => {
    Alert.alert('Remove connection?', connection.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await AIService.deleteConnection(connection.id);
          await load();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.center}><ActivityIndicator size="large" color={blue} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { backgroundColor: card, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.icon}>
          <Ionicons name="chevron-back" size={28} color={text} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: text }]}>AI & Models</Text>
          <Text style={[styles.subtitle, { color: sub }]}>One connection • many models • local or cloud</Text>
        </View>
        <View style={styles.icon} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.infoCard, { backgroundColor: card, borderColor: border }]}>
          <Ionicons name="git-network-outline" size={26} color={purple} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.infoTitle, { color: text }]}>Universal AI connection</Text>
            <Text style={[styles.infoText, { color: sub }]}>
              Connect multiple providers, or one OpenAI-compatible API with a list of models. Bots and Studio use the active connection.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('OnDeviceAISettings')}
          style={[styles.offlineCard, { backgroundColor: card, borderColor: purple + '55' }]}
        >
          <View style={[styles.providerIcon, { backgroundColor: purple + '18' }]}>
            <Ionicons name="phone-portrait-outline" size={22} color={purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.connectionName, { color: text }]}>📱 Offline AI / On-Device</Text>
            <Text style={[styles.connectionMeta, { color: sub }]}>Scan RAM + storage + CPU, then download a GGUF model that fits this phone.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={purple} />
        </TouchableOpacity>

        <Text style={[styles.section, { color: sub }]}>CONNECTED MODELS</Text>

        {connections.map(connection => {
          const active = activeId === connection.id;
          return (
            <View key={connection.id} style={[styles.connection, { backgroundColor: card, borderColor: active ? blue : border }]}>
              <TouchableOpacity
                style={styles.connectionMain}
                onPress={async () => {
                  await AIService.setActiveConnection(connection.id);
                  setActiveId(connection.id);
                  Alert.alert('Active AI', `${connection.name} • ${connection.model}`);
                }}
              >
                <View style={[styles.providerIcon, { backgroundColor: active ? `${blue}20` : `${purple}18` }]}>
                  <Ionicons name={connection.type === 'local-http' ? 'phone-portrait-outline' : 'sparkles'} size={22} color={active ? blue : purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.connectionName, { color: text }]}>{connection.name}</Text>
                  <Text style={[styles.connectionMeta, { color: sub }]} numberOfLines={1}>
                    {connection.type} • {connection.models?.length || 1} model(s) • {connection.model}
                  </Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={24} color={green} /> : <Ionicons name="ellipse-outline" size={24} color={sub} />}
              </TouchableOpacity>
              <View style={styles.connectionActions}>
                <TouchableOpacity onPress={() => test(connection.id)} style={styles.smallBtn}>
                  {testingId === connection.id ? <ActivityIndicator size="small" color={blue} /> : <Text style={[styles.smallBtnText, { color: blue }]}>Test</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => edit(connection)} style={styles.smallBtn}>
                  <Text style={[styles.smallBtnText, { color: text }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(connection)} style={styles.smallBtn}>
                  <Text style={[styles.smallBtnText, { color: '#FF3B30' }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <Text style={[styles.section, { color: sub }]}>ADD / EDIT CONNECTION</Text>

        <View style={[styles.form, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.label, { color: sub }]}>TYPE</Text>
          <View style={styles.typeRow}>
            {AIConnectionRegistry.presets.map(item => (
              <TouchableOpacity
                key={item.type}
                onPress={() => selectType(item.type)}
                style={[styles.typePill, { borderColor: type === item.type ? purple : border, backgroundColor: type === item.type ? `${purple}20` : 'transparent' }]}
              >
                <Text style={{ color: type === item.type ? purple : text, fontSize: 12, fontWeight: '700' }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.helper, { color: sub }]}>{preset.description}</Text>

          <Text style={[styles.label, { color: sub }]}>CONNECTION NAME</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. My AI" placeholderTextColor={sub} style={[styles.input, { color: text, borderColor: border, backgroundColor: bg }]} />

          <Text style={[styles.label, { color: sub }]}>BASE URL</Text>
          <TextInput value={baseUrl} onChangeText={setBaseUrl} autoCapitalize="none" keyboardType="url" placeholder={preset.baseUrl} placeholderTextColor={sub} style={[styles.input, { color: text, borderColor: border, backgroundColor: bg }]} />

          <Text style={[styles.label, { color: sub }]}>API KEY</Text>
          <TextInput value={apiKey} onChangeText={setApiKey} autoCapitalize="none" secureTextEntry placeholder={type === AI_CONNECTION_TYPES.LOCAL_HTTP ? 'Optional' : 'Paste API key'} placeholderTextColor={sub} style={[styles.input, { color: text, borderColor: border, backgroundColor: bg }]} />

          <Text style={[styles.label, { color: sub }]}>PRIMARY MODEL</Text>
          <TextInput value={model} onChangeText={setModel} autoCapitalize="none" placeholder="e.g. llama-3.2-1b-instruct" placeholderTextColor={sub} style={[styles.input, { color: text, borderColor: border, backgroundColor: bg }]} />

          <Text style={[styles.label, { color: sub }]}>OTHER MODELS (comma separated)</Text>
          <TextInput value={modelsText} onChangeText={setModelsText} autoCapitalize="none" placeholder="model-a, model-b, model-c" placeholderTextColor={sub} style={[styles.input, { color: text, borderColor: border, backgroundColor: bg }]} />

          {type === AI_CONNECTION_TYPES.LOCAL_HTTP && (
            <View style={[styles.localNote, { backgroundColor: `${green}12`, borderColor: `${green}30` }]}>
              <Ionicons name="hardware-chip-outline" size={20} color={green} />
              <Text style={[styles.helper, { color: text, flex: 1, marginLeft: 8 }]}>
                Local/open-source mode is model-agnostic. Use a local OpenAI-compatible server (for example Ollama or llama.cpp) and choose a small model that fits the phone.
              </Text>
            </View>
          )}

          <TouchableOpacity onPress={save} style={[styles.saveBtn, { backgroundColor: purple }]}>
            <Ionicons name="link" size={19} color="#FFF" />
            <Text style={styles.saveText}>{editingId ? 'Update Connection' : 'Connect API'}</Text>
          </TouchableOpacity>

          {editingId ? (
            <TouchableOpacity onPress={resetForm} style={styles.cancelBtn}>
              <Text style={{ color: sub, fontWeight: '700' }}>Cancel Edit</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.securityNote, { backgroundColor: card, borderColor: border }]}>
          <Ionicons name="lock-closed-outline" size={20} color={green} />
          <Text style={[styles.helper, { color: sub, flex: 1, marginLeft: 8 }]}>
            API keys are kept on this device using secure storage; connection metadata is stored locally. Reconnect on another device.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1 },
  icon: { width: 44, alignItems: 'center' },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 11, marginTop: 2 },
  scroll: { padding: 20, paddingBottom: 60 },
  infoCard: { flexDirection: 'row', padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 24 },
  infoTitle: { fontSize: 16, fontWeight: '800', marginBottom: 5 },
  infoText: { fontSize: 13, lineHeight: 19 },
  section: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 10 },
  connection: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
  offlineCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 22, flexDirection: 'row', alignItems: 'center' },
  connectionMain: { flexDirection: 'row', alignItems: 'center' },
  providerIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  connectionName: { fontSize: 15, fontWeight: '800' },
  connectionMeta: { fontSize: 11, marginTop: 3 },
  connectionActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 7, marginLeft: 4 },
  smallBtnText: { fontSize: 12, fontWeight: '800' },
  form: { padding: 16, borderRadius: 18, borderWidth: 1 },
  label: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, marginBottom: 7, marginTop: 8 },
  helper: { fontSize: 12, lineHeight: 18 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePill: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginBottom: 3 },
  localNote: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 14 },
  saveBtn: { height: 50, borderRadius: 14, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  securityNote: { flexDirection: 'row', padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 18, alignItems: 'flex-start' },
});
