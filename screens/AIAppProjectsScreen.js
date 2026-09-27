import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AIAppBuilderService from '../api/AIAppBuilderService';
import NaxAppStoreAPI from '../api/NaxAppStoreAPI';

export default function AIAppProjectsScreen({ navigation }) {
  const { theme } = useTheme();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProjects(await AIAppBuilderService.listProjects()); }
    catch (e) { Alert.alert('Projects', e?.message || 'Could not load projects.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const unsubscribe = navigation.addListener('focus', load); load(); return unsubscribe; }, [navigation, load]);

  const newProject = () => navigation.navigate('AIAppBuilder');

  const importHtml = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/html', 'text/plain', '*/*'], copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      const html = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const name = (asset.name || 'Imported App').replace(/\.html?$/i, '') || 'Imported App';
      const project = await AIAppBuilderService.createProject({ name, request: 'Imported HTML app', target: 'SINGLE_HTML', html });
      navigation.navigate('AIAppBuilder', { project });
    } catch (e) { Alert.alert('Import failed', e?.message || 'Could not import HTML.'); }
  };

  const publish = async item => {
    try {
      const published = await NaxAppStoreAPI.publish(item);
      Alert.alert('Published', item.name + ' is now public on Nax Store.', [
        { text: 'Open', onPress: () => navigation.navigate('NaxAppRuntime', { appId: published.id }) },
        { text: 'OK' },
      ]);
    } catch (e) {
      Alert.alert('Publish failed', e?.message || 'Could not publish this app.');
    }
  };

  const remove = item => Alert.alert('Delete app?', item.name, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await AIAppBuilderService.removeProject(item.id); load(); } catch (e) { Alert.alert('Delete failed', e?.message || 'Could not delete.'); } } },
  ]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="chevron-back" size={23} color={theme.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: theme.sub }]}>AI WORKSPACE</Text>
            <Text style={[styles.title, { color: theme.text }]}>My Apps</Text>
          </View>
          <TouchableOpacity onPress={newProject} style={[styles.add, { backgroundColor: theme.blue }]}><Ionicons name="add" size={22} color="#FFF" /></TouchableOpacity>
        </View>

        <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.heroTitle, { color: theme.text }]}>One workspace, two build targets</Text>
          <Text style={[styles.heroText, { color: theme.sub }]}>Hyperdrop automatically keeps simple apps as one tiny HTML file and upgrades complex builds into full source projects.</Text>
          <View style={styles.heroRow}>
            <TouchableOpacity onPress={newProject} style={[styles.heroBtn, { backgroundColor: theme.blue }]}><Ionicons name="sparkles" size={16} color="#FFF" /><Text style={styles.heroBtnText}>Build with AI</Text></TouchableOpacity>
            <TouchableOpacity onPress={importHtml} style={[styles.heroBtn, { backgroundColor: theme.surfaceStrong, borderColor: theme.border, borderWidth: 1 }]}><Ionicons name="download-outline" size={16} color={theme.text} /><Text style={[styles.heroBtnText, { color: theme.text }]}>Import HTML</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHead}><Text style={[styles.section, { color: theme.text }]}>Projects</Text><Text style={[styles.count, { color: theme.sub }]}>{projects.length}</Text></View>
        {loading ? <ActivityIndicator color={theme.blue} style={{ marginTop: 24 }} /> : projects.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="code-slash-outline" size={34} color={theme.sub} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No apps yet</Text>
            <Text style={[styles.emptyText, { color: theme.sub }]}>Start with a sentence. The builder will choose the simplest viable target.</Text>
            <TouchableOpacity onPress={newProject} style={[styles.primary, { backgroundColor: theme.blue }]}><Text style={styles.primaryText}>Create your first app</Text></TouchableOpacity>
          </View>
        ) : projects.map(item => (
          <TouchableOpacity key={item.id} onPress={() => navigation.navigate('AIAppBuilder', { project: item })} activeOpacity={0.85} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.icon, { backgroundColor: item.target === 'ADVANCED_PROJECT' ? 'rgba(255,149,0,.12)' : 'rgba(8,126,255,.10)' }]}>
              <Ionicons name={item.target === 'ADVANCED_PROJECT' ? 'construct-outline' : 'code-slash-outline'} size={22} color={item.target === 'ADVANCED_PROJECT' ? '#FF9500' : theme.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.meta, { color: theme.sub }]}>{item.target === 'ADVANCED_PROJECT' ? 'Advanced project' : 'Single HTML'} · {item.filePaths?.length || 1} file{(item.filePaths?.length || 1) === 1 ? '' : 's'}</Text>
              <Text style={[styles.meta, { color: theme.sub }]}>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : ''}</Text>
            </View>
            {item.target === 'SINGLE_HTML' ? <TouchableOpacity onPress={() => publish(item)} style={[styles.publish,{backgroundColor:theme.blue}]}><Ionicons name="cloud-upload-outline" size={14} color="#FFF"/><Text style={styles.publishText}>Live</Text></TouchableOpacity> : null}
            <TouchableOpacity onPress={() => remove(item)} style={styles.delete}><Ionicons name="trash-outline" size={18} color={theme.sub} /></TouchableOpacity>
            <Ionicons name="chevron-forward" size={18} color={theme.sub} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1},content:{padding:18,paddingBottom:120},header:{flexDirection:'row',alignItems:'center',marginBottom:16},back:{width:40,alignItems:'center'},eyebrow:{fontSize:9,fontWeight:'900',letterSpacing:1.5},title:{fontSize:29,fontWeight:'900',marginTop:1},add:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'},
  hero:{borderWidth:1,borderRadius:22,padding:17,marginBottom:20},heroTitle:{fontSize:18,fontWeight:'900'},heroText:{fontSize:12,lineHeight:18,marginTop:5},heroRow:{flexDirection:'row',gap:9,marginTop:14},heroBtn:{flex:1,height:42,borderRadius:13,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6},heroBtnText:{fontSize:12,fontWeight:'900',color:'#FFF'},
  sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},section:{fontSize:18,fontWeight:'900'},count:{fontSize:11,fontWeight:'800'},card:{borderWidth:1,borderRadius:18,padding:13,flexDirection:'row',alignItems:'center',marginBottom:9},icon:{width:45,height:45,borderRadius:14,alignItems:'center',justifyContent:'center'},name:{fontSize:15,fontWeight:'900'},meta:{fontSize:10,marginTop:3},publish:{height:32,borderRadius:9,paddingHorizontal:9,flexDirection:'row',alignItems:'center',gap:4,marginLeft:5},publishText:{color:'#FFF',fontSize:9,fontWeight:'900'},delete:{padding:8,marginLeft:2},empty:{borderWidth:1,borderRadius:20,padding:26,alignItems:'center'},emptyTitle:{fontSize:17,fontWeight:'900',marginTop:9},emptyText:{fontSize:12,lineHeight:17,textAlign:'center',marginTop:4},primary:{marginTop:15,borderRadius:13,paddingHorizontal:16,paddingVertical:12},primaryText:{color:'#FFF',fontWeight:'900',fontSize:12}
});
