import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import OnDeviceModelCatalog from '../ai/on-device/OnDeviceModelCatalog';
import DeviceCapabilityService from '../ai/on-device/DeviceCapabilityService';
import ModelCompatibilityService from '../ai/on-device/ModelCompatibilityService';
import ModelDownloadService from '../ai/on-device/ModelDownloadService';
import OnDeviceAIService from '../ai/on-device/OnDeviceAIService';
import AISettingsService from '../ai/AISettingsService';

export default function OnDeviceAISettingsScreen({ navigation }) {
  const { theme } = useTheme();
  const [device,setDevice]=useState(null),[models,setModels]=useState([]),[installed,setInstalled]=useState([]),[busy,setBusy]=useState({}),[loading,setLoading]=useState(true),[filter,setFilter]=useState('all');

  const load=async()=>{
    setLoading(true);
    try{
      const caps=await DeviceCapabilityService.scan();
      const catalog=await OnDeviceModelCatalog.loadCached();
      setDevice(caps);
      setModels(ModelCompatibilityService.rank(catalog,caps));
      setInstalled(await ModelDownloadService.listInstalled());
    }catch(e){Alert.alert('Offline AI',e?.message||'Could not scan this device.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{load();},[]);

  const visible=useMemo(()=>filter==='all'?models:models.filter(model=>model.role===filter),[models,filter]);
  const installedFor=model=>installed.some(item=>item.name===`${String(model.id).replace(/[^a-zA-Z0-9._-]/g,'_')}.gguf`);

  const activate=async model=>{
    const encoded=JSON.stringify(model);
    await AISettingsService.saveConnection({name:`Offline • ${model.name}`,type:'on-device',baseUrl:'on-device://',model:encoded,models:[encoded],apiKey:''});
  };

  const useModel=async model=>{
    setBusy(v=>({...v,[model.id]:'working'}));
    try{
      if(!installedFor(model)) await OnDeviceAIService.downloadModel(model,p=>setBusy(v=>({...v,[model.id]:`${Math.round(p*100)}%`})));
      await activate(model);
      await OnDeviceAIService.test(model);
      Alert.alert('Ready',`${model.name} is active and tested for offline use.`);
      await load();
    }catch(e){Alert.alert('Offline AI',e?.message||'Could not prepare this model.');}
    finally{setBusy(v=>({...v,[model.id]:null}));}
  };

  if(loading)return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}><View style={styles.center}><ActivityIndicator size="large" color={theme.blue}/></View></SafeAreaView>;

  return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}>
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={styles.back}><Ionicons name="chevron-back" size={25} color={theme.text}/></TouchableOpacity>
        <View style={{flex:1}}><Text style={[styles.eyebrow,{color:theme.sub}]}>AI & MODELS</Text><Text style={[styles.title,{color:theme.text}]}>Offline AI</Text></View>
        <TouchableOpacity onPress={load} style={[styles.refresh,{backgroundColor:theme.surface,borderColor:theme.border}]}><Ionicons name="refresh" size={18} color={theme.blue}/></TouchableOpacity>
      </View>

      <View style={[styles.hero,{backgroundColor:theme.surface,borderColor:theme.border}]}>
        <View style={{flex:1}}>
          <Text style={[styles.heroTitle,{color:theme.text}]}>Simple model choices</Text>
          <Text style={[styles.heroText,{color:theme.sub}]}>Pick one model for the job. Nax only shows practical mobile-sized GGUF builds by default.</Text>
        </View>
        <Ionicons name="phone-portrait-outline" size={30} color={theme.blue}/>
      </View>

      <View style={[styles.device,{backgroundColor:theme.surface,borderColor:theme.border}]}>
        <Text style={[styles.deviceTitle,{color:theme.text}]}>{device.model}</Text>
        <Text style={[styles.deviceMeta,{color:theme.sub}]}>{device.ramGB||'?'} GB RAM · {device.freeStorageGB||'?'} GB free · {device.architectures?.join(', ')||'CPU unknown'}</Text>
      </View>

      <View style={styles.filters}>
        {[['all','All'],['general','General'],['coding','Coding']].map(([id,label])=><TouchableOpacity key={id} onPress={()=>setFilter(id)} style={[styles.filter,{backgroundColor:filter===id?theme.blue:theme.surface,borderColor:filter===id?theme.blue:theme.border}]}><Text style={{color:filter===id?'#FFF':theme.text,fontWeight:'800',fontSize:12}}>{label}</Text></TouchableOpacity>)}
      </View>

      {visible.map(model=>{
        const c=model.compatibility,isInstalled=installedFor(model),state=busy[model.id],color=c.status==='supported'?theme.green:c.status==='heavy'?'#FF9500':'#FF3B30';
        return <View key={model.id} style={[styles.card,{backgroundColor:theme.surface,borderColor:c.status==='supported'&&c.label==='Recommended'?theme.blue:theme.border}]}>
          <View style={styles.cardTop}>
            <View style={{flex:1}}>
              <View style={styles.nameRow}><Text style={[styles.name,{color:theme.text}]}>{model.name}</Text><View style={[styles.badge,{backgroundColor:color+'18'}]}><Text style={{color,fontSize:9,fontWeight:'900'}}>{model.roleLabel}</Text></View></View>
              <Text style={[styles.meta,{color:theme.sub}]}>{model.parametersB}B · {model.quantization} · ~{model.sizeMB} MB</Text>
            </View>
          </View>
          <Text style={[styles.desc,{color:theme.sub}]}>{model.description}</Text>
          <Text style={[styles.reason,{color}]}>{c.label} · {c.reason}</Text>
          <TouchableOpacity disabled={c.status==='unsupported'||!!state} onPress={()=>useModel(model)} style={[styles.button,{backgroundColor:c.status==='unsupported'?'#777':theme.blue}]}>
            <Text style={styles.buttonText}>{state|| (isInstalled?'Use & test offline':'Download')}</Text>
          </TouchableOpacity>
          {isInstalled?<TouchableOpacity onPress={async()=>{await OnDeviceAIService.removeModel(model);await load();}}><Text style={[styles.delete,{color:'#FF3B30'}]}>Remove downloaded model</Text></TouchableOpacity>:null}
        </View>;
      })}

      <View style={[styles.discover,{backgroundColor:theme.surface,borderColor:theme.border}]}>
        <Text style={[styles.discoverTitle,{color:theme.text}]}>More models</Text>
        <Text style={[styles.desc,{color:theme.sub}]}>The catalog is intentionally small. If you need another GGUF model, search Hugging Face and Nax can discover downloadable builds under 3 GB.</Text>
        <TouchableOpacity style={[styles.button,{backgroundColor:theme.surfaceStrong||theme.surface,borderColor:theme.border,borderWidth:1}]} onPress={async()=>{try{setLoading(true);const updated=await OnDeviceModelCatalog.refresh('GGUF Instruct');setModels(ModelCompatibilityService.rank(updated,device));}catch(e){Alert.alert('Model catalog',e?.message||'Could not refresh the catalog.');}finally{setLoading(false);}}}>
          <Text style={{color:theme.text,fontWeight:'900'}}>Discover more GGUF models</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1},center:{flex:1,justifyContent:'center',alignItems:'center'},scroll:{padding:18,paddingBottom:100},
  header:{flexDirection:'row',alignItems:'center',marginBottom:16},back:{width:40,height:40,alignItems:'flex-start',justifyContent:'center'},refresh:{width:40,height:40,borderRadius:13,borderWidth:1,alignItems:'center',justifyContent:'center'},eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.5},title:{fontSize:28,fontWeight:'900',marginTop:2},
  hero:{borderWidth:1,borderRadius:20,padding:16,flexDirection:'row',alignItems:'center'},heroTitle:{fontSize:18,fontWeight:'900'},heroText:{fontSize:12,lineHeight:18,marginTop:4},
  device:{borderWidth:1,borderRadius:16,padding:13,marginTop:10},deviceTitle:{fontSize:13,fontWeight:'900'},deviceMeta:{fontSize:11,marginTop:3},
  filters:{flexDirection:'row',gap:8,marginVertical:14},filter:{borderWidth:1,borderRadius:12,paddingHorizontal:13,paddingVertical:8},
  card:{borderWidth:1,borderRadius:19,padding:15,marginBottom:10},cardTop:{flexDirection:'row'},nameRow:{flexDirection:'row',alignItems:'center',gap:7},name:{fontSize:16,fontWeight:'900'},badge:{paddingHorizontal:7,paddingVertical:4,borderRadius:8},meta:{fontSize:11,marginTop:4},desc:{fontSize:12,lineHeight:17,marginTop:9},reason:{fontSize:11,lineHeight:16,marginTop:8,fontWeight:'800'},button:{height:44,borderRadius:13,alignItems:'center',justifyContent:'center',marginTop:12},buttonText:{color:'#FFF',fontWeight:'900'},delete:{fontSize:11,fontWeight:'800',textAlign:'center',paddingTop:11},discover:{borderWidth:1,borderRadius:19,padding:15,marginTop:4},discoverTitle:{fontSize:15,fontWeight:'900'}
});
