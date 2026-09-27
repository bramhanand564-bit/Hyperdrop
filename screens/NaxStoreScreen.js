import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../context/ThemeContext';
import NaxAppStoreAPI from '../api/NaxAppStoreAPI';
import AIAppBuilderService from '../api/AIAppBuilderService';

const CATEGORIES = ['All', 'Apps', 'Games', 'Tools', 'AI', 'Media', 'Work'];

const getCategory = app => {
  const value = String(app.category || '').toLowerCase();
  if (value) return value;
  const text = (String(app.name || '') + ' ' + String(app.description || '')).toLowerCase();
  if (/game|arcade|puzzle|quiz/.test(text)) return 'games';
  if (/ai|assistant|image|model/.test(text)) return 'ai';
  if (/video|photo|music|media/.test(text)) return 'media';
  if (/task|work|habit|note|productivity/.test(text)) return 'work';
  if (/tool|calculator|converter|utility/.test(text)) return 'tools';
  return 'apps';
};

const iconFor = app => {
  const value = String(app.icon || '').trim();
  return value || '🚀';
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
        type: ['text/html', 'application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      const raw = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      if (/\.json$/i.test(asset.name || '')) {
        const importedProject = await AIAppBuilderService.importProject(JSON.parse(raw));
        navigation.navigate('AIAppBuilder', { project: importedProject });
        return;
      }
      const name = (asset.name || 'Imported App').replace(/\.html?$/i, '') || 'Imported App';
      navigation.navigate('AIAppBuilder', { importedHtml: raw, importedName: name });
    } catch (e) {
      Alert.alert('Import failed', e?.message || 'Could not import the app.');
    }
  };

  const visible = useMemo(
    () => apps.filter(app => category === 'All' || getCategory(app) === category.toLowerCase()),
    [apps, category]
  );

  const popular = visible.slice(0, 8);
  const featured = visible.slice(0, 6);
  const latest = [...visible].sort((a, b) => {
    const ta = a.updatedAt?.toMillis?.() || a.updatedAt || a.createdAt?.toMillis?.() || a.createdAt || 0;
    const tb = b.updatedAt?.toMillis?.() || b.updatedAt || b.createdAt?.toMillis?.() || b.createdAt || 0;
    return tb - ta;
  }).slice(0, 6);

  const shareApp = async app => {
    try {
      await Share.share({
        title: app.name,
        message: 'Use ' + app.name + ' on Nax Store\nNax App ID: ' + app.id + '\nOpen: nax://app/' + encodeURIComponent(app.id),
      });
    } catch (_) {}
  };

  const openApp = app => navigation.navigate('NaxAppRuntime', { appId: app.id });

  const AppIcon = ({ app, small = false }) => (
    <View style={[styles.appIcon, small && styles.smallIcon]}>
      {app.iconUrl ? <Image source={{ uri: app.iconUrl }} style={styles.appImage} /> : <Text style={[styles.appEmoji, small && styles.smallEmoji]}>{iconFor(app)}</Text>}
    </View>
  );

  const PopularCard = ({ app }) => (
    <TouchableOpacity activeOpacity={0.85} onPress={() => openApp(app)} style={[styles.popularCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <AppIcon app={app} small />
      <Text style={[styles.popularName, { color: theme.text }]} numberOfLines={1}>{app.name}</Text>
      <Text style={[styles.popularCategory, { color: theme.sub }]} numberOfLines={1}>{getCategory(app)}</Text>
      <Text style={[styles.creator, { color: theme.sub }]} numberOfLines={1}>by {app.creatorName || 'Creator'}</Text>
    </TouchableOpacity>
  );

  const FeaturedCard = ({ app }) => (
    <View style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <AppIcon app={app} />
      <View style={styles.featureBody}>
        <Text style={[styles.featureName, { color: theme.text }]} numberOfLines={1}>{app.name}</Text>
        <Text style={[styles.featureDesc, { color: theme.sub }]} numberOfLines={2}>{app.description || 'Creator-built app on Nax Store.'}</Text>
        <Text style={[styles.meta, { color: theme.sub }]}>{getCategory(app)} · {app.creatorName || 'Creator'}</Text>
      </View>
      <View style={styles.featureActions}>
        <TouchableOpacity onPress={() => openApp(app)} style={[styles.installBtn, { backgroundColor: theme.blue }]}>
          <Text style={styles.installText}>Use</Text>
        </TouchableOpacity>

      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#030914' }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="chevron-back" size={27} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.brandWrap}>
            <View style={styles.naxMark}><Text style={styles.naxMarkText}>N</Text></View>
            <View>
              <Text style={styles.brand}>Nax <Text style={styles.brandLight}>Store</Text></Text>
              <Text style={styles.tagline}>Create · Publish · Use · Share</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn}><Ionicons name="search-outline" size={22} color="#FFF" /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}><Ionicons name="notifications-outline" size={22} color="#FFF" /></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('AIAppProjects')} style={styles.profileCircle}><Text style={styles.profileText}>N</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#AAB8D6" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search apps, tools, games, experiences..."
            placeholderTextColor="#8795B5"
            style={styles.searchInput}
          />
          <Ionicons name="mic-outline" size={19} color="#AAB8D6" />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {CATEGORIES.map(item => (
            <TouchableOpacity key={item} onPress={() => setCategory(item)} style={[styles.category, category === item && styles.categoryActive]}>
              <Text style={[styles.categoryText, category === item ? styles.categoryTextActive : { color: '#DCE5FA' }]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Create Your App{'\n'}with <Text style={styles.heroAI}>AI</Text></Text>
            <Text style={styles.heroText}>Just describe your idea in simple words and let AI build your app. Publish it to Nax Store and share it with everyone.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AIAppBuilder')} style={styles.heroButton}>
              <Ionicons name="sparkles" size={17} color="#FFF" />
              <Text style={styles.heroButtonText}>Create App with AI</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.heroVisual}>
            <View style={styles.robotCircle}><Ionicons name="hardware-chip-outline" size={39} color="#67D9FF" /></View>
            <View style={styles.phoneMock}>
              <View style={styles.phoneTop}><Text style={styles.phoneTitle}>My App</Text><View style={styles.phoneDot} /></View>
              <View style={styles.phoneGrid}><View /><View /><View /><View /></View>
              <View style={styles.publishPill}><Text style={styles.publishPillText}>Publish</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity onPress={() => navigation.navigate('AIAppBuilder')} style={styles.actionTile}>
            <View style={[styles.actionIcon, { backgroundColor: '#153F2B' }]}><Ionicons name="add" size={27} color="#39E27D" /></View>
            <Text style={styles.actionTitle}>Create App{'\n'}with AI</Text>
            <Text style={styles.actionText}>Describe your app and let AI build it for you.</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={importApp} style={styles.actionTile}>
            <View style={[styles.actionIcon, { backgroundColor: '#122D55' }]}><Ionicons name="arrow-up" size={24} color="#3D9BFF" /></View>
            <Text style={styles.actionTitle}>Import App</Text>
            <Text style={styles.actionText}>Import your custom app or project.</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AIAppProjects')} style={styles.actionTile}>
            <View style={[styles.actionIcon, { backgroundColor: '#32144A' }]}><Ionicons name="cloud-upload-outline" size={24} color="#BF5AF2" /></View>
            <Text style={styles.actionTitle}>Publish</Text>
            <Text style={styles.actionText}>Make your app public on Nax Store.</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AIAppProjects')} style={styles.actionTile}>
            <View style={[styles.actionIcon, { backgroundColor: '#4A3010' }]}><Ionicons name="people-outline" size={24} color="#FFB82E" /></View>
            <Text style={styles.actionTitle}>Use & Share</Text>
            <Text style={styles.actionText}>Anyone can use and share apps.</Text>
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator color="#1887FF" size="large" style={{ marginTop: 35 }} /> : visible.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="storefront-outline" size={42} color="#7584A4" />
            <Text style={styles.emptyTitle}>No public apps yet</Text>
            <Text style={styles.emptyText}>Create or import an app, then publish it here.</Text>
          </View>
        ) : (
          <>
            <SectionHeader title="Popular on Nax Store" count={popular.length} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {popular.map(app => <PopularCard key={app.id} app={app} />)}
            </ScrollView>

            <SectionHeader title="Featured Apps" count={featured.length} />
            <View style={styles.twoColumn}>
              {featured.map(app => <FeaturedCard key={'f-' + app.id} app={app} />)}
            </View>

            <SectionHeader title="Latest Apps" count={latest.length} />
            <View style={styles.twoColumn}>
              {latest.map(app => <FeaturedCard key={'l-' + app.id} app={app} />)}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        <BottomItem icon="home" label="Home" active onPress={() => navigation.goBack()} />
        <BottomItem icon="add-circle-outline" label="Create" onPress={() => navigation.navigate('AIAppBuilder')} />
        <BottomItem icon="cloud-upload-outline" label="Import" onPress={importApp} />
        <BottomItem icon="grid-outline" label="My Apps" onPress={() => navigation.navigate('AIAppProjects')} />
        <BottomItem icon="person-outline" label="Profile" onPress={() => navigation.navigate('AIAppProjects')} />
      </View>
    </SafeAreaView>
  );
}

function SectionHeader({ title, count }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.seeAll}>{count} {count === 1 ? 'app' : 'apps'}  ›</Text>
    </View>
  );
}

