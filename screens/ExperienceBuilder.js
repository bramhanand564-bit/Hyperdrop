import React, { useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ExperienceAPI from '../api/ExperienceAPI';

const ACTIONS = ['Accept','Start','Complete','Join','Vote','Submit','Claim','Play','Watch','Upload','Approve','Reject','Share','Pay','Book','Report'];
const FIELDS = ['Text','Number','Image','Date','Time','Checkbox','Rating','File'];
const TRIGGERS = ['On Open','On Join','On Action','Daily','On Complete'];

const TEMPLATE_DEFAULTS = {
  task: { name: 'Daily Task', icon: '📋', description: 'A task people can accept and complete.', actions: ['Accept','Complete'], fields: ['Text','Date'] },
  reward: { name: 'Reward Challenge', icon: '🎁', description: 'A challenge with progress and rewards.', actions: ['Start','Complete','Claim'], fields: ['Number','Date'] },
  game: { name: 'Game Challenge', icon: '🎮', description: 'A shareable challenge.', actions: ['Join','Play','Share'], fields: ['Text','Number'] },
  quiz: { name: 'Quiz', icon: '🧠', description: 'Questions, answers and results.', actions: ['Start','Submit','Share'], fields: ['Text','Number'] },
  form: { name: 'Form', icon: '📝', description: 'Collect structured responses.', actions: ['Submit','Share'], fields: ['Text','Checkbox'] },
  community: { name: 'Community Activity', icon: '👥', description: 'Group participation and actions.', actions: ['Join','Vote','Complete'], fields: ['Text','Date'] },
  media: { name: 'Media Experience', icon: '🎬', description: 'A shareable media experience.', actions: ['Watch','Share'], fields: ['Text','Image'] },
  transfer: { name: 'P2P Transfer', icon: '📦', description: 'A peer-to-peer transfer experience.', actions: ['Join','Accept','Complete'], fields: ['File','Number'] },
  custom: { name: 'My Experience', icon: '⚡', description: 'A custom interactive experience.', actions: ['Start','Complete'], fields: ['Text'] },
};

export default function ExperienceBuilder({ route, navigation }) {
  const { theme } = useTheme();
  const template = route?.params?.template || 'custom';
  const initial = TEMPLATE_DEFAULTS[template] || TEMPLATE_DEFAULTS.custom;
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [icon, setIcon] = useState(initial.icon);
  const [actions, setActions] = useState(initial.actions);
  const [fields, setFields] = useState(initial.fields);
  const [trigger, setTrigger] = useState('On Action');
  const [rewardEnabled, setRewardEnabled] = useState(false);
  const [rewardPoints, setRewardPoints] = useState('100');
  const [publishing, setPublishing] = useState(false);

  const toggle = (list, setList, value) => setList(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);

  const schema = useMemo(() => ({
    version: 2,
    fields: fields.map((type, index) => ({
      id: `field_${index + 1}`,
      type,
      label: type === 'Text' ? 'Response' : type,
      required: ['Text','Number'].includes(type),
    })),
    actions: actions.map((label, index) => ({
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      label,
      primary: index === 0,
    })),
    rules: [{ trigger, reward: rewardEnabled ? { points: Math.max(0, Number(rewardPoints) || 0) } : null }],
    ui: {
      card: ['icon','name','description','primaryActions'],
      full: ['header','fields','status','actions'],
    },
    settings: {
      rewardEnabled,
      rewardPoints: Math.max(0, Number(rewardPoints) || 0),
      trigger,
    },
  }), [actions, fields, rewardEnabled, rewardPoints, trigger]);

  const publish = async () => {
    if (!name.trim()) return Alert.alert('Name required', 'Give your experience a name.');
    if (!actions.length) return Alert.alert('Action required', 'Add at least one action.');
    setPublishing(true);
    try {
      const created = await ExperienceAPI.create({ name, description, icon, template, schema });
      Alert.alert('Published', 'Your experience is live.', [{
        text: 'Open', onPress: () => navigation.replace('ExperienceRuntime', { experienceId: created.id })
      }]);
    } catch (e) {
      Alert.alert('Publish failed', e.message || 'Unable to publish.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color={theme.text} /></TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Create Experience</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={[styles.preview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.previewIcon}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewName, { color: theme.text }]}>{name || 'Untitled'}</Text>
            <Text style={[styles.previewDesc, { color: theme.sub }]} numberOfLines={2}>{description || 'Describe what people can do.'}</Text>
            <View style={styles.chips}>{actions.slice(0, 4).map(a => <View key={a} style={[styles.chip, { backgroundColor: theme.bg }]}><Text style={{ color: theme.text, fontSize: 10, fontWeight: '800' }}>{a}</Text></View>)}</View>
          </View>
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Identity</Text>
        <TextInput value={icon} onChangeText={setIcon} maxLength={2} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} placeholder="⚡" />
        <TextInput value={name} onChangeText={setName} maxLength={80} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} placeholder="Experience name" placeholderTextColor={theme.sub} />
        <TextInput value={description} onChangeText={setDescription} multiline maxLength={500} style={[styles.textarea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} placeholder="What can people do?" placeholderTextColor={theme.sub} />

        <Text style={[styles.label, { color: theme.text }]}>Actions</Text>
        <View style={styles.grid}>
          {ACTIONS.map(action => {
            const active = actions.includes(action);
            return <TouchableOpacity key={action} onPress={() => toggle(actions,setActions,action)} style={[styles.option,{backgroundColor:active?theme.blue:theme.surface,borderColor:active?theme.blue:theme.border}]}><Text style={{color:active?'#FFF':theme.text,fontWeight:'800',fontSize:12}}>{active?'✓ ':'+ '}{action}</Text></TouchableOpacity>;
          })}
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Data fields</Text>
        <View style={styles.grid}>
          {FIELDS.map(field => {
            const active = fields.includes(field);
            return <TouchableOpacity key={field} onPress={() => toggle(fields,setFields,field)} style={[styles.option,{backgroundColor:active?theme.blue:theme.surface,borderColor:active?theme.blue:theme.border}]}><Text style={{color:active?'#FFF':theme.text,fontWeight:'800',fontSize:12}}>{active?'✓ ':'+ '}{field}</Text></TouchableOpacity>;
          })}
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Automation trigger</Text>
        <View style={styles.grid}>{TRIGGERS.map(t => <TouchableOpacity key={t} onPress={() => setTrigger(t)} style={[styles.option,{backgroundColor:trigger===t?theme.blue:theme.surface,borderColor:trigger===t?theme.blue:theme.border}]}><Text style={{color:trigger===t?'#FFF':theme.text,fontWeight:'800',fontSize:12}}>{t}</Text></TouchableOpacity>)}</View>

        <View style={[styles.rowCard,{backgroundColor:theme.surface,borderColor:theme.border}]}>
          <View style={{flex:1}}><Text style={[styles.rowTitle,{color:theme.text}]}>Enable points</Text><Text style={[styles.rowSub,{color:theme.sub}]}>Attach a configurable virtual-point reward to actions.</Text></View>
          <Switch value={rewardEnabled} onValueChange={setRewardEnabled} />
        </View>
        {rewardEnabled ? <TextInput value={rewardPoints} onChangeText={setRewardPoints} keyboardType="numeric" style={[styles.input,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]} placeholder="Points per qualifying action" placeholderTextColor={theme.sub} /> : null}

        <View style={[styles.note,{backgroundColor:theme.surface,borderColor:theme.border}]}>
          <Text style={[styles.noteTitle,{color:theme.text}]}>What gets published</Text>
          <Text style={[styles.noteText,{color:theme.sub}]}>A versioned Experience definition. People can open it full-screen or receive it as a compact interactive card in Chat. User state is stored separately.</Text>
        </View>

        <TouchableOpacity style={[styles.publish,{backgroundColor:theme.blue,opacity:publishing?0.6:1}]} onPress={publish} disabled={publishing}>
          <Text style={styles.publishText}>{publishing?'Publishing…':'Publish Experience'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
  safe:{flex:1},content:{padding:18,paddingBottom:60},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},title:{fontSize:19,fontWeight:'900'},
  preview:{borderWidth:1,borderRadius:22,padding:16,flexDirection:'row',marginBottom:20},previewIcon:{fontSize:35,marginRight:12},previewName:{fontSize:17,fontWeight:'900'},previewDesc:{fontSize:12,lineHeight:17,marginTop:3},chips:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:9},chip:{paddingHorizontal:8,paddingVertical:5,borderRadius:8},
  label:{fontSize:14,fontWeight:'900',marginBottom:8,marginTop:12},input:{minHeight:46,borderWidth:1,borderRadius:13,paddingHorizontal:12,marginBottom:8,fontSize:14},textarea:{minHeight:90,borderWidth:1,borderRadius:13,padding:12,textAlignVertical:'top',marginBottom:5},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:8},option:{borderWidth:1,paddingHorizontal:11,paddingVertical:9,borderRadius:12},rowCard:{borderWidth:1,borderRadius:17,padding:14,flexDirection:'row',alignItems:'center',marginTop:10},rowTitle:{fontSize:14,fontWeight:'900'},rowSub:{fontSize:11,lineHeight:16,marginTop:3},note:{borderWidth:1,borderRadius:17,padding:14,marginTop:20},noteTitle:{fontWeight:'900',fontSize:14},noteText:{fontSize:12,lineHeight:18,marginTop:5},publish:{height:52,borderRadius:15,alignItems:'center',justifyContent:'center',marginTop:18},publishText:{color:'#FFF',fontSize:14,fontWeight:'900'}
});
