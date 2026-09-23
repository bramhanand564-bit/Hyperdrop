import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import PortalStoreAPI from '../api/PortalStoreAPI';
import { URLValidator } from '../security/URLValidator';

const CATEGORIES = ['All','Game','Mini-App','AI Bot','Utility','Productivity','Finance','Other'];

export default function PortalStoreScreen({ navigation }) {
  const { isDark } = useTheme();
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name:'', description:'', category:'Utility', url:'', iconUrl:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await PortalStoreAPI.list({ category: category === 'All' ? '' : category, search })); }
    catch (e) { Alert.alert('Store', e.message); }
    finally { setLoading(false); }
  }, [category, search]);

  useEffect(() => { load(); }, [load]);

  const addToStore = async () => {
    if (!form.name || !form.description || !form.url) return Alert.alert('Missing fields','Name, description and URL required.');
    const check = URLValidator.scanMiniAppUrl(form.url);
    if (!check.isSafe) return Alert.alert('Security Block', check.message);
    setAdding(true);
    try {
      await PortalStoreAPI.add(form);
      setForm({ name:'', description:'', category:'Utility', url:'', iconUrl:'' });
      Alert.alert('Added', 'Your item is now in Nax Portal Store.');
      load();
    } catch (e) { Alert.alert('Add failed', e.message); }
    finally { setAdding(false); }
  };

  const bg = isDark ? '#0A0A0C' : '#F4F6F8';
  const fg = isDark ? '#F5F5F7' : '#17181A';
  const card = isDark ? '#151518' : '#FFF';
  const sub = isDark ? '#9999A3' : '#687386';

  return (
    <SafeAreaView style={[styles.safe,{backgroundColor:bg}]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color={fg}/></TouchableOpacity>
        <Text style={[styles.title,{color:fg}]}>Nax Store</Text>
        <TouchableOpacity onPress={() => setAdding(v => !v)}><Ionicons name={adding ? 'close' : 'add'} size={25} color="#087EFF"/></TouchableOpacity>
      </View>
      {adding ? <View style={[styles.addCard,{backgroundColor:card}]}>
        <Text style={[styles.addTitle,{color:fg}]}>Add to Store</Text>
        {[
          ['name','Name'],['description','Short description'],['url','App / Web URL'],['iconUrl','Icon URL (optional)']
        ].map(([key,placeholder]) => <TextInput key={key} value={form[key]} onChangeText={v=>setForm(p=>({...p,[key]:v}))} placeholder={placeholder} placeholderTextColor={sub} autoCapitalize="none" style={[styles.input,{color:fg,borderColor:isDark?'#2A2A2F':'#E1E5EA'}]}/>)}
        <View style={styles.catRow}>{CATEGORIES.slice(1).map(c=><TouchableOpacity key={c} onPress={()=>setForm(p=>({...p,category:c}))} style={[styles.cat,{backgroundColor:form.category===c?'#087EFF':'transparent',borderColor:'#087EFF'}]}><Text style={{color:form.category===c?'#FFF':'#087EFF',fontSize:11,fontWeight:'700'}}>{c}</Text></TouchableOpacity>)}</View>
        <TouchableOpacity style={styles.primary} onPress={addToStore} disabled={adding}><Text style={styles.primaryText}>Publish Item</Text></TouchableOpacity>
      </View> : null}
      <View style={styles.searchWrap}><Ionicons name="search" size={17} color={sub}/><TextInput value={search} onChangeText={setSearch} placeholder="Search store" placeholderTextColor={sub} style={[styles.search,{color:fg}]}/></View>
      <View style={styles.filters}><FlatList horizontal data={CATEGORIES} keyExtractor={x=>x} showsHorizontalScrollIndicator={false} renderItem={({item:c})=><TouchableOpacity onPress={()=>setCategory(c)} style={[styles.filter,{backgroundColor:category===c?'#087EFF':card}]}><Text style={{color:category===c?'#FFF':sub,fontWeight:'700',fontSize:12}}>{c}</Text></TouchableOpacity>}/></View>
      {loading ? <ActivityIndicator style={{flex:1}}/> : <FlatList data={items} keyExtractor={x=>x.id} contentContainerStyle={{padding:16,paddingBottom:50}} ListEmptyComponent={<View style={styles.empty}><Text style={[styles.emptyTitle,{color:fg}]}>Store is empty</Text><Text style={{color:sub,textAlign:'center'}}>Add the first app, bot or tool.</Text></View>} renderItem={({item})=><TouchableOpacity style={[styles.item,{backgroundColor:card}]} onPress={async()=>{await PortalStoreAPI.recordView(item.id).catch(()=>{}); navigation.navigate('WebPortal',{title:item.name,url:item.url});}}><View style={styles.icon}><Text style={styles.iconText}>{String(item.name||'A').slice(0,1).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={[styles.itemName,{color:fg}]}>{item.name}</Text><Text style={{color:sub,fontSize:11}}>{item.category} • {item.creatorName||'Creator'}</Text><Text style={{color:sub,fontSize:12,marginTop:5}} numberOfLines={2}>{item.description}</Text></View><Ionicons name="chevron-forward" size={18} color={sub}/></TouchableOpacity>}/>}
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({safe:{flex:1},header:{height:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,borderBottomWidth:1,borderBottomColor:'#E5E7EB'},title:{fontSize:18,fontWeight:'800'},addCard:{margin:14,padding:14,borderRadius:16},addTitle:{fontSize:17,fontWeight:'800',marginBottom:10},input:{height:46,borderWidth:1,borderRadius:11,paddingHorizontal:12,marginBottom:8},catRow:{flexDirection:'row',flexWrap:'wrap',gap:7,marginVertical:6},cat:{paddingHorizontal:10,paddingVertical:7,borderRadius:16,borderWidth:1},primary:{height:46,borderRadius:12,backgroundColor:'#087EFF',alignItems:'center',justifyContent:'center',marginTop:8},primaryText:{color:'#FFF',fontWeight:'800'},searchWrap:{margin:14,marginBottom:8,height:46,borderRadius:12,borderWidth:1,borderColor:'#E1E5EA',backgroundColor:'#FFF',flexDirection:'row',alignItems:'center',paddingHorizontal:12},search:{flex:1,marginLeft:8},filters:{height:44,paddingLeft:14},filter:{paddingHorizontal:13,paddingVertical:8,borderRadius:18,marginRight:7,height:34},item:{marginBottom:10,borderRadius:16,padding:13,flexDirection:'row',alignItems:'center',gap:12},icon:{width:48,height:48,borderRadius:13,backgroundColor:'#087EFF',alignItems:'center',justifyContent:'center'},iconText:{color:'#FFF',fontSize:18,fontWeight:'900'},itemName:{fontSize:15,fontWeight:'800'},empty:{alignItems:'center',padding:50},emptyTitle:{fontSize:18,fontWeight:'800',marginBottom:5}});
