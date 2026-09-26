import React, { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ExperienceAPI from '../api/ExperienceAPI';
import { URLValidator } from '../security/URLValidator';

const ACTION_PRESETS = ['Accept','Start','Complete','Join','Vote','Submit','Claim','Play','Watch','Upload','Approve','Reject','Share','Pay','Book','Report'];
const FIELD_PRESETS = ['Text','Number','Image','Date','Time','Checkbox','Rating','File'];
const TEMPLATE_DEFAULTS = {
  task:{name:'Daily Task',icon:'📋',description:'Assign, accept and complete work.',actions:['Accept','Complete'],fields:[['Text','Task details'],['Date','Due date']]},
  reward:{name:'Reward Challenge',icon:'🎁',description:'A challenge with progress and virtual points.',actions:['Start','Complete','Claim'],fields:[['Number','Progress'],['Date','Deadline']]},
  game:{name:'Game Challenge',icon:'🎮',description:'A shareable challenge with a result.',actions:['Join','Play','Share'],fields:[['Text','Opponent'],['Number','Score']]},
  quiz:{name:'Quiz',icon:'🧠',description:'Questions, answers and results.',actions:['Start','Submit','Share'],fields:[['Text','Answer'],['Number','Score']]},
  form:{name:'Form',icon:'📝',description:'Collect structured responses.',actions:['Submit','Share'],fields:[['Text','Response'],['Checkbox','Confirm']]},
  community:{name:'Community Activity',icon:'👥',description:'Group participation and actions.',actions:['Join','Vote','Complete'],fields:[['Text','Choice'],['Date','Date']]},
  media:{name:'Media Experience',icon:'🎬',description:'A shareable media experience.',actions:['Watch','Share'],fields:[['Text','Media title'],['Image','Poster']]},
  transfer:{name:'P2P Transfer',icon:'📦',description:'A peer-to-peer transfer experience.',actions:['Join','Accept','Complete'],fields:[['File','File'],['Number','Size']]},
  custom:{name:'My Experience',icon:'⚡',description:'Build anything people can use in Chat.',actions:['Start','Complete'],fields:[['Text','Response']]},
};

const slug = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'') || 'action';

