import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import LocalMiniAppStore from '../mini-apps/LocalMiniAppStore';
import { MiniAppAPI } from '../api/MiniAppAPI';

export default function MiniAppLibraryScreen({ navigation }) {
  const { theme } = useTheme();
  const [apps, setApps] = useState([]);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setApps(await LocalMiniAppStore.list());
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = app => navigation.navigate('MiniAppViewer', {
    title: app.name, appConfig: app, entryType: 'html', htmlCode: app.htmlCode, localAppId: app.id,
  });

  const publish = async app => {
    if (app.status === 'published') {
      Alert.alert('Already published', app.name + ' is already in the public Nax Apps catalog.');
      return;
    }
    setBusy(app.id);
    try {
      await MiniAppAPI.publishImportedMiniApp(app);
      await LocalMiniAppStore.update(app.id, { status: 'published', publishedAt: Date.now() });
      await load();
      Alert.alert('Published', app.name + ' is now available in the public Nax Apps catalog.');
    } catch (e) {
      Alert.alert('Publish failed', e.message || 'Could not publish this app.');
    } finally {
      setBusy('');
    }
  };

  const remove = app => Alert.alert('Remove local app?', app.name + ' will be removed from this device.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => { await LocalMiniAppStore.remove(app.id); load(); } },
  ]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.title, { color: theme.text }]}>My Local Apps</Text>
          <Text style={[styles.sub, { color: theme.sub }]}>Private sandbox and imported projects</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('MiniAppImport')}><Ionicons name="add-circle-outline" size={25} color={theme.blue} /></TouchableOpacity>
      </View>

      <FlatList
        data={apps}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="code-slash" size={42} color={theme.sub} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No imported apps</Text>
            <Text style={[styles.emptySub, { color: theme.sub }]}>Import an HTML or ZIP project to start.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.icon, { backgroundColor: 'rgba(8,126,255,.12)' }]}>
              <Ionicons name={item.icon || 'apps'} size={25} color={item.color || theme.blue} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.meta, { color: theme.sub }]}>{item.category || 'Other'} • {item.status || 'draft'}</Text>
            </View>
            <TouchableOpacity onPress={() => open(item)} style={styles.miniBtn}><Ionicons name="play" size={17} color={theme.blue} /></TouchableOpacity>
            <TouchableOpacity onPress={() => publish(item)} disabled={busy === item.id} style={styles.miniBtn}>
              {busy === item.id ? <Text style={{ color: theme.blue }}>…</Text> : <Ionicons name="cloud-upload-outline" size={17} color={theme.blue} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => remove(item)} style={styles.miniBtn}><Ionicons name="trash-outline" size={17} color="#FF3B30" /></TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,.12)' },
  title: { fontSize: 20, fontWeight: '900' },
  sub: { fontSize: 11, marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: 13, marginBottom: 10 },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 11, marginTop: 3 },
  miniBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 5, backgroundColor: 'rgba(8,126,255,.07)' },
  empty: { alignItems: 'center', paddingTop: 100, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 12 },
  emptySub: { fontSize: 12, marginTop: 5, textAlign: 'center' },
});
