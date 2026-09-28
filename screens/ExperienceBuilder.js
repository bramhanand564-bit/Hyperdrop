import React, { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ExperienceAPI from '../api/ExperienceAPI';
import { URLValidator } from '../security/URLValidator';
import { DEFAULT_GATEWAY, normalizeGateway } from '../api/ExperienceGateway';
import MessagingService from '../messaging/MessagingService';

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
  const aiDraft = route?.params?.aiDraft || null;
  const template = aiDraft?.template || route?.params?.template || 'custom';
  const experienceId = route?.params?.experienceId || null;
  const sourceChatId = route?.params?.chatId || null;
  const openedFromChat = route?.params?.source === 'chat' && !!sourceChatId;
  const initial = TEMPLATE_DEFAULTS[template] || TEMPLATE_DEFAULTS.custom;
  const initialName = aiDraft?.name || initial.name;
  const initialDescription = aiDraft?.description || initial.description;
  const initialIcon = aiDraft?.icon || initial.icon;
  const initialActions = aiDraft?.actions?.length ? aiDraft.actions : initial.actions.map((label,i)=>({id:slug(label),label,primary:i===0,access:'anyone'}));
  const initialFields = aiDraft?.fields?.length ? aiDraft.fields : initial.fields.map(([type,label],i)=>({id:`field_${i+1}`,type,label,required:['Text','Number'].includes(type)}));
  const [name,setName]=useState(initialName),[description,setDescription]=useState(initialDescription),[icon,setIcon]=useState(initialIcon);
  const [actions,setActions]=useState(initialActions.map((a,i)=>({...a,id:a.id||slug(a.label),primary:a.primary??i===0,access:a.access||'anyone'})));
  const [fields,setFields]=useState(initialFields.map((f,i)=>({...f,id:f.id||`field_${i+1}`})));
  const [trigger,setTrigger]=useState(initialActions[0]?.id || 'on_action');
  const [rewardEnabled,setRewardEnabled]=useState(Boolean(aiDraft?.rewardEnabled)),[rewardPoints,setRewardPoints]=useState(String(aiDraft?.rewardPoints || 100));
  const [webUrl,setWebUrl]=useState('');
  const [gatewayEnabled,setGatewayEnabled]=useState(true),[chatEnabled,setChatEnabled]=useState(true),[chatPresentation,setChatPresentation]=useState('card'),[visibility,setVisibility]=useState('public');
  const [chatSurface,setChatSurface]=useState({enabled:true,mode:'auto',maxFields:3,maxActions:3,showDescription:false,showStatus:true,showProgress:true,allowInlineActions:true});
  const [customAction,setCustomAction]=useState(''),[customFieldLabel,setCustomFieldLabel]=useState('');
  const [publishing,setPublishing]=useState(false),[loadingExisting,setLoadingExisting]=useState(Boolean(experienceId));
  useEffect(()=>{
    let mounted=true;
    if(!experienceId){setLoadingExisting(false);return undefined;}
    ExperienceAPI.get(experienceId).then(item=>{
      if(!mounted||!item)return;
      setName(item.name||initial.name);setDescription(item.description||'');setIcon(item.icon||initial.icon);
      const existingActions = item.schema?.actions || initial.actions.map((label,i)=>({id:slug(label),label,primary:i===0}));
      const primaryAction = existingActions.find(a=>a.primary) || existingActions[0];
      const primaryId = primaryAction ? (primaryAction.id || slug(primaryAction.label)) : '';
      setActions(existingActions.map(a=>({...a,id:a.id||slug(a.label),primary:(a.id||slug(a.label))===primaryId,access:a.access||'anyone'})));
      setFields((item.schema?.fields||initial.fields.map(([type,label],i)=>({id:`field_${i+1}`,type,label,required:['Text','Number'].includes(type)}))).map((field,i)=>({...field,id:field.id||`field_${i+1}`})));
      setRewardEnabled(Boolean(item.schema?.settings?.rewardEnabled));setRewardPoints(String(item.schema?.settings?.rewardPoints||100));setTrigger(item.schema?.settings?.trigger||(item.schema?.actions?.[0] ? (item.schema.actions[0].id || slug(item.schema.actions[0].label)) : ''));setWebUrl(item.schema?.web?.url||'');
      const gateway=normalizeGateway(item.gateway || item.schema?.gateway || DEFAULT_GATEWAY);setGatewayEnabled(gateway.enabled);setChatEnabled(gateway.chat.enabled);setChatPresentation(gateway.chat.presentation||'card');setVisibility(gateway.visibility||'public');
      setChatSurface({...chatSurface,...(item.schema?.chatSurface||gateway.chat?.surface||{})});
    }).catch(()=>{}).finally(()=>mounted&&setLoadingExisting(false));
    return ()=>{mounted=false;};
  },[experienceId]);

  const addAction = label => {
    const clean=String(label||'').trim();
    if(!clean)return;
    const id=slug(clean)+`_${Date.now().toString(36).slice(-4)}`;
    setActions(prev=>[...prev,{id,label:clean,primary:prev.length===0,access:'anyone'}]);
  };
  const addPresetAction = label => setActions(prev=>prev.some(a=>a.label===label)?prev:[...prev,{id:slug(label),label,primary:prev.length===0,access:'anyone'}]);
  const removeAction=id=>{
    setActions(prev=>{
      const next=prev.filter(a=>a.id!==id);
      setTrigger(prevTrigger=>prevTrigger===id?(next[0]?.id||''):prevTrigger);
      if(next.length && !next.some(a=>a.primary)) next[0]={...next[0],primary:true};
      return next;
    });
  };
  const togglePrimary=id=>setActions(prev=>prev.map(a=>({...a,primary:a.id===id})));
  const cycleAccess=id=>setActions(prev=>prev.map(a=>a.id===id?{...a,access:a.access==='creator'?'admin':a.access==='admin'?'anyone':'creator'}:a));
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
    actionPermissions:Object.fromEntries(actions.map(action=>[action.id,action.access||'anyone'])),
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
    chatSurface,
    gateway:{...normalizeGateway(DEFAULT_GATEWAY),enabled:gatewayEnabled,visibility,entrypoints:{...DEFAULT_GATEWAY.entrypoints,chat:chatEnabled},chat:{...DEFAULT_GATEWAY.chat,enabled:chatEnabled,presentation:chatPresentation,surface:chatSurface}},
  }),[actions,fields,rewardEnabled,rewardPoints,trigger,webUrl,gatewayEnabled,chatEnabled,chatPresentation,visibility,chatSurface]);

  const publish=async()=>{
    if(!name.trim())return Alert.alert('Nax App name required','Give your Nax App a name.');
    if(!actions.length)return Alert.alert('Nax App action required','Add at least one action to the Nax App.');
    if(webUrl.trim() && !URLValidator.validateExternalLink(webUrl.trim()).valid)return Alert.alert('Invalid live URL','Only a valid HTTPS URL can be used.');
    setPublishing(true);
    try{
      const saved=experienceId
        ? await ExperienceAPI.update(experienceId,{name,description,icon,template,schema,gateway:schema.gateway})
        : await ExperienceAPI.create({name,description,icon,template,schema,gateway:schema.gateway});
      if (openedFromChat && !experienceId) {
        await MessagingService.sendMessage(sourceChatId, {
          type: 'experience',
          text: '⚡ ' + (saved.name || name) + ' — try this tool',
          experienceId: saved.id,
          experienceName: saved.name || name,
          experienceDescription: saved.description || description,
          experienceIcon: saved.icon || icon || '⚡',
          experienceSchema: saved.schema || schema,
          experienceGateway: saved.gateway || schema.gateway || null,
          experienceGatewayId: saved.gatewayId || null,
          experiencePackage: saved.package || null,
        });
        Alert.alert('Nax Tool created', 'The working mini-tool has been added to this chat.', [
          {text:'Open Tool',onPress:()=>navigation.replace('ExperienceRuntime',{experienceId:saved.id,chatId:sourceChatId})},
          {text:'Stay in Chat',onPress:()=>navigation.goBack()},
        ]);
      } else {
        Alert.alert(experienceId?'Updated':'Published', experienceId?'Your Nax app was updated in Nax Store.':'Your Nax app is live in Nax Store and shareable.',[
          {text:'Open',onPress:()=>navigation.replace('ExperienceRuntime',{experienceId:saved.id})},
          {text:'Dashboard',onPress:()=>navigation.replace('ExperienceDashboard')}
        ]);
      }
    }catch(e){Alert.alert('Nax publish failed',e.message||'Unable to publish.')}
    finally{setPublishing(false);}
  };

  return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{loadingExisting?<View style={{padding:12,borderRadius:12,backgroundColor:theme.surface,marginBottom:10}}><Text style={{color:theme.sub,fontSize:12}}>Loading existing Nax App…</Text></View>:null}
      <View style={styles.top}><TouchableOpacity onPress={()=>navigation.goBack()}><Ionicons name="chevron-back" size={26} color={theme.text}/></TouchableOpacity><Text style={[styles.title,{color:theme.text}]}>Nax App</Text><View style={{width:26}}/></View>

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
      <Text style={[styles.label,{color:theme.text}]}>Nax Gateway</Text>
      <View style={[styles.rowCard,{backgroundColor:theme.surface,borderColor:theme.border}]}>
        <View style={{flex:1}}><Text style={[styles.rowTitle,{color:theme.text}]}>Gateway enabled</Text><Text style={[styles.rowSub,{color:theme.sub}]}>One Nax App identity can open from Chat, Discover, Moments, Settings and full screen.</Text></View>
        <Switch value={gatewayEnabled} onValueChange={setGatewayEnabled}/>
      </View>
      {gatewayEnabled ? (
        <View>
          <View style={[styles.rowCard,{backgroundColor:theme.surface,borderColor:theme.border,marginTop:8}]}>
            <View style={{flex:1}}><Text style={[styles.rowTitle,{color:theme.text}]}>Chat surface</Text><Text style={[styles.rowSub,{color:theme.sub}]}>Keep a compact interactive card in Chat while the same session can open full screen.</Text></View>
            <Switch value={chatEnabled} onValueChange={setChatEnabled}/>
          </View>
          <View style={styles.chips}>{['card','large','alert'].map(mode=><TouchableOpacity key={mode} onPress={()=>setChatPresentation(mode)} style={[styles.option,{backgroundColor:chatPresentation===mode?theme.blue:theme.surface,borderColor:chatPresentation===mode?theme.blue:theme.border}]}><Text style={{color:chatPresentation===mode?'#FFF':theme.text,fontSize:11,fontWeight:'800'}}>{mode}</Text></TouchableOpacity>)}</View>
          <View style={styles.chips}>{['public','private','invite-only'].map(mode=><TouchableOpacity key={mode} onPress={()=>setVisibility(mode)} style={[styles.option,{backgroundColor:visibility===mode?theme.blue:theme.surface,borderColor:visibility===mode?theme.blue:theme.border}]}><Text style={{color:visibility===mode?'#FFF':theme.text,fontSize:11,fontWeight:'800'}}>Visibility: {mode}</Text></TouchableOpacity>)}</View>
        </View>
      ) : null}

      <Text style={[styles.label,{color:theme.text}]}>Chat Mini-Surface</Text>
      <View style={[styles.rowCard,{backgroundColor:theme.surface,borderColor:theme.border}]}>
        <View style={{flex:1}}><Text style={[styles.rowTitle,{color:theme.text}]}>Use this App inside Chat</Text><Text style={[styles.rowSub,{color:theme.sub}]}>Shows only the selected part of this full app. Users can act here without opening the full app.</Text></View>
        <Switch value={chatSurface.enabled} onValueChange={v=>setChatSurface(s=>({...s,enabled:v}))}/>
      </View>
      {chatSurface.enabled ? <View>
        <Text style={[styles.rowSub,{color:theme.sub,marginTop:8}]}>Size adapts automatically to the number of controls. You can override it.</Text>
        <View style={styles.chips}>{['auto','compact','standard','large'].map(mode=><TouchableOpacity key={mode} onPress={()=>setChatSurface(s=>({...s,mode}))} style={[styles.option,{backgroundColor:chatSurface.mode===mode?theme.blue:theme.surface,borderColor:chatSurface.mode===mode?theme.blue:theme.border}]}><Text style={{color:chatSurface.mode===mode?'#FFF':theme.text,fontSize:11,fontWeight:'800'}}>{mode}</Text></TouchableOpacity>)}</View>
        <View style={styles.chips}>
          {[1,2,3,4,6,8].map(n=><TouchableOpacity key={'f'+n} onPress={()=>setChatSurface(s=>({...s,maxFields:n}))} style={[styles.option,{backgroundColor:chatSurface.maxFields===n?theme.blue:theme.surface,borderColor:chatSurface.maxFields===n?theme.blue:theme.border}]}><Text style={{color:chatSurface.maxFields===n?'#FFF':theme.text,fontSize:10,fontWeight:'800'}}>Fields {n}</Text></TouchableOpacity>)}
        </View>
        <View style={styles.chips}>
          {[1,2,3,4,6,8].map(n=><TouchableOpacity key={'a'+n} onPress={()=>setChatSurface(s=>({...s,maxActions:n}))} style={[styles.option,{backgroundColor:chatSurface.maxActions===n?theme.blue:theme.surface,borderColor:chatSurface.maxActions===n?theme.blue:theme.border}]}><Text style={{color:chatSurface.maxActions===n?'#FFF':theme.text,fontSize:10,fontWeight:'800'}}>Actions {n}</Text></TouchableOpacity>)}
        </View>
        <View style={[styles.rowCard,{backgroundColor:theme.surface,borderColor:theme.border,marginTop:8}]}>
          <View style={{flex:1}}><Text style={[styles.rowTitle,{color:theme.text}]}>Inline actions</Text><Text style={[styles.rowSub,{color:theme.sub}]}>Run the same Experience action/state system directly from the Chat surface.</Text></View>
          <Switch value={chatSurface.allowInlineActions} onValueChange={v=>setChatSurface(s=>({...s,allowInlineActions:v}))}/>
        </View>
        <View style={[styles.rowCard,{backgroundColor:theme.surface,borderColor:theme.border,marginTop:8}]}>
          <View style={{flex:1}}><Text style={[styles.rowTitle,{color:theme.text}]}>Progress + status</Text><Text style={[styles.rowSub,{color:theme.sub}]}>Show required-field progress and the latest action state inside Chat.</Text></View>
          <Switch value={chatSurface.showProgress} onValueChange={v=>setChatSurface(s=>({...s,showProgress:v,showStatus:v}))}/>
        </View>
        <View style={[styles.note,{backgroundColor:theme.surface,borderColor:theme.border,marginTop:8}]}>
          <Text style={[styles.noteTitle,{color:theme.text}]}>Example</Text>
          <Text style={[styles.noteText,{color:theme.sub}]}>A large Task app can expose only “Approve / Reject” in Chat. A simple Yes/No app stays tiny. More fields/actions make the Chat surface expand automatically.</Text>
        </View>
      </View> : null}

      <Text style={[styles.label,{color:theme.text}]}>Live web URL (optional)</Text>
      <TextInput value={webUrl} onChangeText={setWebUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={[styles.input,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]} placeholder="https://your-experience.example" placeholderTextColor={theme.sub}/>

      <View style={styles.sectionHead}><Text style={[styles.label,{color:theme.text,marginTop:0}]}>Actions</Text><Text style={{color:theme.sub,fontSize:11}}>{actions.length}</Text></View>
      <View style={styles.list}>{actions.map(action=><View key={action.id} style={[styles.listRow,{backgroundColor:theme.surface,borderColor:theme.border}]}><View style={{flex:1}}><Text style={[styles.listTitle,{color:theme.text}]}>{action.label}</Text><Text style={{color:theme.sub,fontSize:10}}>{action.primary?'Primary action':'Secondary action'} · {action.access==='creator'?'Creator only':action.access==='admin'?'Group admins':'Anyone'}</Text></View><TouchableOpacity onPress={()=>togglePrimary(action.id)} style={[styles.miniBtn,{backgroundColor:action.primary?theme.blue:theme.bg,borderColor:theme.border}]}><Text style={{color:action.primary?'#FFF':theme.text,fontSize:10,fontWeight:'900'}}>Primary</Text></TouchableOpacity><TouchableOpacity onPress={()=>cycleAccess(action.id)} style={[styles.miniBtn,{backgroundColor:theme.bg,borderColor:theme.border}]}><Text style={{color:theme.text,fontSize:10,fontWeight:'900'}}>Access</Text></TouchableOpacity><TouchableOpacity onPress={()=>removeAction(action.id)}><Ionicons name="trash-outline" size={18} color="#FF3B30"/></TouchableOpacity></View>)}</View>
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
        <Text style={[styles.noteText,{color:theme.sub}]}>Create → publish to Nax Store → share → users open and interact → creator can inspect activity in the dashboard.</Text>
      </View>
      <TouchableOpacity style={[styles.publish,{backgroundColor:theme.blue,opacity:(publishing||loadingExisting)?.6:1}]} onPress={publish} disabled={publishing||loadingExisting}><Text style={styles.publishText}>{publishing?(experienceId?'Saving…':'Publishing…'):(experienceId?'Save changes':'Publish to Nax Store')}</Text></TouchableOpacity>
    </ScrollView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
 safe:{flex:1},content:{padding:18,paddingBottom:60},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},title:{fontSize:20,fontWeight:'900'},
 preview:{borderWidth:1,borderRadius:22,padding:16,flexDirection:'row',marginBottom:10},previewIcon:{fontSize:34,marginRight:12},previewName:{fontSize:18,fontWeight:'900'},previewDesc:{fontSize:12,lineHeight:17,marginTop:3},chips:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:9},chip:{paddingHorizontal:8,paddingVertical:5,borderRadius:8},
 label:{fontSize:14,fontWeight:'900',marginTop:14,marginBottom:8},sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},input:{minHeight:44,borderWidth:1,borderRadius:12,paddingHorizontal:11,fontSize:13},iconInput:{width:48,height:44,borderWidth:1,borderRadius:12,textAlign:'center',fontSize:20,marginRight:8},textarea:{minHeight:88,borderWidth:1,borderRadius:12,padding:11,textAlignVertical:'top',fontSize:13},row:{flexDirection:'row',alignItems:'center'},list:{gap:8},listRow:{borderWidth:1,borderRadius:14,padding:11,flexDirection:'row',alignItems:'center',gap:8},listTitle:{fontSize:13,fontWeight:'900'},miniBtn:{borderWidth:1,borderRadius:10,paddingHorizontal:8,paddingVertical:6},option:{borderWidth:1,borderRadius:11,paddingHorizontal:10,paddingVertical:8},inlineAdd:{flexDirection:'row',alignItems:'center',gap:8,marginTop:9},addBtn:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center'},rowCard:{borderWidth:1,borderRadius:17,padding:14,flexDirection:'row',alignItems:'center'},rowTitle:{fontSize:14,fontWeight:'900'},rowSub:{fontSize:11,lineHeight:16,marginTop:3},note:{borderWidth:1,borderRadius:17,padding:14,marginTop:20},noteTitle:{fontWeight:'900',fontSize:14},noteText:{fontSize:12,lineHeight:18,marginTop:5},publish:{height:52,borderRadius:15,alignItems:'center',justifyContent:'center',marginTop:18},publishText:{color:'#FFF',fontSize:14,fontWeight:'900'}
});
