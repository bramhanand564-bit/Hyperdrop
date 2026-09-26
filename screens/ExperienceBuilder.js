import React, { useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ExperienceAPI from '../api/ExperienceAPI';

const ACTIONS = ['Accept','Start','Complete','Join','Vote','Submit','Claim','Play','Watch','Upload','Approve','Reject','Share'];
const FIELDS = ['Text','Number','Image','Date','Time','Checkbox','Rating','File'];

const TEMPLATE_DEFAULTS = {
  task: { name: 'Daily Task', icon: '📋', description: 'A task people can accept and complete.', actions: ['Accept','Complete'], fields: ['Text','Date'] },
  reward: { name: 'Reward Challenge', icon: '🎁', description: 'A challenge with points and progress.', actions: ['Start','Complete','Claim'], fields: ['Number','Date'] },
  game: { name: 'Game Challenge', icon: '🎮', description: 'A shareable game challenge.', actions: ['Join','Play','Share'], fields: ['Text','Number'] },
  quiz: { name: 'Quiz', icon: '🧠', description: 'Answer questions and receive a result.', actions: ['Start','Submit','Share'], fields: ['Text','Number'] },
  form: { name: 'Form', icon: '📝', description: 'Collect structured responses.', actions: ['Submit','Share'], fields: ['Text','Checkbox'] },
  community: { name: 'Community Activity', icon: '👥', description: 'A group activity with participation tracking.', actions: ['Join','Vote','Complete'], fields: ['Text','Date'] },
  media: { name: 'Media Experience', icon: '🎬', description: 'A shareable media experience.', actions: ['Watch','Share'], fields: ['Text','Image'] },
  transfer: { name: 'P2P Transfer', icon: '📦', description: 'A peer-to-peer transfer experience.', actions: ['Join','Accept','Complete'], fields: ['File','Number'] },
  custom: { name: 'My Experience', icon: '⚡', description: 'A custom interactive experience.', actions: ['Start','Complete'], fields: ['Text'] },
};

export default function ExperienceBuilder({ route, navigation }) {
  const { theme } = useTheme();
  const template = route?.params?.template || 'custom';
  const defaults = TEMPLATE_DEFAULTS[template] || TEMPLATE_DEFAULTS.custom;
  const [name, setName] = useState(defaults.name);
  const [description, setDescription] = useState(defaults.description);
  const [icon, setIcon] = useState(defaults.icon);
  const [actions, setActions] = useState(defaults.actions);
  const [fields, setFields] = useState(defaults.fields);
  const [publishing, setPublishing] = useState(false);

  const addAction = action => setActions(prev => prev.includes(action) ? prev : [...prev, action]);
  const removeAction = action => setActions(prev => prev.filter(x => x !== action));
  const addField = field => setFields(prev => prev.includes(field) ? prev : [...prev, field]);
  const removeField = field => setFields(prev => prev.filter(x => x !== field));

  const schema = useMemo(() => ({
    fields: fields.map((type, index) => ({ id: `field_${index + 1}`, type, label: type })),
    actions: actions.map((label, index) => ({ id: `action_${index + 1}`, label })),
    rules: actions.map(action => ({
      when: action.toLowerCase(),
      then: [{ op: 'event', name: `${action.toLowerCase()}_pressed` }],
    })),
    ui: ['card','detail','full'].map(layout => ({ layout, version: 1 })),
  }), [actions, fields]);

  const publish = async () => {
    if (!name.trim()) return Alert.alert('Name required', 'Give your experience a name.');
    setPublishing(true);
    try {
      const created = await ExperienceAPI.create({ name, description, icon, template, schema });
      Alert.alert('Published', 'Your experience is live and can be shared from Hyperdrop.', [
        { text: 'Open', onPress: () => navigation.replace('ExperienceRuntime', { experienceId: created.id }) },
      ]);
    } catch (e) {
      Alert.alert('Publish failed', e.message || 'Unable to publish.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color={theme.text} /></TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Create Experience</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={[styles.preview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.previewIcon}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewName, { color: theme.text }]}>{name || 'Untitled'}</Text>
            <Text style={[styles.previewDesc, { color: theme.sub }]} numberOfLines={2}>{description}</Text>
            <View style={styles.chips}>
              {actions.map(a => <View key={a} style={[styles.chip, { backgroundColor: theme.bg }]}><Text style={{ color: theme.text, fontSize: 10, fontWeight: '800' }}>{a}</Text></View>)}
            </View>
          </View>
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Identity</Text>
        <TextInput value={icon} onChangeText={setIcon} maxLength={2} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} placeholder="⚡" />
        <TextInput value={name} onChangeText={setName} maxLength={80} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} placeholder="Experience name" placeholderTextColor={theme.sub} />
        <TextInput value={description} onChangeText={setDescription} multiline maxLength={500} style={[styles.textarea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} placeholder="What can people do?" placeholderTextColor={theme.sub} />

        <Text style={[styles.label, { color: theme.text }]}>Actions</Text>
        <View style={styles.grid}>
          {ACTIONS.map(action => {
            const active = actions.includes(action);
            return (
              <TouchableOpacity key={action} onPress={() => active ? removeAction(action) : addAction(action)} style={[styles.option, { backgroundColor: active ? theme.blue : theme.surface, borderColor: active ? theme.blue : theme.border }]}>
                <Text style={{ color: active ? '#FFF' : theme.text, fontWeight: '800', fontSize: 12 }}>{active ? '✓ ' : '+ '}{action}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Data fields</Text>
        <View style={styles.grid}>
          {FIELDS.map(field => {
            const active = fields.includes(field);
            return (
              <TouchableOpacity key={field} onPress={() => active ? removeField(field) : addField(field)} style={[styles.option, { backgroundColor: active ? theme.blue : theme.surface, borderColor: active ? theme.blue : theme.border }]}>
                <Text style={{ color: active ? '#FFF' : theme.text, fontWeight: '800', fontSize: 12 }}>{active ? '✓ ' : '+ '}{field}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.note, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.noteTitle, { color: theme.text }]}>What this creates</Text>
          <Text style={[styles.noteText, { color: theme.sub }]}>
            A reusable experience definition with data, actions and layouts. The same object can later be opened full-screen or rendered as a compact Chat card.
          </Text>
        </View>

        <TouchableOpacity style={[styles.publish, { backgroundColor: theme.blue, opacity: publishing ? 0.6 : 1 }]} onPress={publish} disabled={publishing}>
          <Text style={styles.publishText}>{publishing ? 'Publishing…' : 'Publish Experience'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 18, paddingBottom: 50 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { fontSize: 19, fontWeight: '900' },
  preview: { borderWidth: 1, borderRadius: 22, padding: 16, flexDirection: 'row', marginBottom: 20 },
  previewIcon: { fontSize: 35, marginRight: 12 },
  previewName: { fontSize: 17, fontWeight: '900' },
  previewDesc: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  chip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  label: { fontSize: 14, fontWeight: '900', marginBottom: 8, marginTop: 12 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, marginBottom: 8, fontSize: 14 },
  textarea: { minHeight: 90, borderWidth: 1, borderRadius: 13, padding: 12, textAlignVertical: 'top', marginBottom: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 12 },
  note: { borderWidth: 1, borderRadius: 17, padding: 14, marginTop: 20 },
  noteTitle: { fontWeight: '900', fontSize: 14 },
  noteText: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  publish: { height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  publishText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
});
