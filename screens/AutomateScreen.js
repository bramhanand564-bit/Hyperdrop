import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../firebaseConfig';
import { addDoc, collection, getDocs, query, serverTimestamp, updateDoc, doc, where } from 'firebase/firestore';
import AutomationEngine from '../automation/AutomationEngine';
import EventBus from '../event-bus/EventBus';

const starterWorkflow = (ownerId) => ({
  ownerId,
  title: 'Starter workflow',
  enabled: false,
  trigger: { event: 'automation.manual' },
  condition: null,
  actions: [{ type: 'log', message: 'Starter workflow executed' }],
  nodes: [
    { label: 'Manual trigger', icon: 'gesture-tap-button', color: '#0A84FF' },
    { label: 'Log event', icon: 'text-box-check-outline', color: '#34C759' },
  ],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

export default function AutomateScreen({ navigation }) {
  const { isDark } = useTheme();
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const textMain = isDark ? '#FFFFFF' : '#101820';
  const textSub = isDark ? '#9AA5B1' : '#667085';
  const cardBg = isDark ? '#111923' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const accentCol = '#0A84FF';

  const [workflows, setWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [busy, setBusy] = useState(false);
  const engineRef = useRef(null);

  const loadExecutions = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const snap = await getDocs(query(collection(db, 'automation_executions'), where('ownerId', '==', uid)));
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((x,y) => (y.createdAt?.toMillis?.() || 0) - (x.createdAt?.toMillis?.() || 0));
      setExecutions(items.slice(0, 20));
    } catch (error) { console.error('Automation executions load error', error); }
  }, [loadExecutions]);

  const loadWorkflows = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const snap = await getDocs(query(collection(db, 'automations'), where('ownerId', '==', uid)));
    setWorkflows(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, []);

  useEffect(() => {
    const engine = new AutomationEngine();
    engineRef.current = engine;
    let mounted = true;
    (async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const snap = await getDocs(query(collection(db, 'automations'), where('ownerId', '==', uid)));
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!mounted) return;
        setWorkflows(items);
        await loadExecutions();
        engine.registerWorkflows(items.filter(w => w.enabled !== false));
      } catch (error) {
        console.error('Automate load error', error);
      }
    })();
    return () => { mounted = false; engine.stop(); engineRef.current = null; };
  }, []);

  const createWorkflow = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || busy) return;
    setBusy(true);
    try {
      await addDoc(collection(db, 'automations'), starterWorkflow(uid));
      await loadWorkflows();
    } catch (error) {
      Alert.alert('Could not create workflow', error?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const runWorkflow = async (workflow) => {
    if (!workflow?.id) return;
    EventBus.emit('automation.manual', { workflowId: workflow.id, ownerId: auth.currentUser?.uid, manual: true });
    setTimeout(loadExecutions, 250);
  };

  const toggleWorkflow = async (workflow) => {
    try {
      const enabled = workflow.enabled === false;
      await updateDoc(doc(db, 'automations', workflow.id), {
        enabled,
        updatedAt: serverTimestamp(),
      });
      setWorkflows(items => {
        const next = items.map(item => item.id === workflow.id ? { ...item, enabled } : item);
        engineRef.current?.stop();
        engineRef.current?.registerWorkflows(next.filter(item => item.enabled !== false));
        return next;
      });
    } catch (error) {
      Alert.alert('Could not update workflow', error?.message || 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={textMain} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: textMain }]}>Nax Automate</Text>
          <Text style={[styles.subText, { color: accentCol }]}>Visual Workflow Builder</Text>
        </View>
        <TouchableOpacity onPress={createWorkflow} disabled={busy} style={styles.iconBtn} accessibilityLabel="Create workflow">
          <Ionicons name="add-circle" size={28} color={busy ? textSub : accentCol} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.infoBox, { borderColor: borderCol, backgroundColor: cardBg }]}>
          <MaterialCommunityIcons name="lightning-bolt-circle" size={40} color={accentCol} />
          <Text style={[styles.infoTitle, { color: textMain }]}>Automate Everything</Text>
          <Text style={[styles.infoDesc, { color: textSub }]}>
            Connect events, notifications and analytics with reliable trigger, condition and action flows.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: textMain }]}>Your Workflows</Text>

        {workflows.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: borderCol, backgroundColor: cardBg }]}>
            <MaterialCommunityIcons name="robot-outline" size={42} color={textSub} />
            <Text style={[styles.emptyTitle, { color: textMain }]}>No workflows yet</Text>
            <Text style={[styles.emptyText, { color: textSub }]}>Tap + to create a starter workflow.</Text>
          </View>
        ) : workflows.map((wf) => {
          const enabled = wf.enabled !== false;
          const nodes = Array.isArray(wf.nodes) && wf.nodes.length
            ? wf.nodes
            : [
                { label: wf.trigger?.event || 'Trigger', icon: 'flash-outline', color: accentCol },
                ...(Array.isArray(wf.actions) ? wf.actions.map(a => ({ label: a.type || 'Action', icon: 'play-circle-outline', color: '#34C759' })) : []),
              ];

          return (
            <View key={wf.id} style={[styles.workflowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={styles.wfHeader}>
                <Text style={[styles.wfTitle, { color: textMain }]} numberOfLines={1}>{wf.title || 'Untitled workflow'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: enabled ? 'rgba(52,199,89,0.16)' : 'rgba(150,150,150,0.14)' }]}>
                  <Text style={{ color: enabled ? '#34C759' : textSub, fontSize: 12, fontWeight: '700' }}>
                    {enabled ? 'ACTIVE' : 'OFF'}
                  </Text>
                </View>
              </View>

              <View style={styles.nodesContainer}>
                {nodes.map((node, index) => (
                  <React.Fragment key={`${wf.id}-${index}`}>
                    <View style={[styles.nodeBox, { borderColor: node.color || borderCol }]}>
                      <MaterialCommunityIcons name={node.icon || 'circle-outline'} size={19} color={node.color || accentCol} />
                      <Text style={[styles.nodeText, { color: textMain }]} numberOfLines={1}>{node.label || 'Step'}</Text>
                    </View>
                    {index < nodes.length - 1 && <Ionicons name="arrow-forward" size={16} color={textSub} style={styles.arrow} />}
                  </React.Fragment>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => runWorkflow(wf)}
                style={[styles.editBtn, { flex: 1, backgroundColor: 'rgba(10,132,255,0.10)' }]}
                accessibilityLabel="Run workflow"
              >
                <Text style={[styles.editBtnText, { color: accentCol }]}>Run</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => toggleWorkflow(wf)}
                style={[styles.editBtn, { backgroundColor: enabled ? 'rgba(255,59,48,0.10)' : 'rgba(52,199,89,0.10)' }]}
                accessibilityLabel={enabled ? 'Disable workflow' : 'Enable workflow'}
              >
                <Text style={[styles.editBtnText, { color: enabled ? '#FF3B30' : '#34C759' }]}>
                  {enabled ? 'Disable Workflow' : 'Enable Workflow'}
                </Text>
              </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {executions.length > 0 && <>
          <Text style={[styles.sectionTitle, { color: textMain, marginTop: 14 }]}>Recent Executions</Text>
          <View style={[styles.executionCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            {executions.slice(0, 8).map(item => <View key={item.id} style={styles.executionRow}>
              <View style={[styles.execDot, { backgroundColor: item.status === 'succeeded' ? '#34C759' : item.status === 'failed' ? '#FF3B30' : '#0A84FF' }]} />
              <View style={{ flex: 1 }}><Text style={[styles.execTitle, { color: textMain }]}>{item.status || 'completed'}</Text><Text style={{ color: textSub, fontSize: 11 }}>{item.eventType || 'workflow event'} · {item.durationMs ?? 0}ms</Text></View>
            </View>)}
          </View>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1 },
  iconBtn: { padding: 5 },
  titleWrap: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  subText: { fontSize: 12, marginTop: 2, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 36 },
  infoBox: { alignItems: 'center', marginBottom: 28, padding: 20, borderRadius: 22, borderWidth: 1 },
  infoTitle: { fontSize: 20, fontWeight: '800', marginTop: 10 },
  infoDesc: { textAlign: 'center', marginTop: 8, paddingHorizontal: 12, lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15 },
  workflowCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 15 },
  wfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  wfTitle: { fontSize: 16, fontWeight: '800', flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  nodesContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 15 },
  nodeBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, borderWidth: 1, backgroundColor: 'transparent', marginBottom: 6 },
  nodeText: { fontSize: 12, fontWeight: '700', marginLeft: 6, maxWidth: 120 },
  arrow: { marginHorizontal: 7, marginBottom: 6 },
  editBtn: { padding: 12, borderRadius: 12, alignItems: 'center' },
  editBtnText: { fontWeight: '800', fontSize: 14 },
  emptyCard: { padding: 28, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 10 },
  emptyText: { marginTop: 6, textAlign: 'center' },
  executionCard: { padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 20 },
  executionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  execDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  execTitle: { fontSize: 13, fontWeight: '700' },
});