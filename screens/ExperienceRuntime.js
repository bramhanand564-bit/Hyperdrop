import React, { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ExperienceAPI from '../api/ExperienceAPI';

export default function ExperienceRuntime({ route, navigation }) {
  const { theme } = useTheme();
  const [experience, setExperience] = useState(null);
  const [state, setState] = useState({});
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const item = await ExperienceAPI.get(route?.params?.experienceId);
        if (mounted) {
          setExperience(item);
          if (item) await ExperienceAPI.run(item.id);
        }
      } catch (e) {
        Alert.alert('Experience', e.message || 'Unable to open experience.');
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => { mounted = false; };
  }, [route?.params?.experienceId]);

  const actions = useMemo(() => experience?.schema?.actions || [], [experience]);
  const fields = useMemo(() => experience?.schema?.fields || [], [experience]);

  const press = async action => {
    const key = String(action.label || action.id || 'action').toLowerCase().replace(/\s+/g, '_');
    setState(prev => ({ ...prev, lastAction: action.label, status: key }));
    if (key === 'join' || key === 'accept') {
      try { await ExperienceAPI.join(experience.id); } catch (_) {}
    }
    if (key === 'complete') {
      Alert.alert('Completed', `You completed ${experience.name}.`);
    }
  };

  if (busy) {
    return <View style={[styles.center, { backgroundColor: theme.bg }]}><Text style={{ color: theme.sub }}>Loading experience…</Text></View>;
  }

  if (!experience) {
    return <View style={[styles.center, { backgroundColor: theme.bg }]}><Text style={{ color: theme.text }}>Experience not found.</Text></View>;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color={theme.text} /></TouchableOpacity>
          <Text style={[styles.topTitle, { color: theme.text }]}>Experience</Text>
          <TouchableOpacity onPress={() => Alert.alert('Share', `Share this experience from Chat: experience://${experience.id}`)}><Ionicons name="share-outline" size={22} color={theme.text} /></TouchableOpacity>
        </View>

        <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.icon}>{experience.icon}</Text>
          <Text style={[styles.name, { color: theme.text }]}>{experience.name}</Text>
          <Text style={[styles.desc, { color: theme.sub }]}>{experience.description}</Text>
          <Text style={[styles.meta, { color: theme.sub }]}>
            {experience.users} participants · {experience.runs} runs
          </Text>
        </View>

        <View style={[styles.status, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statusTitle, { color: theme.text }]}>Your session</Text>
          <Text style={[styles.statusText, { color: theme.sub }]}>
            {state.lastAction ? `Last action: ${state.lastAction}` : 'Ready to start'}
          </Text>
        </View>

        {fields.length ? (
          <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.boxTitle, { color: theme.text }]}>Data</Text>
            {fields.map(field => (
              <View key={field.id} style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.sub }]}>{field.label}</Text>
                <Text style={[styles.rowValue, { color: theme.text }]}>{state[field.id] || '—'}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actionGrid}>
          {actions.map(action => (
            <TouchableOpacity key={action.id} onPress={() => press(action)} style={[styles.action, { backgroundColor: theme.blue }]}>
              <Text style={styles.actionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.info, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>Share in Chat</Text>
          <Text style={[styles.infoText, { color: theme.sub }]}>
            This experience has a stable ID. Chat integration can render the same state as a compact interactive card.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 18, paddingBottom: 50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  topTitle: { fontSize: 18, fontWeight: '900' },
  hero: { borderWidth: 1, borderRadius: 24, padding: 20, alignItems: 'center' },
  icon: { fontSize: 45 },
  name: { fontSize: 23, fontWeight: '900', marginTop: 8, textAlign: 'center' },
  desc: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 4 },
  meta: { fontSize: 11, marginTop: 10, fontWeight: '700' },
  status: { borderWidth: 1, borderRadius: 18, padding: 15, marginTop: 12 },
  statusTitle: { fontSize: 14, fontWeight: '900' },
  statusText: { fontSize: 12, marginTop: 4 },
  box: { borderWidth: 1, borderRadius: 18, padding: 15, marginTop: 12 },
  boxTitle: { fontSize: 14, fontWeight: '900', marginBottom: 7 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  rowLabel: { fontSize: 12 },
  rowValue: { fontSize: 12, fontWeight: '800' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 16 },
  action: { minWidth: '30%', paddingHorizontal: 14, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  info: { borderWidth: 1, borderRadius: 18, padding: 15, marginTop: 18 },
  infoTitle: { fontSize: 14, fontWeight: '900' },
  infoText: { fontSize: 12, lineHeight: 18, marginTop: 5 },
});
