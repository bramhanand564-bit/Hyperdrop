import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NaxConnectorAPI, { normalizeConnector } from '../../api/NaxConnectorAPI';

export default function ConnectedAppSurface({ appId, app, connector: inputConnector, navigation, preview = false, compact = false, onShare }) {
  const [loadedApp, setLoadedApp] = useState(app || null);
  const connector = useMemo(() => normalizeConnector(inputConnector || loadedApp?.connector, loadedApp || {}), [inputConnector, loadedApp]);
  const [values, setValues] = useState(() => ({ ...(connector.initialState || {}) }));
  const [loading, setLoading] = useState(!preview && !!appId && !app);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    if (preview || loadedApp || !appId) return () => { alive = false; };
    NaxConnectorAPI.getConnector(appId).then(() => NaxConnectorAPI.getState(appId, inputConnector)).then(state => {
      if (!alive) return;
      setValues(state?.values || {});
      setLoading(false);
    }).catch(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [appId, preview]);

  useEffect(() => {
    if (preview || !appId) return undefined;
    return NaxConnectorAPI.subscribeState(appId, state => setValues(state.values || {}), () => {});
  }, [appId, preview]);

  useEffect(() => { if (preview) setValues({ ...(connector.initialState || {}) }); }, [connector, preview]);

  const fields = connector.fields.slice(0, compact ? 4 : connector.chat.maxFields);
  const actions = connector.actions.slice(0, compact ? 5 : connector.chat.maxActions);

  const localAction = action => {
    const next = { ...values };
    const fieldId = action.fieldId;
    if (action.type === 'reset') return {};
    if (action.type === 'toggle' && fieldId) next[fieldId] = !Boolean(next[fieldId]);
    if (action.type === 'increment' && fieldId) next[fieldId] = Number(next[fieldId] || 0) + Number(action.value || 1);
    if (action.type === 'decrement' && fieldId) next[fieldId] = Number(next[fieldId] || 0) - Number(action.value || 1);
    if ((action.type === 'set' || action.type === 'vote' || action.type === 'submit') && fieldId) next[fieldId] = action.value !== null ? action.value : next[fieldId];
    if (action.type === 'append' && fieldId) next[fieldId] = [...(Array.isArray(next[fieldId]) ? next[fieldId] : []), action.value].slice(-20);
    return next;
  };

  const run = async action => {
    if (!action || busy) return;
    if (fields.some(field => field.required && !String(values[field.id] ?? '').trim())) { setMessage('Please fill all required fields first.'); return; }
    setBusy(action.id);
    setMessage('');
    try {
      if (preview || !appId) {
        const next = localAction(action);
        setValues(next);
        setMessage('✓ Preview updated');
      } else if (action.type === 'open') {
        navigation?.navigate('NaxAppRuntime', { appId });
      } else {
        const result = await NaxConnectorAPI.performAction(appId, action.id, { value: values[action.fieldId], fieldId: action.fieldId }, { surface: 'chat' });
        setValues(result.values || {});
        setMessage('✓ ' + (result.label || action.label) + ' updated');
      }
    } catch (e) {
      setMessage(e?.message || 'Action failed.');
    } finally {
      setBusy('');
    }
  };

  const setValue = (id, next) => { setValues(prev => ({ ...prev, [id]: next })); setMessage(''); };

  const renderField = field => {
    const v = values[field.id];
    if (field.type === 'select' && field.options?.length) return (
      <View key={field.id} style={styles.field}>
        <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>
        <View style={styles.options}>{field.options.map(option => <TouchableOpacity key={option} onPress={() => setValue(field.id, option)} style={[styles.option, String(v) === String(option) && styles.optionActive]}><Text style={[styles.optionText, String(v) === String(option) && styles.optionTextActive]}>{option}</Text></TouchableOpacity>)}</View>
      </View>
    );
    if (field.type === 'toggle' || field.type === 'checkbox') return (
      <TouchableOpacity key={field.id} onPress={() => setValue(field.id, !Boolean(v))} style={styles.control}>
        <Ionicons name={v ? 'checkbox' : 'square-outline'} size={18} color={v ? '#087EFF' : '#8AA0B5'} />
        <Text style={styles.controlText}>{field.label}</Text>
      </TouchableOpacity>
    );
    if (field.type === 'rating') return (
      <View key={field.id} style={styles.field}>
        <Text style={styles.label}>{field.label}</Text>
        <View style={styles.stars}>{[1,2,3,4,5].map(star => <TouchableOpacity key={star} onPress={() => setValue(field.id, star)}><Ionicons name={Number(v || 0) >= star ? 'star' : 'star-outline'} size={18} color={Number(v || 0) >= star ? '#F5B301' : '#8AA0B5'} /></TouchableOpacity>)}</View>
      </View>
    );
    return (
      <View key={field.id} style={styles.field}>
        <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>
        <TextInput value={String(v ?? '')} onChangeText={next => setValue(field.id, field.type === 'number' ? next.replace(/[^0-9.-]/g, '') : next)} placeholder={field.placeholder || 'Enter value'} placeholderTextColor="#8AA0B5" keyboardType={field.type === 'number' ? 'numeric' : 'default'} style={styles.input} />
      </View>
    );
  };

  if (!connector.enabled) return null;
  if (loading) return <View style={styles.loading}><ActivityIndicator size="small" color="#087EFF" /><Text style={styles.sub}>Loading connected surface…</Text></View>;

  return (
    <View style={[styles.card, compact && styles.compact, connector.mode === 'large' && styles.large]}>
      <View style={styles.header}><View style={styles.icon}><Text style={styles.iconText}>{connector.icon}</Text></View><View style={{ flex:1, marginLeft:9 }}><Text style={styles.title} numberOfLines={1}>{connector.title}</Text>{connector.chat.showDescription ? <Text style={styles.sub} numberOfLines={2}>{connector.description}</Text> : null}{connector.chat.showStatus ? <Text style={styles.live}>● LIVE CONNECTED SURFACE</Text> : null}</View></View>
      {fields.map(renderField)}
      {message ? <View style={styles.result}><Ionicons name={message.startsWith('✓') ? 'checkmark-circle' : 'information-circle'} size={15} color={message.startsWith('✓') ? '#34C759' : '#087EFF'} /><Text style={styles.resultText}>{message}</Text></View> : null}
      <View style={styles.actions}>{actions.map(action => <TouchableOpacity key={action.id} disabled={!!busy} onPress={() => run(action)} style={[styles.action, action.primary && styles.primary, busy && busy !== action.id && { opacity:0.45 }]}>{busy === action.id ? <ActivityIndicator size="small" color={action.primary ? '#FFF' : '#087EFF'} /> : null}<Text style={[styles.actionText, action.primary && styles.primaryText]}>{busy === action.id ? 'Working…' : action.label}</Text></TouchableOpacity>)}</View>
      <View style={styles.footer}>{onShare ? <TouchableOpacity onPress={onShare} style={styles.footerBtn}><Ionicons name="share-outline" size={15} color="#087EFF" /><Text style={styles.footerText}>Share in Chat</Text></TouchableOpacity> : null}{appId ? <TouchableOpacity onPress={() => navigation?.navigate('NaxAppRuntime',{appId})} style={styles.footerBtn}><Ionicons name="open-outline" size={15} color="#087EFF" /><Text style={styles.footerText}>Open Full App</Text></TouchableOpacity> : null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:{width:'100%',maxWidth:440,borderWidth:1,borderColor:'rgba(8,126,255,.18)',borderRadius:20,padding:13,backgroundColor:'rgba(8,126,255,.045)'},
  compact:{padding:10,borderRadius:17},
  large:{padding:16},
  header:{flexDirection:'row',alignItems:'center'},
  icon:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(8,126,255,.10)'},
  iconText:{fontSize:21},
  title:{fontSize:15,fontWeight:'900',color:'#142532'},
  sub:{fontSize:10,color:'#6C8494',lineHeight:14,marginTop:2},
  live:{fontSize:8,fontWeight:'900',color:'#34C759',marginTop:5},
  field:{marginTop:9},options:{flexDirection:'row',flexWrap:'wrap',gap:6},option:{borderWidth:1,borderColor:'rgba(8,126,255,.18)',borderRadius:10,paddingHorizontal:9,paddingVertical:7,backgroundColor:'#FFF'},optionActive:{backgroundColor:'#087EFF',borderColor:'#087EFF'},optionText:{fontSize:10,fontWeight:'800',color:'#142532'},optionTextActive:{color:'#FFF'},label:{fontSize:9,fontWeight:'800',color:'#6C8494',marginBottom:4},
  input:{minHeight:39,borderWidth:1,borderColor:'rgba(8,126,255,.15)',borderRadius:11,paddingHorizontal:10,fontSize:12,color:'#142532',backgroundColor:'#FFF'},
  control:{minHeight:39,borderWidth:1,borderColor:'rgba(8,126,255,.15)',borderRadius:11,paddingHorizontal:10,flexDirection:'row',alignItems:'center',marginTop:8},
  controlText:{fontSize:12,color:'#142532',fontWeight:'700',marginLeft:7},
  stars:{flexDirection:'row',gap:5,marginTop:4},
  result:{marginTop:9,borderWidth:1,borderColor:'rgba(52,199,89,.20)',borderRadius:10,padding:7,flexDirection:'row',alignItems:'center'},
  resultText:{fontSize:10,fontWeight:'800',color:'#142532',marginLeft:6,flex:1},
  actions:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:10},
  action:{minHeight:39,borderRadius:11,borderWidth:1,borderColor:'rgba(8,126,255,.18)',paddingHorizontal:11,alignItems:'center',justifyContent:'center',flexGrow:1,flexDirection:'row',gap:5},
  primary:{backgroundColor:'#087EFF',borderColor:'#087EFF'},
  actionText:{fontSize:10,fontWeight:'900',color:'#142532'},
  primaryText:{color:'#FFF'},
  footer:{flexDirection:'row',justifyContent:'space-between',marginTop:10,paddingTop:8,borderTopWidth:1,borderTopColor:'rgba(8,126,255,.10)'},
  footerBtn:{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:4},
  footerText:{fontSize:9,fontWeight:'900',color:'#087EFF'},
  loading:{padding:15,alignItems:'center'},
});