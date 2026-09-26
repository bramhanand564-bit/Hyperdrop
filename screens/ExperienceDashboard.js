import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ExperienceAPI from '../api/ExperienceAPI';

const toDate = value => {
  try { return value?.toDate ? value.toDate() : value ? new Date(value) : null; } catch { return null; }
};
const formatDate = value => {
  const d = toDate(value);
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString() : '—';
};

export default function ExperienceDashboard({ navigation }) {
  const { theme } = useTheme();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadMine = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ExperienceAPI.listMine();
      setItems(data);
      if (data.length) setSelected(data[0]);
      else setSelected(null);
    } catch (e) {
      Alert.alert('Creator', e.message || 'Could not load your experiences.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async item => {
    if (!item) return;
    setDetailLoading(true);
    try {
      const [people, activity] = await Promise.all([
        ExperienceAPI.listParticipants(item.id),
        ExperienceAPI.listEvents(item.id, 100),
      ]);
      setParticipants(people);
      setEvents(activity);
    } catch (e) {
      Alert.alert('Analytics', e.message || 'Could not load activity.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { loadMine(); }, [loadMine]);
  useEffect(() => { loadDetail(selected); }, [selected, loadDetail]);

  const analytics = useMemo(() => {
    const actionCounts = {};
    events.filter(e => e.type === 'action').forEach(event => {
      const label = String(event.actionLabel || event.actionId || 'Action');
      actionCounts[label] = (actionCounts[label] || 0) + 1;
    });
    const actions = Object.entries(actionCounts).sort((a,b) => b[1] - a[1]).slice(0, 6);
    const people = participants.length;
    const completed = participants.filter(p => String(p.status || '').toLowerCase() === 'completed' || String(p.state?.status || '').toLowerCase() === 'completed').length;
    const opened = events.filter(e => e.type === 'run').length;
    const actionEvents = events.filter(e => e.type === 'action').length;
    const points = participants.reduce((sum, person) => sum + Math.max(0, Number(person.state?.points || 0)), 0);
    return { people, completed, actionEvents, opened, events: events.length, points, actions };
  }, [participants, events]);

  const setStatus = async status => {
    if (!selected) return;
    try {
      const updated = await ExperienceAPI.update(selected.id, { status });
      setItems(prev => prev.map(x => x.id === updated.id ? updated : x));
      setSelected(updated);
    } catch (e) {
      Alert.alert('Update', e.message || 'Could not update experience.');
    }
  };

  const remove = () => {
    if (!selected) return;
    Alert.alert('Delete experience?', 'This removes the experience and its participant/activity records.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await ExperienceAPI.remove(selected.id);
          setSelected(null);
          setItems(prev => prev.filter(x => x.id !== selected.id));
        } catch (e) { Alert.alert('Delete', e.message || 'Could not delete.'); }
      }}
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color={theme.text} /></TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.title, { color: theme.text }]}>Creator Dashboard</Text>
            <Text style={[styles.sub, { color: theme.sub }]}>Manage your Experiences</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ExperienceBuilder', { template: 'custom' })} style={[styles.add, { backgroundColor: theme.blue }]}>
            <Ionicons name="add" size={21} color="#FFF" />
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator color={theme.blue} style={{ marginTop: 30 }} /> : items.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Create your first Experience</Text>
            <Text style={[styles.emptyText, { color: theme.sub }]}>Build it once, then share the live object in Chat.</Text>
            <TouchableOpacity style={[styles.primary, { backgroundColor: theme.blue }]} onPress={() => navigation.navigate('ExperienceBuilder', { template: 'custom' })}>
              <Text style={styles.primaryText}>Create</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.section, { color: theme.text }]}>My Experiences</Text>
            {items.map(item => (
              <TouchableOpacity key={item.id} onPress={() => setSelected(item)} style={[styles.item, { backgroundColor: selected?.id === item.id ? theme.blue : theme.surface, borderColor: selected?.id === item.id ? theme.blue : theme.border }]}>
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: selected?.id === item.id ? '#FFF' : theme.text, fontWeight: '900', fontSize: 15 }}>{item.name}</Text>
                  <Text style={{ color: selected?.id === item.id ? 'rgba(255,255,255,.75)' : theme.sub, fontSize: 11, marginTop: 2 }}>{item.template} · {item.status}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={selected?.id === item.id ? '#FFF' : theme.sub} />
              </TouchableOpacity>
            ))}

            {selected ? (
              <>
                <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroIcon}>{selected.icon}</Text>
                    <Text style={[styles.heroName, { color: theme.text }]}>{selected.name}</Text>
                    <Text style={[styles.heroDesc, { color: theme.sub }]}>{selected.description}</Text>
                    <Text style={[styles.heroMeta, { color: theme.sub }]}>Status: {selected.status} · Created {formatDate(selected.createdAt)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('ExperienceRuntime', { experienceId: selected.id })}><Ionicons name="open-outline" size={22} color={theme.blue} /></TouchableOpacity>
                </View>

                <View style={styles.metrics}>
                  {[['People', analytics.people], ['Actions', analytics.actionEvents], ['Completed', analytics.completed]].map(([label,value]) => (
                    <View key={label} style={[styles.metric, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
                      <Text style={[styles.metricLabel, { color: theme.sub }]}>{label}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.buttons}>
                  <TouchableOpacity onPress={() => navigation.navigate('ExperienceBuilder',{experienceId:selected.id,template:selected.template})} style={[styles.small, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}><Ionicons name="create-outline" size={16} color={theme.text} /><Text style={{color:theme.text,fontWeight:'900'}}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('ExperienceSharePicker',{experience:selected})} style={[styles.small, { backgroundColor: theme.blue }]}><Ionicons name="share-outline" size={16} color="#FFF" /><Text style={styles.smallText}>Share</Text></TouchableOpacity>
                  {selected.status === 'disabled' ? (
                    <TouchableOpacity onPress={() => setStatus('published')} style={[styles.small, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}><Text style={{ color: theme.text, fontWeight: '900' }}>Publish</Text></TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => setStatus('disabled')} style={[styles.small, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}><Text style={{ color: theme.text, fontWeight: '900' }}>Disable</Text></TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={remove} style={[styles.small, { backgroundColor: 'rgba(255,59,48,.10)' }]}><Text style={{ color: '#FF3B30', fontWeight: '900' }}>Delete</Text></TouchableOpacity>
                </View>

                <View style={[styles.analyticsBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.analyticsHead}>
                    <Text style={[styles.boxTitle, { color: theme.text }]}>Analytics</Text>
                    <Text style={{ color: theme.sub, fontSize: 11 }}>{analytics.points} points earned</Text>
                  </View>
                  <Text style={[styles.analyticsSub, { color: theme.sub }]}>Opened {analytics.opened} times · {analytics.events} total events</Text>
                  {analytics.actions.length ? analytics.actions.map(([label, count]) => (
                    <View key={label} style={styles.breakdownRow}>
                      <Text style={{ color: theme.text, fontWeight: '800', flex: 1 }} numberOfLines={1}>{label}</Text>
                      <Text style={{ color: theme.blue, fontWeight: '900' }}>{count}</Text>
                    </View>
                  )) : <Text style={{ color: theme.sub, marginTop: 8 }}>No action data yet.</Text>}
                </View>

                <Text style={[styles.section, { color: theme.text }]}>Participants</Text>
                {participants.length ? participants.slice(0, 20).map(person => (
                  <View key={person.id} style={[styles.participant, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={[styles.personIcon, { backgroundColor: 'rgba(8,126,255,.12)' }]}><Ionicons name="person-outline" size={17} color={theme.blue} /></View>
                    <View style={{ flex: 1, marginLeft: 9 }}>
                      <Text style={{ color: theme.text, fontWeight: '800' }} numberOfLines={1}>{String(person.id).slice(0, 16)}</Text>
                      <Text style={{ color: theme.sub, fontSize: 10, marginTop: 2 }}>{person.state?.status || person.status || 'ready'} · {Number(person.state?.points || 0)} points · {person.runCount || 0} opens</Text>
                    </View>
                  </View>
                )) : <Text style={{ color: theme.sub }}>No participants yet.</Text>}

                <Text style={[styles.section, { color: theme.text }]}>Recent Activity</Text>
                {detailLoading ? <ActivityIndicator color={theme.blue} /> : events.length === 0 ? (
                  <Text style={{ color: theme.sub }}>No activity yet.</Text>
                ) : events.slice(0, 25).map(event => (
                  <View key={event.id} style={[styles.event, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Ionicons name={event.type === 'join' ? 'person-add-outline' : 'flash-outline'} size={18} color={theme.blue} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: theme.text, fontWeight: '800' }}>{event.actionLabel || event.action || event.type}</Text>
                      <Text style={{ color: theme.sub, fontSize: 11, marginTop: 2 }}>{String(event.userId || '').slice(0, 10)} · {event.chatId ? 'Chat action' : event.type === 'run' ? 'Opened' : 'Direct'} · {formatDate(event.createdAt)}</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
 safe:{flex:1},content:{padding:18,paddingBottom:70},top:{flexDirection:'row',alignItems:'center',marginBottom:18},title:{fontSize:21,fontWeight:'900'},sub:{fontSize:11,marginTop:2},add:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'},section:{fontSize:18,fontWeight:'900',marginBottom:10,marginTop:8},item:{borderWidth:1,borderRadius:17,padding:13,flexDirection:'row',alignItems:'center',marginBottom:9},itemIcon:{fontSize:27,width:45},hero:{borderWidth:1,borderRadius:20,padding:16,flexDirection:'row',marginTop:9},heroIcon:{fontSize:31},heroName:{fontSize:20,fontWeight:'900',marginTop:5},heroDesc:{fontSize:12,lineHeight:17,marginTop:3},heroMeta:{fontSize:10,marginTop:8},metrics:{flexDirection:'row',gap:8,marginTop:10},metric:{flex:1,borderWidth:1,borderRadius:15,padding:12,alignItems:'center'},metricValue:{fontSize:19,fontWeight:'900'},metricLabel:{fontSize:10,marginTop:3},buttons:{flexDirection:'row',gap:8,marginTop:12},small:{flex:1,minHeight:42,borderRadius:12,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:5},smallText:{color:'#FFF',fontWeight:'900'},event:{borderWidth:1,borderRadius:15,padding:12,flexDirection:'row',alignItems:'center',marginBottom:8},analyticsBox:{borderWidth:1,borderRadius:18,padding:14,marginTop:12},analyticsHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},analyticsSub:{fontSize:11,marginTop:4},breakdownRow:{flexDirection:'row',alignItems:'center',paddingTop:9},participant:{borderWidth:1,borderRadius:15,padding:11,flexDirection:'row',alignItems:'center',marginBottom:8},personIcon:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center'},empty:{borderWidth:1,borderRadius:22,padding:30,alignItems:'center',marginTop:20},emptyIcon:{fontSize:40},emptyTitle:{fontSize:18,fontWeight:'900',marginTop:8},emptyText:{fontSize:12,lineHeight:18,textAlign:'center',marginTop:4},primary:{paddingHorizontal:20,paddingVertical:11,borderRadius:13,marginTop:14},primaryText:{color:'#FFF',fontWeight:'900'}
});
