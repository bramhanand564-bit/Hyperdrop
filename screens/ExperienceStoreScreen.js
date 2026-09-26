import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ExperienceAPI from '../api/ExperienceAPI';

const CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'transfer', label: 'Tools' },
  { id: 'media', label: 'Media' },
  { id: 'game', label: 'Games' },
  { id: 'task', label: 'Work' },
  { id: 'custom', label: 'Custom' },
];

export default function ExperienceStoreScreen({ navigation }) {
  const { theme } = useTheme();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [template, setTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await ExperienceAPI.list({ search: query, template, limitCount: 80 })); }
    catch (e) { Alert.alert('Store', e.message || 'Could not load the Experience Store.'); }
    finally { setLoading(false); }
  }, [query, template]);

  useEffect(() => { load(); }, [load]);

  const customize = async item => {
    setBusy(item.id);
    try {
      const clone = await ExperienceAPI.cloneFromStore(item.id);
      navigation.navigate('ExperienceBuilder', { experienceId: clone.id, template: clone.template });
    } catch (e) { Alert.alert('Customize', e.message || 'Could not create a customizable copy.'); }
    finally { setBusy(''); }
  };

  const filtered = useMemo(() => items, [items]);

  return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.top}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color={theme.text}/></TouchableOpacity>
        <View style={{flex:1,marginLeft:10}}>
          <Text style={[styles.title,{color:theme.text}]}>Experience Store</Text>
          <Text style={[styles.sub,{color:theme.sub}]}>Discover creator-built Experiences, customize them, or start a new one.</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ExperienceBuilder',{template:'custom'})} style={[styles.add,{backgroundColor:theme.blue}]}><Ionicons name="add" size={21} color="#FFF"/></TouchableOpacity>
      </View>

      <View style={[styles.search,{backgroundColor:theme.surface,borderColor:theme.border}]}>
        <Ionicons name="search" size={18} color={theme.sub}/>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search experiences, tools, games..." placeholderTextColor={theme.sub} style={{flex:1,color:theme.text,marginLeft:8}} returnKeyType="search"/>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
        {CATEGORIES.map(c=><TouchableOpacity key={c.id} onPress={()=>setTemplate(c.id)} style={[styles.chip,{backgroundColor:template===c.id?theme.blue:theme.surface,borderColor:template===c.id?theme.blue:theme.border}]}><Text style={{color:template===c.id?'#FFF':theme.text,fontWeight:'800',fontSize:11}}>{c.label}</Text></TouchableOpacity>)}
      </ScrollView>

      <View style={[styles.banner,{backgroundColor:theme.surface,borderColor:theme.border}]}>
        <Text style={{fontSize:28}}>🧩</Text><View style={{flex:1,marginLeft:11}}><Text style={[styles.bannerTitle,{color:theme.text}]}>Discover, customize, publish</Text><Text style={[styles.bannerText,{color:theme.sub}]}>Start from a creator-built Experience, customize its Gateway, then share the same live Experience in Chat.</Text></View>
      </View>

      <Text style={[styles.section,{color:theme.text}]}>Discover</Text>
      {loading?<ActivityIndicator color={theme.blue} style={{marginTop:25}}/>:filtered.length===0?<Text style={{color:theme.sub}}>No published Experiences found.</Text>:filtered.map(item=><View key={item.id} style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.border}]}>
        <View style={styles.head}><Text style={styles.icon}>{item.icon}</Text><View style={{flex:1}}><Text style={[styles.name,{color:theme.text}]}>{item.name}</Text><Text style={[styles.meta,{color:theme.sub}]}>{item.template} · by {item.creatorName}</Text></View></View>
        <Text style={[styles.desc,{color:theme.sub}]} numberOfLines={3}>{item.description||'Interactive experience'}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={()=>navigation.navigate('ExperienceRuntime',{experienceId:item.id})} style={[styles.button,{backgroundColor:theme.blue}]}><Ionicons name="play" size={15} color="#FFF"/><Text style={styles.buttonText}>Use</Text></TouchableOpacity>
          <TouchableOpacity disabled={busy===item.id} onPress={()=>customize(item)} style={[styles.button,{backgroundColor:theme.bg,borderWidth:1,borderColor:theme.border}]}><Ionicons name="construct-outline" size={15} color={theme.text}/><Text style={{color:theme.text,fontWeight:'900',fontSize:11}}>{busy===item.id?'Creating…':'Customize'}</Text></TouchableOpacity>
        </View>
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1},content:{padding:18,paddingBottom:80},top:{flexDirection:'row',alignItems:'center',marginBottom:16},title:{fontSize:22,fontWeight:'900'},sub:{fontSize:11,lineHeight:16,marginTop:3},add:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'},search:{height:46,borderWidth:1,borderRadius:14,paddingHorizontal:12,flexDirection:'row',alignItems:'center',marginBottom:10},chip:{paddingHorizontal:13,paddingVertical:9,borderRadius:12,borderWidth:1},banner:{borderWidth:1,borderRadius:20,padding:15,flexDirection:'row',alignItems:'center',marginTop:14},bannerTitle:{fontSize:15,fontWeight:'900'},bannerText:{fontSize:11,lineHeight:16,marginTop:3},section:{fontSize:18,fontWeight:'900',marginTop:22,marginBottom:10},card:{borderWidth:1,borderRadius:19,padding:14,marginBottom:10},head:{flexDirection:'row',alignItems:'center'},icon:{fontSize:30,width:45},name:{fontSize:16,fontWeight:'900'},meta:{fontSize:10,marginTop:3},desc:{fontSize:12,lineHeight:18,marginTop:9},actions:{flexDirection:'row',gap:8,marginTop:12},button:{height:40,borderRadius:12,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,flex:1},buttonText:{color:'#FFF',fontWeight:'900',fontSize:11}});
