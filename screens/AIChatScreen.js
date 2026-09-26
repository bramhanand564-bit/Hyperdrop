import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AIService from '../ai/AIService';
import AISettingsService from '../ai/AISettingsService';
import { AI_CONNECTION_TYPES } from '../ai/AIProviderRegistry';

function modelLabel(value) {
  if (typeof value !== 'string') return String(value || '');
  try {
    const parsed = JSON.parse(value);
    return parsed?.name || parsed?.family || value;
  } catch (_) {
    return value;
  }
}

function modelValue(value) {
  return typeof value === 'string' ? value : String(value || '');
}

export default function AIChatScreen({ route, navigation }) {
  const { theme } = useTheme();
  const initialConnectionId = route?.params?.connectionId || null;
  const initialModel = route?.params?.model || null;
  const [connections, setConnections] = useState([]);
  const [connectionId, setConnectionId] = useState(initialConnectionId);
  const [model, setModel] = useState(initialModel);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const connection = useMemo(
    () => connections.find(item => item.id === connectionId) || connections[0] || null,
    [connections, connectionId]
  );
  const models = useMemo(() => {
    const list = connection?.models?.length ? connection.models : (connection?.model ? [connection.model] : []);
    return Array.from(new Set(list.map(modelValue).filter(Boolean)));
  }, [connection]);

  const load = async () => {
    setLoading(true);
    try {
      const result = await AISettingsService.listConnections();
      const next = result.connections || [];
      setConnections(next);
      const active = next.find(item => item.id === initialConnectionId)
        || next.find(item => item.id === result.activeConnectionId)
        || next[0];
      if (active) {
        setConnectionId(active.id);
        const available = active.models?.length ? active.models : [active.model];
        setModel(initialModel && available.includes(initialModel) ? initialModel : available[0]);
      }
    } catch (error) {
      Alert.alert('AI Chat', error?.message || 'Could not load AI connections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!model && models[0]) setModel(models[0]);
    if (model && !models.includes(model) && models[0]) setModel(models[0]);
  }, [models]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy || !connection || !model) return;
    const userMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setBusy(true);
    try {
      const reply = await AIService.generateText({
        connectionId: connection.id,
        model,
        messages: nextMessages,
        systemPrompt: 'You are Nax AI. Answer naturally and helpfully. Keep answers concise unless the user asks for detail.',
        temperature: 0.35,
        maxTokens: 700,
      });
      setMessages(current => [...current, { role: 'assistant', content: String(reply || 'No response.') }]);
    } catch (error) {
      setMessages(current => current.slice(0, -1));
      setInput(text);
      Alert.alert('AI Chat', error?.message || 'The selected model could not generate a response.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}><View style={styles.center}><ActivityIndicator size="large" color={theme.blue} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="chevron-back" size={27} color={theme.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>AI Chat</Text>
            <Text style={[styles.sub, { color: theme.sub }]} numberOfLines={1}>{connection?.name || 'No connection'} · {modelLabel(model)}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.section, { color: theme.sub }]}>CONNECTION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {connections.map(item => (
              <TouchableOpacity key={item.id} onPress={() => {
                setConnectionId(item.id);
                const nextModels = item.models?.length ? item.models : [item.model];
                setModel(nextModels[0]);
              }} style={[styles.pill, { borderColor: connection?.id === item.id ? theme.blue : theme.border, backgroundColor: connection?.id === item.id ? theme.blue : theme.surface }]}>
                <Text style={{ color: connection?.id === item.id ? '#FFF' : theme.text, fontWeight: '800', fontSize: 11 }}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.section, { color: theme.sub, marginTop: 16 }]}>MODEL</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {models.map(item => (
              <TouchableOpacity key={item} onPress={() => setModel(item)} style={[styles.pill, { borderColor: model === item ? theme.purple : theme.border, backgroundColor: model === item ? theme.purple : theme.surface }]}>
                <Text style={{ color: model === item ? '#FFF' : theme.text, fontWeight: '800', fontSize: 11 }}>{modelLabel(item)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {!messages.length ? (
            <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="chatbubbles-outline" size={30} color={theme.blue} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Talk to the selected model</Text>
              <Text style={[styles.emptyText, { color: theme.sub }]}>The exact model selected above receives this conversation. This works with Gemini, OpenAI-compatible APIs, Local HTTP and downloaded Offline AI models.</Text>
            </View>
          ) : null}

          {messages.map((item, index) => (
            <View key={index} style={[styles.message, { alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: item.role === 'user' ? theme.blue : theme.surface, borderColor: item.role === 'user' ? theme.blue : theme.border }]}>
              <Text style={{ color: item.role === 'user' ? '#FFF' : theme.text, fontSize: 13, lineHeight: 20 }}>{item.content}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.composer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message this model…"
            placeholderTextColor={theme.sub}
            multiline
            style={[styles.input, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
          />
          <TouchableOpacity disabled={busy || !input.trim() || !connection || !model} onPress={send} style={[styles.send, { backgroundColor: theme.blue, opacity: busy || !input.trim() ? 0.5 : 1 }]}>
            {busy ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="arrow-up" size={20} color="#FFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '900' },
  sub: { fontSize: 10, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 28 },
  section: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  pill: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 8 },
  empty: { borderWidth: 1, borderRadius: 18, padding: 18, marginTop: 20, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '900', marginTop: 8 },
  emptyText: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  message: { maxWidth: '88%', borderWidth: 1, borderRadius: 16, padding: 11, marginTop: 10 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 46, maxHeight: 120, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 10, fontSize: 13 },
  send: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
