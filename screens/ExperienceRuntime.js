import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebaseConfig';
import ExperienceAPI from '../api/ExperienceAPI';
import { URLValidator } from '../security/URLValidator';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import * as FileSystem from 'expo-file-system';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { canUseP2PFileTransfer, createP2PTransfer, getP2PFileTransferLimit, sendFileOverDataChannel } from '../utils/webrtcFileTransfer';

const initialValueFor = type => {
  if (type === 'Checkbox') return false;
  if (type === 'Number' || type === 'Rating') return '';
  return '';
};

const currentDate = () => new Date().toISOString().slice(0, 10);
const currentTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

const valuePresent = value => {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'object' && !Array.isArray(value)) return Boolean(value.url || value.secureUrl || value.uri || value.name);
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return value;
  return true;
};

export default function ExperienceRuntime({ route, navigation }) {
  const { theme } = useTheme();
  const [experience, setExperience] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(true);
  const [acting, setActing] = useState('');
  const [fieldBusy, setFieldBusy] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);
  const [message, setMessage] = useState('');
  const webRef = useRef(null);

  const experienceId = route?.params?.experienceId;
  const chatId = route?.params?.chatId || null;

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
      await ExperienceAPI.run(item.id, { chatId });
    } catch (e) {
      Alert.alert('Experience', e.message || 'Unable to open experience.');
    } finally {
      setBusy(false);
    }
  }, [experienceId, chatId]);

  useEffect(() => { load(); }, [load]);

  const fields = useMemo(() => experience?.schema?.fields || [], [experience]);
  const actions = useMemo(() => experience?.schema?.actions || [], [experience]);

  const postToWeb = useCallback(payload => {
    if (!webRef.current) return;
    const serialized = JSON.stringify(payload).replace(/<\/script/gi, '<\\/script');
    webRef.current.injectJavaScript(
      'window.__naxExperienceMessage && window.__naxExperienceMessage(' + serialized + '); true;'
    );
  }, []);

  const setField = (fieldId, value) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    setMessage('');
  };

  const selectMedia = async field => {
    setFieldBusy(field.id);
    try {
      if (field.type === 'Image') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission required', 'Allow photo access to attach an image.');
          return;
        }
        const picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.82,
          allowsEditing: false,
          selectionLimit: 1,
        });
        if (picked.canceled || !picked.assets?.[0]?.uri) return;
        const asset = picked.assets[0];
        const uploaded = await uploadToCloudinary({
          fileUri: asset.uri,
          fileName: asset.fileName || 'experience-image.jpg',
          mimeType: asset.mimeType || 'image/jpeg',
        });
        setField(field.id, {
          url: uploaded.secureUrl || uploaded.url,
          name: uploaded.originalFilename || asset.fileName || 'Image',
          mimeType: asset.mimeType || 'image/jpeg',
          bytes: uploaded.bytes || asset.fileSize || null,
        });
      } else {
        const picked = await DocumentPicker.getDocumentAsync({
          copyToCacheDirectory: true,
          multiple: false,
        });
        if (picked.canceled || !picked.assets?.[0]?.uri) return;
        const asset = picked.assets[0];
        const uploaded = await uploadToCloudinary({
          fileUri: asset.uri,
          fileName: asset.name || 'experience-file',
          mimeType: asset.mimeType || 'application/octet-stream',
        });
        setField(field.id, {
          url: uploaded.secureUrl || uploaded.url,
          name: uploaded.originalFilename || asset.name || 'File',
          mimeType: asset.mimeType || 'application/octet-stream',
          bytes: uploaded.bytes || asset.size || null,
        });
      }
    } catch (e) {
      Alert.alert('Upload failed', e.message || 'Could not attach this file.');
    } finally {
      setFieldBusy('');
    }
  };

  const validateFields = (action, sourceValues = values) => {
    const requiresData = ['complete', 'submit', 'claim', 'book', 'pay', 'approve'].includes(String(action?.label || '').toLowerCase());
    if (!requiresData) return null;
    for (const field of fields) {
      if (!field.required) continue;
      if (!valuePresent(sourceValues[field.id])) return field.label || field.id;
    }
    return null;
  };

  const executeAction = useCallback(async (action, actionValues = values, contextExtra = {}) => {
    if (!experience || acting) return false;
    const missing = validateFields(action, actionValues);
    if (missing) {
      Alert.alert('Required field', `Please complete: ${missing}`);
      return false;
    }

    setActing(action.id);
    setMessage('');
    try {
      const result = await ExperienceAPI.performAction(experience.id, action, actionValues, { chatId, ...contextExtra });
      const next = await ExperienceAPI.getParticipant(experience.id);
      setParticipant(next);
      setValues(prev => ({ ...prev, ...(next?.state || {}) }));
      setMessage(`✓ ${result.label} recorded`);
      postToWeb({ type: 'EXPERIENCE_ACTION_RESULT', ok: true, result });
      postToWeb({ type: 'EXPERIENCE_STATE', participant: next });
      return true;
    } catch (e) {
      postToWeb({ type: 'EXPERIENCE_ACTION_RESULT', ok: false, error: e.message || 'Action failed.' });
      Alert.alert('Action failed', e.message || 'Could not perform this action.');
      return false;
    } finally {
      setActing('');
    }
  }, [experience, acting, values, fields, chatId, postToWeb]);

  const handleWebMessage = useCallback(async event => {
    try {
      const payload = JSON.parse(event.nativeEvent.data || '{}');
      if (payload.type !== 'EXPERIENCE_ACTION') return;
      const action = actions.find(item =>
        String(item.id).toLowerCase() === String(payload.actionId || '').toLowerCase()
        || String(item.label).toLowerCase() === String(payload.actionId || '').toLowerCase()
      );
      if (!action) {
        postToWeb({ type: 'EXPERIENCE_ACTION_RESULT', ok: false, error: 'Action is not defined.' });
        return;
      }
      const nextValues = payload.values && typeof payload.values === 'object'
        ? { ...values, ...payload.values }
        : values;
      setValues(nextValues);
      await executeAction(action, nextValues);
    } catch (e) {
      postToWeb({ type: 'EXPERIENCE_ACTION_RESULT', ok: false, error: e.message || 'Invalid bridge message.' });
    }
  }, [actions, values, executeAction, postToWeb]);

  const sendNativeP2P = useCallback(async () => {
    if (!experience || experience.template !== 'transfer' || !chatId || transferBusy) return;
    setTransferBusy(true);
    setTransferProgress(0);
    let connection = null;
    try {
      const chatSnap = await getDoc(doc(db, 'chats', chatId));
      const participants = chatSnap.exists() ? (chatSnap.data()?.participants || []) : [];
      const peerId = participants.find(id => id && id !== auth.currentUser?.uid);
      if (!peerId || participants.length !== 2) {
        throw new Error('Native P2P transfer is available in a one-to-one chat only.');
      }

      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.[0]?.uri) return;
      const asset = picked.assets[0];
      const info = await FileSystem.getInfoAsync(asset.uri);
      const size = Number(asset.size || info.size || 0);
      if (!canUseP2PFileTransfer(size)) {
        throw new Error('File exceeds the 15 MB native P2P limit.');
      }

      connection = await createP2PTransfer({
        senderId: auth.currentUser?.uid,
        receiverId: peerId,
        chatId,
        fileName: asset.name || 'experience-transfer',
        mimeType: asset.mimeType || 'application/octet-stream',
        fileSize: size,
      });

      await new Promise((resolve, reject) => {
        if (connection.dataChannel?.readyState === 'open') {
          resolve();
          return;
        }
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('P2P connection timed out. Try again when both users are online.'));
        }, 30000);
        const onOpen = () => { clearTimeout(timeout); cleanup(); resolve(); };
        const onError = () => { clearTimeout(timeout); cleanup(); reject(new Error('P2P data channel failed to open.')); };
        const cleanup = () => {
          connection.dataChannel?.removeEventListener?.('open', onOpen);
          connection.dataChannel?.removeEventListener?.('error', onError);
        };
        connection.dataChannel?.addEventListener?.('open', onOpen);
        connection.dataChannel?.addEventListener?.('error', onError);
      });

      await sendFileOverDataChannel({
        dataChannel: connection.dataChannel,
        fileUri: asset.uri,
        fileName: asset.name || 'experience-transfer',
        mimeType: asset.mimeType || 'application/octet-stream',
        fileSize: size,
        onProgress: value => setTransferProgress(Math.round(value * 100)),
      });

      const sendAction = actions.find(action => ['send', 'upload', 'complete'].includes(String(action.label || '').toLowerCase())) || actions[0];
      if (sendAction) {
        await executeAction(sendAction, {
          ...values,
          file: {
            name: asset.name || 'experience-transfer',
            mimeType: asset.mimeType || 'application/octet-stream',
            bytes: size,
          },
        }, { transferId: connection.transferId });
      }
      setMessage('✓ File sent directly peer-to-peer');
    } catch (e) {
      Alert.alert('P2P transfer', e.message || ('Maximum size: ' + Math.round(getP2PFileTransferLimit() / 1024 / 1024) + ' MB.'));
    } finally {
      try { connection?.cleanup?.(); } catch (e) {}
      setTransferBusy(false);
      setTransferProgress(0);
    }
  }, [experience, chatId, transferBusy, actions, values, executeAction]);

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
    const webBootstrap = `
      (function(){
        var USER = ${JSON.stringify({
          uid: auth.currentUser?.uid || '',
          name: auth.currentUser?.displayName || 'User'
        })};
        var EXPERIENCE = ${JSON.stringify({
          id: experience.id,
          name: experience.name,
          description: experience.description,
          schema: experience.schema || {}
        })};
        var PARTICIPANT = ${JSON.stringify(participant || {})};
        window.__naxExperienceMessage = function(message){
          if (message && message.type === 'EXPERIENCE_ACTION_RESULT' && typeof window.__naxExperienceActionResult === 'function') {
            try { window.__naxExperienceActionResult(message); } catch(e) {}
          }
        };
        window.Nax = {
          user: USER,
          experience: EXPERIENCE,
          participant: PARTICIPANT,
          getExperience: function(){ return EXPERIENCE; },
          getParticipant: function(){ return PARTICIPANT; },
          sendAction: function(actionId, values){
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'EXPERIENCE_ACTION',
              actionId: actionId,
              values: values || {}
            }));
          },
          onActionResult: function(fn){
            if (typeof fn === 'function') window.__naxExperienceActionResult = fn;
            return function(){ window.__naxExperienceActionResult = null; };
          }
        };
      })();
      true;
    `;

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
          ref={webRef}
          source={{ uri: webUrl }}
          style={{ flex: 1, backgroundColor: theme.bg }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['https://*', 'about:blank']}
          allowsInlineMediaPlayback
          startInLoadingState
          onMessage={handleWebMessage}
          injectedJavaScriptBeforeContentLoaded={webBootstrap}
          onLoadEnd={() => postToWeb({ type: 'EXPERIENCE_READY', experience, participant })}
          onShouldStartLoadWithRequest={request => {
            if (/^about:blank$/i.test(request.url)) return true;
            try {
              const requestHost = new URL(request.url).hostname.toLowerCase();
              const baseHost = new URL(webUrl).hostname.toLowerCase();
              return requestHost === baseHost || requestHost.endsWith('.' + baseHost);
            } catch (e) {
              return false;
            }
          }}
        />
      </SafeAreaView>
    );
  }

  const lastAction = participant?.lastActionLabel || 'None yet';
  const status = participant?.state?.status || participant?.status || 'Ready';
  const points = Number(participant?.state?.points || 0);
  const primaryAction = actions.find(a => a.primary) || actions[0];

  const renderField = field => {
    const value = values[field.id];
    if (field.type === 'Checkbox') {
      return (
        <View style={[styles.checkRow, { borderColor: theme.border, backgroundColor: theme.bg }]}>
          <Text style={{ color: theme.sub, flex: 1 }}>{value ? 'Selected' : 'Not selected'}</Text>
          <Switch value={!!value} onValueChange={v => setField(field.id, v)} />
        </View>
      );
    }
    if (field.type === 'Rating') {
      const rating = Number(value || 0);
      return (
        <View style={styles.ratingRow}>
          {[1,2,3,4,5].map(star => (
            <TouchableOpacity key={star} onPress={() => setField(field.id, star)} style={styles.starBtn}>
              <Ionicons name={star <= rating ? 'star' : 'star-outline'} size={27} color={star <= rating ? '#F5B301' : theme.sub} />
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    if (field.type === 'Date' || field.type === 'Time') {
      return (
        <View style={styles.dateRow}>
          <View style={[styles.dateValue, { borderColor: theme.border, backgroundColor: theme.bg }]}>
            <Text style={{ color: value ? theme.text : theme.sub, fontSize: 13 }}>{value || (field.type === 'Date' ? 'Select date' : 'Select time')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.dateBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => setField(field.id, field.type === 'Date' ? currentDate() : currentTime())}
          >
            <Ionicons name={field.type === 'Date' ? 'calendar-outline' : 'time-outline'} size={17} color={theme.blue} />
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 11 }}>{value ? 'Refresh' : 'Use now'}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (field.type === 'Image' || field.type === 'File') {
      const media = value && typeof value === 'object' ? value : null;
      return (
        <View style={styles.mediaField}>
          {field.type === 'Image' && media?.url ? <Image source={{ uri: media.url }} style={styles.mediaPreview} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 12, fontWeight: '800' }} numberOfLines={1}>
              {media?.name || `No ${field.type.toLowerCase()} attached`}
            </Text>
            <Text style={{ color: theme.sub, fontSize: 10, marginTop: 2 }} numberOfLines={1}>
              {media?.url ? 'Uploaded and ready' : 'Attach to include it in your response'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => selectMedia(field)}
            disabled={fieldBusy === field.id}
            style={[styles.dateBtn, { backgroundColor: theme.surface, borderColor: theme.border, opacity: fieldBusy === field.id ? 0.6 : 1 }]}
          >
            {fieldBusy === field.id ? <ActivityIndicator size="small" color={theme.blue} /> : <Ionicons name="attach-outline" size={17} color={theme.blue} />}
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TextInput
        value={String(value ?? '')}
        onChangeText={v => setField(field.id, field.type === 'Number' ? v.replace(/[^0-9.-]/g, '') : v)}
        keyboardType={field.type === 'Number' ? 'numeric' : 'default'}
        multiline={field.type === 'Text'}
        style={[styles.input, field.type === 'Text' && styles.multiline, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
        placeholder={field.type}
        placeholderTextColor={theme.sub}
      />
    );
  };

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
            <Text style={[styles.meta, { color: theme.sub }]}>Last: {lastAction}</Text>
            <Text style={[styles.meta, { color: theme.sub }]}>Points: {points}</Text>
          </View>
        </View>

        {fields.length ? (
          <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.boxTitle, { color: theme.text }]}>Your response</Text>
            {fields.map(field => (
              <View key={field.id} style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>{field.label}{field.required ? ' *' : ''}</Text>
                {renderField(field)}
              </View>
            ))}
          </View>
        ) : null}

        {experience.template === 'transfer' && chatId ? (
          <View style={[styles.transferBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.boxTitle, { color: theme.text }]}>Native P2P transfer</Text>
              <Text style={[styles.infoText, { color: theme.sub }]}>
                Sends the file directly to the other person in this one-to-one chat. Maximum 15 MB.
              </Text>
              {transferBusy ? (
                <Text style={{ color: theme.blue, fontSize: 11, fontWeight: '800', marginTop: 6 }}>
                  Sending… {transferProgress}%
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              disabled={transferBusy || !!acting}
              onPress={sendNativeP2P}
              style={[styles.transferButton, { backgroundColor: theme.blue, opacity: transferBusy || acting ? 0.55 : 1 }]}
            >
              {transferBusy ? <ActivityIndicator color="#FFF" /> : <Ionicons name="send" size={18} color="#FFF" />}
            </TouchableOpacity>
          </View>
        ) : null}

        {primaryAction ? (
          <TouchableOpacity
            style={[styles.primary, { backgroundColor: theme.blue, opacity: acting ? 0.6 : 1 }]}
            onPress={() => executeAction(primaryAction)}
            disabled={!!acting}
          >
            {acting === primaryAction.id ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{primaryAction.label}</Text>}
          </TouchableOpacity>
        ) : null}

        <View style={styles.actionGrid}>
          {actions.filter(a => a.id !== primaryAction?.id).map(action => (
            <TouchableOpacity
              key={action.id}
              onPress={() => executeAction(action)}
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

const styles = StyleSheet.create({
  safe:{flex:1},
  content:{padding:18,paddingBottom:70},
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},
  topTitle:{fontSize:18,fontWeight:'900'},
  hero:{borderWidth:1,borderRadius:24,padding:20,alignItems:'center'},
  icon:{fontSize:45},
  name:{fontSize:23,fontWeight:'900',marginTop:8,textAlign:'center'},
  desc:{fontSize:13,lineHeight:19,textAlign:'center',marginTop:5},
  metaRow:{width:'100%',flexDirection:'row',justifyContent:'space-between',gap:8,marginTop:12},
  meta:{fontSize:11,fontWeight:'700'},
  box:{borderWidth:1,borderRadius:18,padding:15,marginTop:12},
  boxTitle:{fontSize:14,fontWeight:'900',marginBottom:8},
  fieldWrap:{marginBottom:10},
  fieldLabel:{fontSize:12,fontWeight:'800',marginBottom:5},
  input:{minHeight:44,borderWidth:1,borderRadius:12,paddingHorizontal:12,fontSize:14},
  multiline:{minHeight:88,paddingTop:10,textAlignVertical:'top'},
  checkRow:{minHeight:44,borderWidth:1,borderRadius:12,paddingHorizontal:12,flexDirection:'row',alignItems:'center'},
  ratingRow:{flexDirection:'row',alignItems:'center'},
  starBtn:{width:44,height:44,alignItems:'center',justifyContent:'center'},
  dateRow:{flexDirection:'row',alignItems:'center',gap:8},
  dateValue:{flex:1,minHeight:44,borderWidth:1,borderRadius:12,justifyContent:'center',paddingHorizontal:12},
  dateBtn:{minHeight:44,borderWidth:1,borderRadius:12,paddingHorizontal:11,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  mediaField:{minHeight:62,borderWidth:1,borderRadius:12,padding:8,flexDirection:'row',alignItems:'center',gap:9},
  mediaPreview:{width:48,height:48,borderRadius:10},
  primary:{height:52,borderRadius:15,alignItems:'center',justifyContent:'center',marginTop:15},
  primaryText:{color:'#FFF',fontWeight:'900',fontSize:14},
  actionGrid:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:11},
  action:{minWidth:'30%',minHeight:43,borderRadius:13,borderWidth:1,alignItems:'center',justifyContent:'center',paddingHorizontal:12},
  success:{borderWidth:1,borderRadius:14,padding:12,marginTop:14},
  info:{borderWidth:1,borderRadius:18,padding:15,marginTop:16},
  infoTitle:{fontSize:14,fontWeight:'900'},
  infoText:{fontSize:12,lineHeight:18,marginTop:5},
  transferBox:{borderWidth:1,borderRadius:18,padding:14,marginTop:12,flexDirection:'row',alignItems:'center'},
  transferButton:{width:46,height:46,borderRadius:14,alignItems:'center',justifyContent:'center',marginLeft:12},
  webHeader:{height:54,borderBottomWidth:1,flexDirection:'row',alignItems:'center',paddingHorizontal:10},
  webTitle:{fontSize:15,fontWeight:'900'},
});
