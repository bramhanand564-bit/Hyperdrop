import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import AutomationEngine from '../automation/AutomationEngine';

export default function AutomateScreen({ navigation }) {
  const { isDark } = useTheme();
  
  // Colors
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const cardBg = isDark ? '#1A222C' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const accentCol = '#FF9500'; // Automate Orange

  const [workflows, setWorkflows] = useState([]);
  useEffect(() => {
    const engine = new AutomationEngine();
    let mounted = true;
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDocs(query(collection(db, 'automations'), where('ownerId', '==', uid)));
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!mounted) return;
      setWorkflows(items);
      engine.registerWorkflows(items.filter(w => w.enabled !== false));
    })().catch(error => console.error('Automate load error', error));
    return () => { mounted = false; engine.stop(); };
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* 🛠️ HEADER */}
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={textMain} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: textMain }]}>Nax Automate</Text>
          <Text style={styles.subText}>Visual Workflow Builder ⚡</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="add-circle" size={26} color={accentCol} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="lightning-bolt-circle" size={40} color={accentCol} />
          <Text style={[styles.infoTitle, { color: textMain }]}>Automate Everything</Text>
          <Text style={[styles.infoDesc, { color: textSub }]}>Connect Games, Bots, and Chats. Trigger actions automatically without writing code.</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: textMain }]}>Your Workflows</Text>

        {/* 🧩 WORKFLOW LIST */}
        {workflows.map((wf) => (
          <View key={wf.id} style={[styles.workflowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            
            <View style={styles.wfHeader}>
              <Text style={[styles.wfTitle, { color: textMain }]}>{wf.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: wf.isActive ? 'rgba(52, 199, 89, 0.2)' : 'rgba(150,150,150,0.2)' }]}>
                <Text style={{ color: wf.isActive ? '#34C759' : textSub, fontSize: 12, fontWeight: 'bold' }}>
                  {wf.isActive ? 'ACTIVE' : 'OFF'}
                </Text>
              </View>
            </View>

            {/* 🔗 VISUAL BUILDER UI (Trigger -> Action -> Action) */}
            <View style={styles.nodesContainer}>
              {wf.nodes.map((node, index) => (
                <React.Fragment key={index}>
                  <View style={[styles.nodeBox, { borderColor: node.color }]}>
                    <MaterialCommunityIcons name={node.icon} size={20} color={node.color} />
                    <Text style={[styles.nodeText, { color: textMain }]} numberOfLines={1}>{node.label}</Text>
                  </View>
                  
                  {/* Next Arrow (except last node) */}
                  {index < wf.nodes.length - 1 && (
                    <Ionicons name="arrow-forward" size={16} color={textSub} style={styles.arrow} />
                  )}
                </React.Fragment>
              ))}
            </View>

            <TouchableOpacity style={[styles.editBtn, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
              <Text style={[styles.editBtnText, { color: accentCol }]}>Edit Workflow</Text>
            </TouchableOpacity>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1 },
  iconBtn: { padding: 5 },
  titleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  subText: { fontSize: 12, color: '#FF9500', marginTop: 2, fontWeight: '600' },
  scrollContent: { padding: 20 },
  infoBox: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  infoTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  infoDesc: { textAlign: 'center', marginTop: 8, paddingHorizontal: 20, lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  workflowCard: { padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 15, elevation: 2 },
  wfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  wfTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  nodesContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 15 },
  nodeBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.02)' },
  nodeText: { fontSize: 12, fontWeight: '600', marginLeft: 6, maxWidth: 100 },
  arrow: { marginHorizontal: 8 },
  editBtn: { padding: 12, borderRadius: 10, alignItems: 'center' },
  editBtnText: { fontWeight: 'bold', fontSize: 14 }
});
