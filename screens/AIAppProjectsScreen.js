import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AIAppBuilderService from '../api/AIAppBuilderService';
import NaxAppStoreAPI from '../api/NaxAppStoreAPI';

const CATEGORIES = ['apps', 'games', 'tools', 'ai', 'media', 'work'];

export default function AIAppProjectsScreen({ navigation }) {
  const { theme } = useTheme();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishItem, setPublishItem] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [form, setForm] = useState({ name: '', title: '', description: '', icon: '🚀', category: 'apps', version: '1.0' });
  const [screenshots, setScreenshots] = useState([]);

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

  const openPublish = item => {
    setPublishItem(item);
    setForm({
      name: item.name || '',
      title: item.title || item.name || '',
      description: item.description || item.memory?.summary || '',
      icon: item.icon || '🚀',
      category: item.category || 'apps',
      version: String(item.version || '1.0'),
    });
    setScreenshots(Array.isArray(item.screenshots) ? item.screenshots.map(uri => ({ uri })) : []);
  };

  const pickScreenshots = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photos permission', 'Allow photo access to select your app screenshots.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 6,
        quality: 0.8,
      });
      if (result.canceled) return;
      const picked = (result.assets || []).slice(0, 6).map(asset => ({ uri: asset.uri }));
      setScreenshots(picked);
    } catch (e) {
      Alert.alert('Screenshots', e?.message || 'Could not select screenshots.');
    }
  };

  const publish = async () => {
    if (!publishItem) return;
    if (!form.name.trim() || !form.title.trim()) {
      Alert.alert('Missing details', 'App name and Store title are required.');
      return;
    }
    if (!form.description.trim()) {
      Alert.alert('Missing description', 'Add a short description so people know what your app does.');
      return;
    }

    setPublishing(true);
    try {
      const id = publishItem.id;
      const uploaded = [];
      for (let i = 0; i < screenshots.length; i += 1) {
        const item = screenshots[i];
        if (item.uri?.startsWith('https://')) uploaded.push(item.uri);
        else uploaded.push(await NaxAppStoreAPI.uploadImage({ appId: id, uri: item.uri, kind: 'screenshot', index: i }));
      }

      const published = await NaxAppStoreAPI.publish(publishItem, {
        id,
        name: form.name.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        icon: form.icon.trim() || '🚀',
        category: form.category,
        version: Number.parseFloat(form.version) || 1,
        screenshots: uploaded,
      });

      setPublishItem(null);
      Alert.alert('Published', published.title + ' is now live on Nax Store.', [
        { text: 'Open', onPress: () => navigation.navigate('NaxAppRuntime', { appId: published.id }) },
        { text: 'OK' },
      ]);
    } catch (e) {
      Alert.alert('Publish failed', e?.message || 'Could not publish this app.');
    } finally {
      setPublishing(false);
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
            {item.target === 'SINGLE_HTML' ? <TouchableOpacity onPress={(event) => { event.stopPropagation?.(); openPublish(item); }} style={[styles.publish,{backgroundColor:theme.blue}]}><Ionicons name="cloud-upload-outline" size={14} color="#FFF"/><Text style={styles.publishText}>Publish</Text></TouchableOpacity> : null}
            <TouchableOpacity onPress={(event) => { event.stopPropagation?.(); remove(item); }} style={styles.delete}><Ionicons name="trash-outline" size={18} color={theme.sub} /></TouchableOpacity>
            <Ionicons name="chevron-forward" size={18} color={theme.sub} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!publishItem} transparent animationType="slide" onRequestClose={() => !publishing && setPublishItem(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: theme.bg }]}>
            <View style={styles.modalHeader}>
              <View><Text style={[styles.modalEyebrow,{color:theme.sub}]}>NAX STORE</Text><Text style={[styles.modalTitle,{color:theme.text}]}>Publish listing</Text></View>
              <TouchableOpacity disabled={publishing} onPress={() => setPublishItem(null)} style={styles.close}><Ionicons name="close" size={23} color={theme.text}/></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label,{color:theme.text}]}>App name *</Text>
              <TextInput value={form.name} onChangeText={v=>setForm({...form,name:v})} placeholder="My App" placeholderTextColor={theme.sub} style={[styles.input,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]}/>

              <Text style={[styles.label,{color:theme.text}]}>Store title *</Text>
              <TextInput value={form.title} onChangeText={v=>setForm({...form,title:v})} placeholder="A short title shown in Nax Store" placeholderTextColor={theme.sub} style={[styles.input,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]}/>

              <Text style={[styles.label,{color:theme.text}]}>Description *</Text>
              <TextInput multiline maxLength={500} value={form.description} onChangeText={v=>setForm({...form,description:v})} placeholder="What does your app do?" placeholderTextColor={theme.sub} style={[styles.input,styles.textArea,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]}/>

              <View style={styles.twoInputs}>
                <View style={{flex:1}}>
                  <Text style={[styles.label,{color:theme.text}]}>Icon</Text>
                  <TextInput value={form.icon} onChangeText={v=>setForm({...form,icon:v})} placeholder="🚀" placeholderTextColor={theme.sub} style={[styles.input,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surface,fontSize:22,textAlign:'center'}]}/>
                </View>
                <View style={{flex:1}}>
                  <Text style={[styles.label,{color:theme.text}]}>Version</Text>
                  <TextInput value={form.version} onChangeText={v=>setForm({...form,version:v})} placeholder="1.0" keyboardType="decimal-pad" placeholderTextColor={theme.sub} style={[styles.input,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]}/>
                </View>
              </View>

              <Text style={[styles.label,{color:theme.text}]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:7}}>
                {CATEGORIES.map(item => <TouchableOpacity key={item} onPress={()=>setForm({...form,category:item})} style={[styles.cat,{backgroundColor:form.category===item?theme.blue:theme.surface,borderColor:form.category===item?theme.blue:theme.border}]}><Text style={{color:'#FFF',fontSize:10,fontWeight:'900'}}>{item.toUpperCase()}</Text></TouchableOpacity>)}
              </ScrollView>

              <View style={styles.screenshotHeader}>
                <Text style={[styles.label,{color:theme.text}]}>Screenshots <Text style={{color:theme.sub,fontWeight:'500'}}>(up to 6)</Text></Text>
                <TouchableOpacity onPress={pickScreenshots} style={[styles.addShots,{backgroundColor:theme.blue}]}><Ionicons name="images-outline" size={16} color="#FFF"/><Text style={styles.addShotsText}>Select</Text></TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:9}}>
                {screenshots.map((shot,i)=><View key={shot.uri+i} style={styles.shotWrap}><Image source={{uri:shot.uri}} style={styles.shot}/><TouchableOpacity onPress={()=>setScreenshots(screenshots.filter((_,idx)=>idx!==i))} style={styles.removeShot}><Ionicons name="close" size={13} color="#FFF"/></TouchableOpacity></View>)}
                {!screenshots.length ? <View style={[styles.noShots,{borderColor:theme.border}]}><Ionicons name="image-outline" size={24} color={theme.sub}/><Text style={[styles.noShotsText,{color:theme.sub}]}>Add app screenshots</Text></View> : null}
              </ScrollView>

              <View style={styles.publishInfo}><Ionicons name="information-circle-outline" size={18} color={theme.blue}/><Text style={[styles.infoText,{color:theme.sub}]}>These details become the public Nax Store listing. Your app source stays in its existing project.</Text></View>
              <TouchableOpacity disabled={publishing} onPress={publish} style={[styles.liveButton,{backgroundColor:publishing?theme.sub:theme.blue}]}>{publishing?<ActivityIndicator color="#FFF"/>:<><Ionicons name="cloud-upload-outline" size={18} color="#FFF"/><Text style={styles.liveText}>Publish & Go Live</Text></>}</TouchableOpacity>
              <View style={{height:25}}/>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1},content:{padding:18,paddingBottom:120},header:{flexDirection:'row',alignItems:'center',marginBottom:16},back:{width:40,alignItems:'center'},eyebrow:{fontSize:9,fontWeight:'900',letterSpacing:1.5},title:{fontSize:29,fontWeight:'900',marginTop:1},add:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'},
  hero:{borderWidth:1,borderRadius:22,padding:17,marginBottom:20},heroTitle:{fontSize:18,fontWeight:'900'},heroText:{fontSize:12,lineHeight:18,marginTop:5},heroRow:{flexDirection:'row',gap:9,marginTop:14},heroBtn:{flex:1,height:42,borderRadius:13,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6},heroBtnText:{fontSize:12,fontWeight:'900',color:'#FFF'},
  sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},section:{fontSize:18,fontWeight:'900'},count:{fontSize:11,fontWeight:'800'},card:{borderWidth:1,borderRadius:18,padding:13,flexDirection:'row',alignItems:'center',marginBottom:9},icon:{width:45,height:45,borderRadius:14,alignItems:'center',justifyContent:'center'},name:{fontSize:15,fontWeight:'900'},meta:{fontSize:10,marginTop:3},publish:{height:32,borderRadius:9,paddingHorizontal:9,flexDirection:'row',alignItems:'center',gap:4,marginLeft:5},publishText:{color:'#FFF',fontSize:9,fontWeight:'900'},delete:{padding:8,marginLeft:2},empty:{borderWidth:1,borderRadius:20,padding:26,alignItems:'center'},emptyTitle:{fontSize:17,fontWeight:'900',marginTop:9},emptyText:{fontSize:12,lineHeight:17,textAlign:'center',marginTop:4},primary:{marginTop:15,borderRadius:13,paddingHorizontal:16,paddingVertical:12},primaryText:{color:'#FFF',fontWeight:'900'},
  modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.68)',justifyContent:'flex-end'},modal:{maxHeight:'94%',borderTopLeftRadius:25,borderTopRightRadius:25,padding:18},modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},modalEyebrow:{fontSize:9,fontWeight:'900',letterSpacing:1.5},modalTitle:{fontSize:24,fontWeight:'900'},close:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'},label:{fontSize:11,fontWeight:'900',marginTop:12,marginBottom:6},input:{height:46,borderWidth:1,borderRadius:12,paddingHorizontal:12,fontSize:13},textArea:{height:92,textAlignVertical:'top',paddingTop:11},twoInputs:{flexDirection:'row',gap:10},cat:{height:35,paddingHorizontal:12,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center'},screenshotHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:4},addShots:{height:34,borderRadius:10,paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:5},addShotsText:{color:'#FFF',fontSize:10,fontWeight:'900'},shotWrap:{width:105,height:145,borderRadius:12,overflow:'visible'},shot:{width:105,height:145,borderRadius:12,backgroundColor:'#18243A'},removeShot:{position:'absolute',right:-5,top:-5,width:23,height:23,borderRadius:12,backgroundColor:'#E53935',alignItems:'center',justifyContent:'center'},noShots:{width:105,height:95,borderWidth:1,borderStyle:'dashed',borderRadius:12,alignItems:'center',justifyContent:'center'},noShotsText:{fontSize:9,marginTop:5,textAlign:'center'},publishInfo:{flexDirection:'row',gap:7,marginTop:15,padding:11,borderRadius:12,backgroundColor:'rgba(8,126,255,.08)'},infoText:{flex:1,fontSize:10,lineHeight:14},liveButton:{height:48,borderRadius:14,marginTop:14,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7},liveText:{color:'#FFF',fontSize:13,fontWeight:'900'}
});
