import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../context/ThemeContext';
import NaxAppStoreAPI from '../api/NaxAppStoreAPI';

const CATEGORIES = ['All', 'Apps', 'Games', 'Tools', 'AI', 'Media', 'Work'];

const getCategory = app => {
  const value = String(app.category || '').toLowerCase();
  if (value) return value;
  const name = String(app.name || '').toLowerCase();
  const desc = String(app.description || '').toLowerCase();
  if (/game|arcade|puzzle|quiz/.test(name + ' ' + desc)) return 'games';
  if (/ai|assistant|image|model/.test(name + ' ' + desc)) return 'ai';
  if (/video|photo|music|media/.test(name + ' ' + desc)) return 'media';
  if (/task|work|habit|note|productivity/.test(name + ' ' + desc)) return 'work';
  if (/tool|calculator|converter|utility/.test(name + ' ' + desc)) return 'tools';
  return 'apps';
};

export default function NaxStoreScreen({ navigation }) {
  const { theme } = useTheme();
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setApps(await NaxAppStoreAPI.list({ search: query, limitCount: 80 }));
    } catch (e) {
      Alert.alert('Nax Store', e?.message || 'Could not load Nax Store.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const importApp = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/html', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      const html = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const name = (asset.name || 'Imported App').replace(/\.html?$/i, '') || 'Imported App';
      navigation.navigate('AIAppBuilder', {
        importedHtml: html,
        importedName: name,
      });
    } catch (e) {
      Alert.alert('Import failed', e?.message || 'Could not import the app.');
    }
  };

  const visible = apps.filter(app => category === 'All' || getCategory(app) === category.toLowerCase());

  const shareApp = async app => {
    try {
      await Share.share({
        title: app.name,
        message: 'Use ' + app.name + ' on Nax Store\nNax App ID: ' + app.id + '\nOpen: nax://app/' + encodeURIComponent(app.id),
      });
    } catch (_) {}
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="chevron-back" size={25} color={theme.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.brand, { color: theme.text }]}>Nax Store</Text>
            <Text style={[styles.subtitle, { color: theme.sub }]}>Create · Publish · Use · Share</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('AIAppProjects')} style={[styles.headerBtn, { backgroundColor: theme.blue }]}><Ionicons name="person-circle-outline" size={20} color="#FFF" /></TouchableOpacity>
        </View>

        <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={19} color={theme.sub} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search apps, tools, games..." placeholderTextColor={theme.sub} style={[styles.searchInput, { color: theme.text }]} />
          <Ionicons name="mic-outline" size={18} color={theme.sub} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {CATEGORIES.map(item => (
            <TouchableOpacity key={item} onPress={() => setCategory(item)} style={[styles.category, { backgroundColor: category === item ? theme.blue : theme.surface, borderColor: category === item ? theme.blue : theme.border }]}>
              <Text style={[styles.categoryText, { color: category === item ? '#FFF' : theme.text }]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: theme.text }]}>Create your app with AI</Text>
            <Text style={[styles.heroText, { color: theme.sub }]}>Describe your idea, build it with AI, then publish the finished Single HTML app to Nax Store.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AIAppBuilder')} style={[styles.heroButton, { backgroundColor: theme.blue }]}>
              <Ionicons name="sparkles" size={17} color="#FFF" />
              <Text style={styles.heroButtonText}>Create App with AI</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={[styles.heroIcon, { backgroundColor: 'rgba(8,126,255,.12)' }]}><Ionicons name="apps-outline" size={48} color={theme.blue} /></View>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity onPress={() => navigation.navigate('AIAppBuilder')} style={[styles.actionTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.tileIcon,{backgroundColor:'rgba(48,209,88,.14)'}]}><Ionicons name="add" size={24} color={theme.green} /></View>
            <Text style={[styles.tileTitle,{color:theme.text}]}>Create App</Text>
            <Text style={[styles.tileText,{color:theme.sub}]}>Build from a conversation.</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={importApp} style={[styles.actionTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.tileIcon,{backgroundColor:'rgba(8,126,255,.12)'}]}><Ionicons name="arrow-up" size={22} color={theme.blue} /></View>
            <Text style={[styles.tileTitle,{color:theme.text}]}>Import App</Text>
            <Text style={[styles.tileText,{color:theme.sub}]}>Bring your custom HTML app.</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AIAppProjects')} style={[styles.actionTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.tileIcon,{backgroundColor:'rgba(175,82,222,.12)'}]}><Ionicons name="cloud-upload-outline" size={22} color="#AF52DE" /></View>
            <Text style={[styles.tileTitle,{color:theme.text}]}>Publish</Text>
            <Text style={[styles.tileText,{color:theme.sub}]}>Make your app public.</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AIAppProjects')} style={[styles.actionTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.tileIcon,{backgroundColor:'rgba(255,159,10,.14)'}]}><Ionicons name="people-outline" size={22} color="#FF9F0A" /></View>
            <Text style={[styles.tileTitle,{color:theme.text}]}>My Apps</Text>
            <Text style={[styles.tileText,{color:theme.sub}]}>Edit, preview, package.</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{category === 'All' ? 'Popular on Nax Store' : category}</Text>
          <Text style={[styles.seeAll, { color: theme.blue }]}>{visible.length} apps</Text>
        </View>

        {loading ? <ActivityIndicator color={theme.blue} style={{ marginTop: 24 }} /> : visible.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="storefront-outline" size={36} color={theme.sub} />
            <Text style={[styles.emptyTitle,{color:theme.text}]}>No public apps yet</Text>
            <Text style={[styles.emptyText,{color:theme.sub}]}>Create or import an app, then publish it here.</Text>
          </View>
        ) : visible.map(app => (
          <View key={app.id} style={[styles.appCard,{backgroundColor:theme.surface,borderColor:theme.border}]}>
            <View style={[styles.appIcon,{backgroundColor:'rgba(8,126,255,.12)'}]}><Text style={styles.appEmoji}>{app.icon || '🚀'}</Text></View>
            <View style={{flex:1}}>
              <Text style={[styles.appName,{color:theme.text}]} numberOfLines={1}>{app.name}</Text>
              <Text style={[styles.appMeta,{color:theme.sub}]}>{getCategory(app)} · by {app.creatorName}</Text>
              <Text style={[styles.appDesc,{color:theme.sub}]} numberOfLines={2}>{app.description || 'Creator-built app for Nax.'}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('NaxAppRuntime',{appId:app.id})} style={[styles.useBtn,{backgroundColor:theme.blue}]}><Ionicons name="play" size={14} color="#FFF"/><Text style={styles.useText}>Use</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => shareApp(app)} style={[styles.shareBtn,{borderColor:theme.border}]}><Ionicons name="share-outline" size={17} color={theme.text}/></TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
 safe:{flex:1},content:{padding:16,paddingBottom:100},header:{flexDirection:'row',alignItems:'center',marginBottom:14},back:{width:36},brand:{fontSize:28,fontWeight:'900'},subtitle:{fontSize:11,marginTop:1},headerBtn:{width:41,height:41,borderRadius:14,alignItems:'center',justifyContent:'center'},search:{height:48,borderWidth:1,borderRadius:16,paddingHorizontal:12,flexDirection:'row',alignItems:'center'},searchInput:{flex:1,fontSize:14,marginHorizontal:8},categories:{gap:8,paddingVertical:12},category:{paddingHorizontal:15,paddingVertical:9,borderWidth:1,borderRadius:13},categoryText:{fontSize:11,fontWeight:'900'},hero:{borderWidth:1,borderRadius:22,padding:17,flexDirection:'row',alignItems:'center'},heroTitle:{fontSize:24,fontWeight:'900',maxWidth:270},heroText:{fontSize:12,lineHeight:18,marginTop:7,maxWidth:300},heroButton:{height:42,borderRadius:13,paddingHorizontal:13,marginTop:13,flexDirection:'row',alignItems:'center',gap:7,alignSelf:'flex-start'},heroButtonText:{color:'#FFF',fontSize:11,fontWeight:'900'},heroIcon:{width:86,height:86,borderRadius:26,alignItems:'center',justifyContent:'center'},actionGrid:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:10},actionTile:{width:'48.4%',minHeight:123,borderWidth:1,borderRadius:17,padding:12},tileIcon:{width:40,height:40,borderRadius:13,alignItems:'center',justifyContent:'center'},tileTitle:{fontSize:14,fontWeight:'900',marginTop:8},tileText:{fontSize:10,lineHeight:14,marginTop:3},sectionHeader:{marginTop:22,marginBottom:9,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},sectionTitle:{fontSize:20,fontWeight:'900'},seeAll:{fontSize:10,fontWeight:'900'},appCard:{borderWidth:1,borderRadius:17,padding:11,flexDirection:'row',alignItems:'center',marginBottom:9},appIcon:{width:53,height:53,borderRadius:16,alignItems:'center',justifyContent:'center',marginRight:10},appEmoji:{fontSize:29},appName:{fontSize:14,fontWeight:'900'},appMeta:{fontSize:9,marginTop:2},appDesc:{fontSize:10,lineHeight:14,marginTop:4},useBtn:{height:34,borderRadius:10,paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:5,marginLeft:8},useText:{color:'#FFF',fontSize:10,fontWeight:'900'},shareBtn:{width:34,height:34,borderWidth:1,borderRadius:10,alignItems:'center',justifyContent:'center',marginLeft:6},empty:{borderWidth:1,borderRadius:18,padding:28,alignItems:'center'},emptyTitle:{fontSize:16,fontWeight:'900',marginTop:8},emptyText:{fontSize:11,lineHeight:16,textAlign:'center',marginTop:4}
});
