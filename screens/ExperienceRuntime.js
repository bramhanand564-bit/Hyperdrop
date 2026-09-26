import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import ExperienceAPI from '../api/ExperienceAPI';
import { URLValidator } from '../security/URLValidator';

const initialValueFor = type => {
  if (type === 'Checkbox') return false;
  if (type === 'Number' || type === 'Rating') return '';
  return '';
};

export default function ExperienceRuntime({ route, navigation }) {
  const { theme } = useTheme();
  const [experience, setExperience] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(true);
  const [acting, setActing] = useState('');
  const [message, setMessage] = useState('');

  const experienceId = route?.params?.experienceId;

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const item = await ExperienceAPI.get(experienceId);
      if (!item) {
        setExperience(null);
        return;
      }
      setExperience(item);
      const current = await ExperienceAPI.getParticipant(item.id);
      setParticipant(current);
      const fieldValues = {};
      (item.schema?.fields || []).forEach(field => {
        fieldValues[field.id] = current?.state?.[field.id] ?? initialValueFor(field.type);
      });
      setValues(fieldValues);
      await ExperienceAPI.run(item.id);
    } catch (e) {
      Alert.alert('Experience', e.message || 'Unable to open experience.');
    } finally {
      setBusy(false);
    }
  }, [experienceId]);

  useEffect(() => { load(); }, [load]);

  const fields = useMemo(() => experience?.schema?.fields || [], [experience]);
  const actions = useMemo(() => experience?.schema?.actions || [], [experience]);

  const setField = (fieldId, value) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    setMessage('');
  };

  const validateFields = () => {
    for (const field of fields) {
      if (!field.required) continue;
      const value = values[field.id];
      if (value === '' || value === null || value === undefined || value === false) {
        return field.label || field.id;
      }
    }
    return null;
  };

  const press = async action => {
    if (!experience || acting) return;
    const missing = validateFields();
    if (missing && ['Submit','Complete','Claim','Book','Pay','Approve'].includes(action.label)) {
      Alert.alert('Required field', `Please complete: ${missing}`);
      return;
    }

    setActing(action.id);
    setMessage('');
    try {
      const result = await ExperienceAPI.performAction(experience.id, action, values);
      const next = await ExperienceAPI.getParticipant(experience.id);
      setParticipant(next);
      setValues(prev => ({ ...prev, ...(next?.state || {}) }));
      setMessage(`✓ ${result.label} recorded`);
    } catch (e) {
      Alert.alert('Action failed', e.message || 'Could not perform this action.');
    } finally {
      setActing('');
    }
  };

  const share = () => navigation.navigate('ExperienceSharePicker', { experience });

  if (busy) {
    return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator color={theme.blue} /><Text style={{ color: theme.sub, marginTop: 10 }}>Loading…</Text></View>;
  }

  if (!experience) {
    return <View style={[styles.center, { backgroundColor: theme.bg }]}><Text style={{ color: theme.text }}>Experience not found.</Text></View>;
  }

  const webUrl = String(experience.schema?.web?.url || '').trim();
  const safeWebUrl = webUrl && URLValidator.validateExternalLink(webUrl).valid;

  if (safeWebUrl) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
        <View style={[styles.webHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color={theme.text} /></TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={[styles.webTitle, { color: theme.text }]} numberOfLines={1}>{experience.name}</Text>
            <Text style={{ color: theme.sub, fontSize: 10 }}>Secure HTTPS Experience</Text>
          </View>
          <TouchableOpacity onPress={share}><Ionicons name="share-outline" size={21} color={theme.text} /></TouchableOpacity>
        </View>
        <WebView
          source={{ uri: webUrl }}
          style={{ flex: 1, backgroundColor: theme.bg }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['https://*']}
          allowsInlineMediaPlayback
          startInLoadingState
          injectedJavaScriptBeforeContentLoaded={
            "window.Nax = { user: { authenticated: true }, experienceId: " +
            JSON.stringify(experience.id) +
            " }; true;"
          }
        />
      </SafeAreaView>
    );
  }

  const lastAction = participant?.lastActionLabel || 'None yet';
  const status = participant?.state?.status || participant?.status || 'Ready';
  const points = Number(participant?.state?.points || 0);
  const primaryAction = actions.find(a => a.primary) || actions[0];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color={theme.text} /></TouchableOpacity>
          <Text style={[styles.topTitle, { color: theme.text }]}>Experience</Text>
          <TouchableOpacity onPress={share}><Ionicons name="share-outline" size={22} color={theme.text} /></TouchableOpacity>
        </View>

        <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.icon}>{experience.icon}</Text>
          <Text style={[styles.name, { color: theme.text }]}>{experience.name}</Text>
          <Text style={[styles.desc, { color: theme.sub }]}>{experience.description}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: theme.sub }]}>Status: {status}</Text>
            <Text style={[styles.meta, { color: theme.sub }]}>Last: {lastAction}</Text><Text style={[styles.meta, { color: theme.sub }]}>Points: {points}</Text>
          </View>
        </View>

        {fields.length ? (
          <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.boxTitle, { color: theme.text }]}>Your response</Text>
            {fields.map(field => (
              <View key={field.id} style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>{field.label}{field.required ? ' *' : ''}</Text>
                {field.type === 'Checkbox' ? (
                  <View style={[styles.checkRow, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                    <Text style={{ color: theme.sub, flex: 1 }}>{values[field.id] ? 'Selected' : 'Not selected'}</Text>
                    <Switch value={!!values[field.id]} onValueChange={v => setField(field.id, v)} />
                  </View>
                ) : (
                  <TextInput
                    value={String(values[field.id] ?? '')}
                    onChangeText={v => setField(field.id, field.type === 'Number' || field.type === 'Rating' ? v.replace(/[^0-9.]/g, '') : v)}
                    keyboardType={field.type === 'Number' || field.type === 'Rating' ? 'numeric' : 'default'}
                    multiline={field.type === 'Text'}
                    style={[styles.input, field.type === 'Text' && styles.multiline, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                    placeholder={field.type}
                    placeholderTextColor={theme.sub}
                  />
                )}
              </View>
            ))}
          </View>
        ) : null}

        {primaryAction ? (
          <TouchableOpacity
            style={[styles.primary, { backgroundColor: theme.blue, opacity: acting ? 0.6 : 1 }]}
            onPress={() => press(primaryAction)}
            disabled={!!acting}
          >
            {acting === primaryAction.id ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{primaryAction.label}</Text>}
          </TouchableOpacity>
        ) : null}

        <View style={styles.actionGrid}>
          {actions.filter(a => a.id !== primaryAction?.id).map(action => (
            <TouchableOpacity
              key={action.id}
              onPress={() => press(action)}
              disabled={!!acting}
              style={[styles.action, { backgroundColor: theme.surface, borderColor: theme.border, opacity: acting && acting !== action.id ? 0.5 : 1 }]}
            >
              <Text style={{ color: theme.text, fontWeight: '900', fontSize: 12 }}>{acting === action.id ? '…' : action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {message ? <View style={[styles.success, { backgroundColor: 'rgba(52,199,89,.10)', borderColor: 'rgba(52,199,89,.25)' }]}><Text style={{ color: '#34C759', fontWeight: '800' }}>{message}</Text></View> : null}

        <View style={[styles.info, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>Share in Chat</Text>
          <Text style={[styles.infoText, { color: theme.sub }]}>People receive the same live Experience and can act on it from Chat.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
  safe:{flex:1},content:{padding:18,paddingBottom:70},center:{flex:1,alignItems:'center',justifyContent:'center'},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},topTitle:{fontSize:18,fontWeight:'900'},
  hero:{borderWidth:1,borderRadius:24,padding:20,alignItems:'center'},icon:{fontSize:45},name:{fontSize:23,fontWeight:'900',marginTop:8,textAlign:'center'},desc:{fontSize:13,lineHeight:19,textAlign:'center',marginTop:5},metaRow:{width:'100%',flexDirection:'row',justifyContent:'space-between',gap:8,marginTop:12},meta:{fontSize:11,fontWeight:'700'},
  box:{borderWidth:1,borderRadius:18,padding:15,marginTop:12},boxTitle:{fontSize:14,fontWeight:'900',marginBottom:8},fieldWrap:{marginBottom:10},fieldLabel:{fontSize:12,fontWeight:'800',marginBottom:5},input:{minHeight:44,borderWidth:1,borderRadius:12,paddingHorizontal:12,fontSize:14},multiline:{minHeight:88,paddingTop:10,textAlignVertical:'top'},checkRow:{minHeight:44,borderWidth:1,borderRadius:12,paddingHorizontal:12,flexDirection:'row',alignItems:'center'},
  primary:{height:52,borderRadius:15,alignItems:'center',justifyContent:'center',marginTop:15},primaryText:{color:'#FFF',fontWeight:'900',fontSize:14},actionGrid:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:11},action:{minWidth:'30%',minHeight:43,borderRadius:13,borderWidth:1,alignItems:'center',justifyContent:'center',paddingHorizontal:12},success:{borderWidth:1,borderRadius:14,padding:12,marginTop:14},info:{borderWidth:1,borderRadius:18,padding:15,marginTop:16},infoTitle:{fontSize:14,fontWeight:'900'},infoText:{fontSize:12,lineHeight:18,marginTop:5}
});
