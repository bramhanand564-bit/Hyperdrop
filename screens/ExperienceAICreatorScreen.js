import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AIService from '../ai/AIService';

const FALLBACK_PROMPT = 'Create a simple 2-player Tic-Tac-Toe game with Join, Play and Share actions.';

function cleanId(value, fallback='action') {
  return String(value || fallback).trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,40) || fallback;
}

function parseDraft(text) {
  const raw=String(text||'').trim().replace(/^\`\`\`json/i,'').replace(/^\`\`\`/,'').replace(/\`\`\`$/,'').trim();
  let parsed;
  try { parsed=JSON.parse(raw); } catch (_) {
    const match=raw.match(/\{[\s\S]*\}/);
    if(!match) throw new Error('AI returned an invalid Experience draft. Try a shorter prompt.');
    parsed=JSON.parse(match[0]);
  }
  const actions=Array.isArray(parsed.actions)?parsed.actions:[], fields=Array.isArray(parsed.fields)?parsed.fields:[];
  if(!String(parsed.name||'').trim() || !actions.length) throw new Error('AI draft needs a name and at least one action.');
  return {
    name:String(parsed.name).trim().slice(0,60),
    description:String(parsed.description||'').trim().slice(0,240),
    icon:String(parsed.icon||'⚡').slice(0,4),
    template:['task','reward','game','quiz','form','community','media','transfer','custom'].includes(parsed.template)?parsed.template:'custom',
    actions:actions.slice(0,8).map((a,i)=>({id:cleanId(a.id||a.label,'action_'+(i+1)),label:String(a.label||'Action '+(i+1)).trim().slice(0,40),primary:Boolean(a.primary)||i===0,access:['anyone','creator','admin'].includes(a.access)?a.access:'anyone'})),
    fields:fields.slice(0,8).map((f,i)=>({id:cleanId(f.id,'field_'+(i+1)),type:['Text','Number','Image','Date','Time','Checkbox','Rating','File'].includes(f.type)?f.type:'Text',label:String(f.label||'Field '+(i+1)).trim().slice(0,50),required:Boolean(f.required)})),
    rewardEnabled:Boolean(parsed.rewardEnabled),
    rewardPoints:Math.max(0,Math.min(100000,Number(parsed.rewardPoints)||0)),
  };
}

export default function ExperienceAICreatorScreen({ navigation }) {
  const { theme }=useTheme();
  const [prompt,setPrompt]=useState('');
  const [busy,setBusy]=useState(false);

  const generate=async()=>{
    const request=prompt.trim()||FALLBACK_PROMPT;
    setBusy(true);
    try{
      const systemPrompt=[
        'You are Nax Experience Creator.',
        'Turn the user request into a small native Experience draft.',
        'Return JSON only. No markdown. No explanations.',
        'Schema: {"name":string,"description":string,"icon":string,"template":"task|reward|game|quiz|form|community|media|transfer|custom","actions":[{"id":string,"label":string,"primary":boolean,"access":"anyone|creator|admin"}],"fields":[{"id":string,"type":"Text|Number|Image|Date|Time|Checkbox|Rating|File","label":string,"required":boolean}],"rewardEnabled":boolean,"rewardPoints":number}.',
        'Keep it simple: max 8 actions and 8 fields. Prefer native actions/fields. Do not invent URLs, APIs, secrets or code.',
        'For games, use template game and keep actions such as Join, Play, Share.',
      ].join(' ');
      const output=await AIService.generateText({messages:[{role:'user',content:request}],systemPrompt,temperature:0.15,maxTokens:900});
      const draft=parseDraft(output);
      navigation.navigate('ExperienceBuilder',{template:draft.template,aiDraft:draft});
    }catch(e){
      Alert.alert('AI Creator',e?.message||'Could not create the Experience. Connect an AI model in Settings → AI & Models.');
    }finally{setBusy(false);}
  };

  return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={styles.back}><Ionicons name="chevron-back" size={25} color={theme.text}/></TouchableOpacity>
        <View style={{flex:1}}><Text style={[styles.eyebrow,{color:theme.sub}]}>CREATE WITH AI</Text><Text style={[styles.title,{color:theme.text}]}>Describe it.</Text></View>
      </View>
      <View style={[styles.hero,{backgroundColor:theme.surface,borderColor:theme.border}]}>
        <View style={[styles.heroIcon,{backgroundColor:'rgba(8,126,255,.10)'}]}><Ionicons name="sparkles" size={22} color={theme.blue}/></View>
        <Text style={[styles.heroTitle,{color:theme.text}]}>One prompt → editable Experience</Text>
        <Text style={[styles.heroText,{color:theme.sub}]}>AI creates only the small native structure. You review it in the normal builder before publishing.</Text>
      </View>
      <Text style={[styles.label,{color:theme.text}]}>What do you want to build?</Text>
      <TextInput value={prompt} onChangeText={setPrompt} placeholder={FALLBACK_PROMPT} placeholderTextColor={theme.sub} multiline style={[styles.input,{backgroundColor:theme.surface,borderColor:theme.border,color:theme.text}]}/>
      <View style={[styles.note,{backgroundColor:theme.surface,borderColor:theme.border}]}>
        <Ionicons name="shield-checkmark-outline" size={18} color={theme.green}/>
        <Text style={[styles.noteText,{color:theme.sub}]}>No raw code, API keys or external URLs are generated. The result is validated and opened in the existing Experience Builder.</Text>
      </View>
      <TouchableOpacity disabled={busy} onPress={generate} style={[styles.button,{backgroundColor:theme.blue,opacity:busy?.65:1}]}>
        {busy?<ActivityIndicator color="#FFF"/>:<><Ionicons name="sparkles" size={18} color="#FFF"/><Text style={styles.buttonText}>Create Experience</Text></>}
      </TouchableOpacity>
      <Text style={[styles.hint,{color:theme.sub}]}>Examples</Text>
      {['Make a simple 2-player Tic-Tac-Toe game','Create a daily habit tracker with points','Build a short quiz with 5 questions'].map(item=><TouchableOpacity key={item} onPress={()=>setPrompt(item)} style={[styles.example,{backgroundColor:theme.surface,borderColor:theme.border}]}><Text style={[styles.exampleText,{color:theme.text}]}>{item}</Text><Ionicons name="arrow-forward" size={16} color={theme.sub}/></TouchableOpacity>)}
    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
 safe:{flex:1},scroll:{padding:18,paddingBottom:100},header:{flexDirection:'row',alignItems:'center',marginBottom:18},back:{width:40,height:40,justifyContent:'center'},eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.5},title:{fontSize:29,fontWeight:'900',marginTop:2},
 hero:{borderWidth:1,borderRadius:22,padding:17,marginBottom:20},heroIcon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'},heroTitle:{fontSize:17,fontWeight:'900',marginTop:12},heroText:{fontSize:12,lineHeight:18,marginTop:5},label:{fontSize:14,fontWeight:'900',marginBottom:8},input:{minHeight:140,borderWidth:1,borderRadius:18,padding:15,fontSize:14,textAlignVertical:'top'},note:{borderWidth:1,borderRadius:16,padding:13,marginTop:12,flexDirection:'row',gap:9},noteText:{flex:1,fontSize:11,lineHeight:17},button:{height:52,borderRadius:16,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,marginTop:14},buttonText:{color:'#FFF',fontWeight:'900',fontSize:15},hint:{fontSize:11,fontWeight:'900',letterSpacing:1,marginTop:25,marginBottom:8},example:{borderWidth:1,borderRadius:15,padding:14,marginBottom:8,flexDirection:'row',alignItems:'center'},exampleText:{flex:1,fontSize:12,fontWeight:'700'}
});