function BottomItem({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.bottomItem}>
      <Ionicons name={icon} size={23} color={active ? '#1887FF' : '#B5C0D7'} />
      <Text style={[styles.bottomLabel, active && styles.bottomActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1},
  content:{paddingHorizontal:22,paddingTop:8,paddingBottom:105},
  header:{height:66,flexDirection:'row',alignItems:'center'},
  back:{width:35,alignItems:'flex-start'},
  brandWrap:{flex:1,flexDirection:'row',alignItems:'center'},
  naxMark:{width:43,height:43,borderRadius:14,alignItems:'center',justifyContent:'center',marginRight:7},
  naxMarkText:{fontSize:38,fontWeight:'900',fontStyle:'italic',color:'#168BFF'},
  brand:{fontSize:27,fontWeight:'900',color:'#55AFFF'},
  brandLight:{color:'#FFF'},
  tagline:{fontSize:10,color:'#94A7CF',marginTop:0},
  headerActions:{flexDirection:'row',alignItems:'center',gap:4},
  iconBtn:{width:35,height:40,alignItems:'center',justifyContent:'center'},
  profileCircle:{width:39,height:39,borderRadius:20,backgroundColor:'#087EFF',alignItems:'center',justifyContent:'center'},
  profileText:{color:'#FFF',fontSize:17,fontWeight:'900'},
  searchBox:{height:49,borderRadius:16,borderWidth:1,borderColor:'#263654',backgroundColor:'#0A1324',paddingHorizontal:13,flexDirection:'row',alignItems:'center'},
  searchInput:{flex:1,color:'#FFF',fontSize:14,marginHorizontal:8},
  categories:{gap:9,paddingTop:13,paddingBottom:15},
  category:{height:41,paddingHorizontal:17,borderRadius:13,borderWidth:1,borderColor:'#202F4B',backgroundColor:'#0A1324',alignItems:'center',justifyContent:'center'},
  categoryActive:{backgroundColor:'#087EFF',borderColor:'#087EFF'},
  categoryText:{fontSize:12,fontWeight:'800'},
  categoryTextActive:{color:'#FFF'},
  hero:{minHeight:283,borderRadius:21,borderWidth:1,borderColor:'#2A5BD0',overflow:'hidden',backgroundColor:'#0A1D68',flexDirection:'row',padding:20,position:'relative'},
  heroGlow:{position:'absolute',right:-50,top:-70,width:230,height:230,borderRadius:120,backgroundColor:'#6627F5',opacity:.55},
  heroCopy:{flex:1,zIndex:2},
  heroTitle:{fontSize:27,lineHeight:31,fontWeight:'900',color:'#FFF'},
  heroAI:{color:'#4CCBFF'},
  heroText:{fontSize:12,lineHeight:18,color:'#D5DDF4',marginTop:9,maxWidth:300},
  heroButton:{height:45,borderRadius:13,paddingHorizontal:14,backgroundColor:'#1687FF',flexDirection:'row',alignItems:'center',gap:7,alignSelf:'flex-start',marginTop:15},
  heroButtonText:{fontSize:12,fontWeight:'900',color:'#FFF'},
  heroVisual:{width:135,alignItems:'center',justifyContent:'center',position:'relative'},
  robotCircle:{position:'absolute',left:-4,top:25,width:67,height:67,borderRadius:34,backgroundColor:'#152C79',borderWidth:1,borderColor:'#4C8DFF',alignItems:'center',justifyContent:'center',zIndex:3},
  phoneMock:{width:92,height:176,borderRadius:18,backgroundColor:'#EAF0FF',padding:8,transform:[{rotate:'7deg'}],marginTop:27,borderWidth:3,borderColor:'#9FBBFF'},
  phoneTop:{height:24,backgroundColor:'#4659C9',borderRadius:8,paddingHorizontal:7,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  phoneTitle:{fontSize:9,fontWeight:'900',color:'#FFF'},
  phoneDot:{width:7,height:7,borderRadius:4,backgroundColor:'#5DE1B1'},
  phoneGrid:{flex:1,marginTop:9,flexDirection:'row',flexWrap:'wrap',gap:5},
  publishPill:{height:24,borderRadius:7,backgroundColor:'#1687FF',alignItems:'center',justifyContent:'center'},
  publishPillText:{fontSize:8,fontWeight:'900',color:'#FFF'},
  actionGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:14},
  actionTile:{width:'48.3%',minHeight:143,borderRadius:17,borderWidth:1,borderColor:'#1D2B45',backgroundColor:'#0A1324',padding:13},
  actionIcon:{width:42,height:42,borderRadius:13,alignItems:'center',justifyContent:'center'},
  actionTitle:{fontSize:14,fontWeight:'900',lineHeight:17,color:'#F5F8FF',marginTop:9},
  actionText:{fontSize:10,lineHeight:14,color:'#8F9DBB',marginTop:5},
  sectionHeader:{marginTop:23,marginBottom:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  sectionTitle:{fontSize:20,fontWeight:'900',color:'#F5F8FF'},
  seeAll:{fontSize:10,fontWeight:'800',color:'#3B91FF'},
  horizontalList:{gap:9,paddingBottom:2},
  popularCard:{width:102,minHeight:145,borderRadius:16,borderWidth:1,padding:10},
  smallIcon:{width:59,height:59,borderRadius:16,marginBottom:8},
  smallEmoji:{fontSize:30},
  popularName:{fontSize:12,fontWeight:'900'},
  popularCategory:{fontSize:9,marginTop:3,textTransform:'capitalize'},
  creator:{fontSize:8,marginTop:4},
  twoColumn:{flexDirection:'row',flexWrap:'wrap',gap:9},
  featureCard:{width:'48.6%',minHeight:156,borderRadius:16,borderWidth:1,padding:10},
  appIcon:{width:57,height:57,borderRadius:16,backgroundColor:'#172844',alignItems:'center',justifyContent:'center'},
  appEmoji:{fontSize:31},
  appImage:{width:'100%',height:'100%',borderRadius:16},
  featureBody:{flex:1,marginTop:7},
  featureName:{fontSize:12,fontWeight:'900'},
  featureDesc:{fontSize:9,lineHeight:13,marginTop:3,minHeight:26},
  meta:{fontSize:8,marginTop:4},
  featureActions:{flexDirection:'row',alignItems:'center',marginTop:7,gap:6},
  installBtn:{height:31,paddingHorizontal:13,borderRadius:9,alignItems:'center',justifyContent:'center'},
  installText:{fontSize:10,fontWeight:'900',color:'#FFF'},
  shareBtn:{width:31,height:31,borderRadius:9,borderWidth:1,alignItems:'center',justifyContent:'center'},
  empty:{borderRadius:18,borderWidth:1,borderColor:'#1E2C46',backgroundColor:'#0A1324',padding:30,alignItems:'center',marginTop:20},
  emptyTitle:{fontSize:16,fontWeight:'900',color:'#FFF',marginTop:8},
  emptyText:{fontSize:11,color:'#8F9DBB',textAlign:'center',marginTop:4},
  bottomNav:{position:'absolute',left:0,right:0,bottom:0,height:75,backgroundColor:'#07111F',borderTopWidth:1,borderTopColor:'#1C2A42',flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingBottom:7},
  bottomItem:{alignItems:'center',justifyContent:'center',minWidth:58},
  bottomLabel:{fontSize:10,color:'#AEB9CF',marginTop:3},
  bottomActive:{color:'#1687FF',fontWeight:'900'},
});