export default function ExperienceBuilder({ route, navigation }) {
  const { theme } = useTheme();
  const template = route?.params?.template || 'custom';
  const experienceId = route?.params?.experienceId || null;
  const initial = TEMPLATE_DEFAULTS[template] || TEMPLATE_DEFAULTS.custom;
  const [name,setName]=useState(initial.name),[description,setDescription]=useState(initial.description),[icon,setIcon]=useState(initial.icon);
  const [actions,setActions]=useState(initial.actions.map((label,i)=>({id:slug(label),label,primary:i===0})));
  const [fields,setFields]=useState(initial.fields.map(([type,label],i)=>({id:`field_${i+1}`,type,label,required:['Text','Number'].includes(type)})));
  const [trigger,setTrigger]=useState(actions[0]?.id || 'on_action');
  const [rewardEnabled,setRewardEnabled]=useState(false),[rewardPoints,setRewardPoints]=useState('100');
  const [webUrl,setWebUrl]=useState('');
  const [customAction,setCustomAction]=useState(''),[customFieldLabel,setCustomFieldLabel]=useState('');
  const [publishing,setPublishing]=useState(false),[loadingExisting,setLoadingExisting]=useState(Boolean(experienceId));
  useEffect(()=>{
    let mounted=true;
    if(!experienceId){setLoadingExisting(false);return undefined;}
    ExperienceAPI.get(experienceId).then(item=>{
      if(!mounted||!item)return;
      setName(item.name||initial.name);setDescription(item.description||'');setIcon(item.icon||initial.icon);
      const existingActions = item.schema?.actions || initial.actions.map((label,i)=>({id:slug(label),label,primary:i===0}));
      const primaryId = existingActions.find(a=>a.primary)?.id || existingActions[0]?.id;
      setActions(existingActions.map(a=>({...a,id:a.id||slug(a.label),primary:(a.id||slug(a.label))===primaryId})));
      setFields((item.schema?.fields||initial.fields.map(([type,label],i)=>({id:`field_${i+1}`,type,label,required:['Text','Number'].includes(type)}))).map((field,i)=>({...field,id:field.id||`field_${i+1}`})));
      setRewardEnabled(Boolean(item.schema?.settings?.rewardEnabled));setRewardPoints(String(item.schema?.settings?.rewardPoints||100));setTrigger(item.schema?.settings?.trigger||item.schema?.actions?.[0]?.id||'');setWebUrl(item.schema?.web?.url||'');
    }).catch(()=>{}).finally(()=>mounted&&setLoadingExisting(false));
    return ()=>{mounted=false;};
  },[experienceId]);

  const addAction = label => {
    const clean=String(label||'').trim();
    if(!clean)return;
    const id=slug(clean)+`_${Date.now().toString(36).slice(-4)}`;
    setActions(prev=>[...prev,{id,label:clean,primary:prev.length===0}]);
  };
  const addPresetAction = label => setActions(prev=>prev.some(a=>a.label===label)?prev:[...prev,{id:slug(label),label,primary:prev.length===0}]);
  const removeAction=id=>{
    setActions(prev=>{
      const next=prev.filter(a=>a.id!==id);
      setTrigger(prevTrigger=>prevTrigger===id?(next[0]?.id||''):prevTrigger);
      if(next.length && !next.some(a=>a.primary)) next[0]={...next[0],primary:true};
      return next;
    });
  };
  const togglePrimary=id=>setActions(prev=>prev.map(a=>({...a,primary:a.id===id})));
  const addField = (type,label) => {
    const clean=String(label||'').trim() || type;
    setFields(prev=>[...prev,{id:`field_${Date.now().toString(36)}`,type,label:clean,required:['Text','Number'].includes(type)}]);
  };
  const removeField=id=>setFields(prev=>prev.filter(f=>f.id!==id));
  const toggleRequired=id=>setFields(prev=>prev.map(f=>f.id===id?{...f,required:!f.required}:f));

  const schema=useMemo(()=>({
    version:3,
    fields,
    actions,
    rules: actions.map(action=>({
      when: action.id,
      set: {
        status: ['complete','claim','submit','book','pay','approve'].includes(String(action.label).toLowerCase()) ? 'completed' : (['start','accept','join'].includes(String(action.label).toLowerCase()) ? 'active' : 'ready'),
        pointsDelta: rewardEnabled && action.id === trigger ? Math.max(0,Number(rewardPoints)||0) : 0,
      },
    })),
    ui:{card:['icon','name','description','primaryActions'],full:['header','fields','status','actions','web']},
    web:webUrl.trim()?{url:webUrl.trim()}:null,
    settings:{rewardEnabled,rewardPoints:Math.max(0,Number(rewardPoints)||0),trigger},
  }),[actions,fields,rewardEnabled,rewardPoints,trigger]);

  const publish=async()=>{
    if(!name.trim())return Alert.alert('Name required','Give your experience a name.');
    if(!actions.length)return Alert.alert('Action required','Add at least one action.');
    if(webUrl.trim() && !URLValidator.validateExternalLink(webUrl.trim()).valid)return Alert.alert('Invalid URL','Only a valid HTTPS URL can be used.');
    setPublishing(true);
    try{
      const saved=experienceId
        ? await ExperienceAPI.update(experienceId,{name,description,icon,template,schema})
        : await ExperienceAPI.create({name,description,icon,template,schema});
      Alert.alert(experienceId?'Updated':'Published', experienceId?'Your Experience was updated.':'Your Experience is live and shareable in Chat.',[
        {text:'Open',onPress:()=>navigation.replace('ExperienceRuntime',{experienceId:saved.id})},
        {text:'Dashboard',onPress:()=>navigation.replace('ExperienceDashboard')}
      ]);
    }catch(e){Alert.alert('Publish failed',e.message||'Unable to publish.')}
    finally{setPublishing(false);}
  };

  return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{loadingExisting?<View style={{padding:12,borderRadius:12,backgroundColor:theme.surface,marginBottom:10}}><Text style={{color:theme.sub,fontSize:12}}>Loading existing Experience…</Text></View>:null}
      <View style={styles.top}><TouchableOpacity onPress={()=>navigation.goBack()}><Ionicons name="chevron-back" size={26} color={theme.text}/></TouchableOpacity><Text style={[styles.title,{color:theme.text}]}>Create</Text><View style={{width:26}}/></View>

      <View style={[styles.preview,{backgroundColor:theme.surface,borderColor:theme.border}]}>
        <Text style={styles.previewIcon}>{icon}</Text>
        <View style={{flex:1}}>
          <Text style={[styles.previewName,{color:theme.text}]}>{name||'Untitled'}</Text>
          <Text style={[styles.previewDesc,{color:theme.sub}]} numberOfLines={2}>{description||'Interactive experience'}</Text>
          <View style={styles.chips}>{actions.slice(0,4).map(a=><View key={a.id} style={[styles.chip,{backgroundColor:theme.bg}]}><Text style={{color:theme.text,fontSize:10,fontWeight:'800'}}>{a.label}</Text></View>)}</View>
        </View>
      </View>

      <Text style={[styles.label,{color:theme.text}]}>Basic</Text>
      <View style={styles.row}><TextInput value={icon} onChangeText={setIcon} maxLength={2} style={[styles.iconInput,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]}/><TextInput value={name} onChangeText={setName} maxLength={80} style={[styles.input,{flex:1,color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]} placeholder="Name" placeholderTextColor={theme.sub}/></View>
      <TextInput value={description} onChangeText={setDescription} multiline maxLength={500} style={[styles.textarea,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]} placeholder="Describe what people can do" placeholderTextColor={theme.sub}/>
      <Text style={[styles.label,{color:theme.text}]}>Full experience URL (optional)</Text>
      <TextInput value={webUrl} onChangeText={setWebUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={[styles.input,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]} placeholder="https://your-experience.example" placeholderTextColor={theme.sub}/>

      <View style={styles.sectionHead}><Text style={[styles.label,{color:theme.text,marginTop:0}]}>Actions</Text><Text style={{color:theme.sub,fontSize:11}}>{actions.length}</Text></View>
      <View style={styles.list}>{actions.map(action=><View key={action.id} style={[styles.listRow,{backgroundColor:theme.surface,borderColor:theme.border}]}><View style={{flex:1}}><Text style={[styles.listTitle,{color:theme.text}]}>{action.label}</Text><Text style={{color:theme.sub,fontSize:10}}>{action.primary?'Primary action':'Secondary action'}</Text></View><TouchableOpacity onPress={()=>togglePrimary(action.id)} style={[styles.miniBtn,{backgroundColor:action.primary?theme.blue:theme.bg,borderColor:theme.border}]}><Text style={{color:action.primary?'#FFF':theme.text,fontSize:10,fontWeight:'900'}}>Primary</Text></TouchableOpacity><TouchableOpacity onPress={()=>removeAction(action.id)}><Ionicons name="trash-outline" size={18} color="#FF3B30"/></TouchableOpacity></View>)}</View>
      <View style={styles.chips}>{ACTION_PRESETS.map(a=><TouchableOpacity key={a} onPress={()=>addPresetAction(a)} style={[styles.option,{backgroundColor:theme.surface,borderColor:theme.border}]}><Text style={{color:theme.text,fontSize:11,fontWeight:'800'}}>+ {a}</Text></TouchableOpacity>)}</View>
      <View style={styles.inlineAdd}><TextInput value={customAction} onChangeText={setCustomAction} placeholder="Custom action (e.g. Approve request)" placeholderTextColor={theme.sub} style={[styles.input,{flex:1,color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]}/><TouchableOpacity onPress={()=>{addAction(customAction);setCustomAction('')}} style={[styles.addBtn,{backgroundColor:theme.blue}]}><Ionicons name="add" size={19} color="#FFF"/></TouchableOpacity></View>

      <View style={styles.sectionHead}><Text style={[styles.label,{color:theme.text,marginTop:18}]}>Fields</Text><Text style={{color:theme.sub,fontSize:11}}>{fields.length}</Text></View>
      <View style={styles.list}>{fields.map(field=><View key={field.id} style={[styles.listRow,{backgroundColor:theme.surface,borderColor:theme.border}]}><View style={{flex:1}}><Text style={[styles.listTitle,{color:theme.text}]}>{field.label}</Text><Text style={{color:theme.sub,fontSize:10}}>{field.type} · {field.required?'Required':'Optional'}</Text></View><TouchableOpacity onPress={()=>toggleRequired(field.id)}><Text style={{color:theme.blue,fontSize:10,fontWeight:'900'}}>{field.required?'Required':'Optional'}</Text></TouchableOpacity><TouchableOpacity onPress={()=>removeField(field.id)}><Ionicons name="trash-outline" size={18} color="#FF3B30"/></TouchableOpacity></View>)}</View>
      <View style={styles.chips}>{FIELD_PRESETS.map(type=><TouchableOpacity key={type} onPress={()=>addField(type,type)} style={[styles.option,{backgroundColor:theme.surface,borderColor:theme.border}]}><Text style={{color:theme.text,fontSize:11,fontWeight:'800'}}>+ {type}</Text></TouchableOpacity>)}</View>
      <View style={styles.inlineAdd}><TextInput value={customFieldLabel} onChangeText={setCustomFieldLabel} placeholder="Custom field label" placeholderTextColor={theme.sub} style={[styles.input,{flex:1,color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]}/><TouchableOpacity onPress={()=>{addField('Text',customFieldLabel);setCustomFieldLabel('')}} style={[styles.addBtn,{backgroundColor:theme.blue}]}><Ionicons name="add" size={19} color="#FFF"/></TouchableOpacity></View>

      <Text style={[styles.label,{color:theme.text}]}>Logic & rewards</Text>
      <View style={styles.chips}>{actions.map(a=><TouchableOpacity key={a.id} onPress={()=>setTrigger(a.id)} style={[styles.option,{backgroundColor:trigger===a.id?theme.blue:theme.surface,borderColor:trigger===a.id?theme.blue:theme.border}]}><Text style={{color:trigger===a.id?'#FFF':theme.text,fontSize:11,fontWeight:'800'}}>Trigger: {a.label}</Text></TouchableOpacity>)}</View>
      <View style={[styles.rowCard,{backgroundColor:theme.surface,borderColor:theme.border}]}><View style={{flex:1}}><Text style={[styles.rowTitle,{color:theme.text}]}>Virtual points</Text><Text style={[styles.rowSub,{color:theme.sub}]}>Adds non-cash points to the participant state.</Text></View><Switch value={rewardEnabled} onValueChange={setRewardEnabled}/></View>
      {rewardEnabled?<TextInput value={rewardPoints} onChangeText={setRewardPoints} keyboardType="numeric" style={[styles.input,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]} placeholder="Points per action" placeholderTextColor={theme.sub}/>:null}

      <View style={[styles.note,{backgroundColor:theme.surface,borderColor:theme.border}]}>
        <Text style={[styles.noteTitle,{color:theme.text}]}>Publish flow</Text>
        <Text style={[styles.noteText,{color:theme.sub}]}>Create → publish → share to Chat → users interact → participant state and immutable events update → creator can inspect activity in the dashboard.</Text>
      </View>
      <TouchableOpacity style={[styles.publish,{backgroundColor:theme.blue,opacity:publishing?.6:1}]} onPress={publish} disabled={publishing}><Text style={styles.publishText}>{publishing?(experienceId?'Saving…':'Publishing…'):(experienceId?'Save changes':'Publish')}</Text></TouchableOpacity>
    </ScrollView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
 safe:{flex:1},content:{padding:18,paddingBottom:60},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},title:{fontSize:20,fontWeight:'900'},
 preview:{borderWidth:1,borderRadius:22,padding:16,flexDirection:'row',marginBottom:10},previewIcon:{fontSize:34,marginRight:12},previewName:{fontSize:18,fontWeight:'900'},previewDesc:{fontSize:12,lineHeight:17,marginTop:3},chips:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:9},chip:{paddingHorizontal:8,paddingVertical:5,borderRadius:8},
 label:{fontSize:14,fontWeight:'900',marginTop:14,marginBottom:8},sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},input:{minHeight:44,borderWidth:1,borderRadius:12,paddingHorizontal:11,fontSize:13},iconInput:{width:48,height:44,borderWidth:1,borderRadius:12,textAlign:'center',fontSize:20,marginRight:8},textarea:{minHeight:88,borderWidth:1,borderRadius:12,padding:11,textAlignVertical:'top',fontSize:13},row:{flexDirection:'row',alignItems:'center'},list:{gap:8},listRow:{borderWidth:1,borderRadius:14,padding:11,flexDirection:'row',alignItems:'center',gap:8},listTitle:{fontSize:13,fontWeight:'900'},miniBtn:{borderWidth:1,borderRadius:10,paddingHorizontal:8,paddingVertical:6},option:{borderWidth:1,borderRadius:11,paddingHorizontal:10,paddingVertical:8},inlineAdd:{flexDirection:'row',alignItems:'center',gap:8,marginTop:9},addBtn:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center'},rowCard:{borderWidth:1,borderRadius:17,padding:14,flexDirection:'row',alignItems:'center'},rowTitle:{fontSize:14,fontWeight:'900'},rowSub:{fontSize:11,lineHeight:16,marginTop:3},note:{borderWidth:1,borderRadius:17,padding:14,marginTop:20},noteTitle:{fontWeight:'900',fontSize:14},noteText:{fontSize:12,lineHeight:18,marginTop:5},publish:{height:52,borderRadius:15,alignItems:'center',justifyContent:'center',marginTop:18},publishText:{color:'#FFF',fontSize:14,fontWeight:'900'}
});
