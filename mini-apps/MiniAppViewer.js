import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import DeclarativeMiniAppRenderer from '../components/mini-app/DeclarativeMiniAppRenderer';
import { URLValidator } from '../security/BotValidator';
import RateLimiter from '../security/RateLimiter';
import AuditLogger from '../security/AuditLogger';
import LocalMiniAppStore from './LocalMiniAppStore';
import NaxAppSessionAPI from './NaxAppSessionAPI';

export default function MiniAppViewer({ route, navigation }) {
  const { isDark } = useTheme();
  const params = route?.params || {};
  const { title, url, appConfig, entryType = 'web', htmlCode: routeHtmlCode, localAppId, sessionId } = params;
  const [loading, setLoading] = useState(entryType === 'web' || entryType === 'html');
  const [effectiveApp, setEffectiveApp] = useState(appConfig || null);
  const [room, setRoom] = useState(null);
  const webRef = useRef(null);
  const roomUnsubRef = useRef(null);

  const htmlCode = routeHtmlCode || effectiveApp?.htmlCode || null;
  const effectiveEntryType = entryType === 'web' && htmlCode ? 'html' : entryType;
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const blue = '#087EFF';
  const safeUrl = !!url && URLValidator.scanMiniAppUrl(url).isSafe;

  useEffect(() => {
    let mounted = true;
    if (localAppId && !appConfig) {
      LocalMiniAppStore.get(localAppId).then(app => {
        if (mounted) setEffectiveApp(app);
      }).catch(() => {});
    }
    return () => { mounted = false; };
  }, [localAppId, appConfig]);

  const postToApp = payload => {
    if (!webRef.current) return;
    const safe = JSON.stringify(payload).replace(/<\/script/gi, '<\\/script');
    webRef.current.injectJavaScript(
      "window.__naxNativeMessage && window.__naxNativeMessage(" + safe + "); true;"
    );
  };

  const subscribeRoom = roomId => {
    roomUnsubRef.current?.();
    roomUnsubRef.current = NaxAppSessionAPI.subscribeState(roomId, state => {
      postToApp({ type: 'ROOM_STATE', state });
    });
  };

  const openOrJoinRoom = async roomId => {
    try {
      const joined = await NaxAppSessionAPI.joinSession(roomId);
      setRoom(joined);
      subscribeRoom(roomId);
      postToApp({ type: 'ROOM_READY', room: joined });
    } catch (e) {
      Alert.alert('Game room', e.message || 'Could not join this room.');
    }
  };

  useEffect(() => () => roomUnsubRef.current?.(), []);

  useEffect(() => {
    if (sessionId) openOrJoinRoom(sessionId);
  }, [sessionId]);

  const handleShare = async () => {
    try {
      const app = effectiveApp || {
        id: params.appId || localAppId || title,
        name: title || 'Nax App',
        description: 'Nax mini-app',
        entryType: effectiveEntryType,
        htmlCode,
        maxPlayers: 4,
      };
      const created = await NaxAppSessionAPI.createSession(app.id, app.maxPlayers || 4);
      navigation.navigate('MiniAppSharePicker', {
        app: { ...app, htmlCode, entryType: effectiveEntryType },
        sessionId: created.id,
      });
    } catch (e) {
      Alert.alert('Invite', e.message || 'Could not create a game room.');
    }
  };

  const injectedCode = `
    (function(){
      var USER = ${JSON.stringify({
        uid: (require('../firebaseConfig').auth.currentUser?.uid || 'guest'),
        name: (require('../firebaseConfig').auth.currentUser?.displayName || 'User'),
      })};
      var THEME = ${JSON.stringify(isDark ? 'dark' : 'light')};
      var listeners = [];
      window.__naxNativeMessage = function(message) {
        if (message && message.type === 'API_RESPONSE' && window.__naxApiPending && window.__naxApiPending[message.requestId]) {
          var pending = window.__naxApiPending[message.requestId];
          delete window.__naxApiPending[message.requestId];
          if (message.ok) pending.resolve(message.data);
          else pending.reject(new Error('API request failed: ' + message.status));
        }
        if (message && message.type === 'NAX_ERROR' && message.message) {
          window.__naxLastError = message.message;
        }
        if (message && message.type === 'ROOM_STATE') {
          listeners.forEach(function(fn){ try { fn(message.state); } catch(e) {} });
        }
        if (message && message.type === 'ROOM_READY') {
          window.__naxRoom = message.room;
        }
      };
      window.Nax = {
        user: USER,
        theme: THEME,
        getUser: function(){ return USER; },
        getTheme: function(){ return THEME; },
        room: {
          create: function(maxPlayers){
            window.ReactNativeWebView.postMessage(JSON.stringify({action:'CREATE_ROOM', maxPlayers:maxPlayers || 4}));
          },
          join: function(id){
            window.ReactNativeWebView.postMessage(JSON.stringify({action:'JOIN_ROOM', sessionId:id}));
          },
          onState: function(fn){
            if (typeof fn !== 'function') return function(){};
            listeners.push(fn);
            return function(){ listeners = listeners.filter(function(x){ return x !== fn; }); };
          },
          getState: function(){
            window.ReactNativeWebView.postMessage(JSON.stringify({action:'GET_STATE'}));
          },
          setState: function(state){
            window.ReactNativeWebView.postMessage(JSON.stringify({action:'SET_STATE', state:state}));
          },
          getSession: function(){ return window.__naxRoom || null; }
        },
        api: {          request: function(url, options){            var id = 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2);            return new Promise(function(resolve, reject){              if (!window.__naxApiPending) window.__naxApiPending = {};              window.__naxApiPending[id] = { resolve: resolve, reject: reject };              window.ReactNativeWebView.postMessage(JSON.stringify({action:'REQUEST_API', requestId:id, url:url, method:(options&&options.method)||'GET', headers:(options&&options.headers)||{}, body:(options&&options.body)||undefined}));            });          }        },        share: function(){
          window.ReactNativeWebView.postMessage(JSON.stringify({action:'SHARE_APP'}));
        }
      };
      window.NaxPortal = window.Nax;
    })();
    true;
  `;

  const handleMessage = async event => {
    if (!RateLimiter.allow('miniapp:' + (params.appId || localAppId || title || 'app'))) return;
    try {
      const message = JSON.parse(event.nativeEvent.data || '{}');
      if (message.action === 'CREATE_ROOM') {
        const app = effectiveApp || { id: params.appId || localAppId || title, maxPlayers: message.maxPlayers || 4 };
        const created = await NaxAppSessionAPI.createSession(app.id, message.maxPlayers || app.maxPlayers || 4);
        setRoom(created);
        subscribeRoom(created.id);
        postToApp({ type: 'ROOM_READY', room: created });
      } else if (message.action === 'JOIN_ROOM') {
        await openOrJoinRoom(message.sessionId);
      } else if (message.action === 'SET_STATE' && room?.id) {
        await NaxAppSessionAPI.setState(room.id, message.state);
      } else if (message.action === 'GET_STATE' && room?.id) {
        const state = await NaxAppSessionAPI.getState(room.id);
        postToApp({ type: 'ROOM_STATE', state });
      } else if (message.action === 'REQUEST_API') {
        const apiUrl = String(message.url || '');
        const urlCheck = URLValidator.scanMiniAppUrl(apiUrl);
        const declared = Array.isArray(effectiveApp?.apiDomains) ? effectiveApp.apiDomains : [];
        const host = new URL(apiUrl).hostname.toLowerCase();
        const allowed = declared.some(domain => {
          const normalizedDomain = String(domain || '').trim().toLowerCase();
          const d = normalizedDomain.startsWith('https://') ? normalizedDomain.slice(8) : normalizedDomain.startsWith('http://') ? normalizedDomain.slice(7) : normalizedDomain.split('/')[0];
          return d && (host === d || host.endsWith('.' + d));
        });
        if (!urlCheck.isSafe || !allowed) throw new Error('API domain is not allowed by this Nax app manifest.');
        const response = await fetch(apiUrl, {
          method: message.method || 'GET',
          headers: message.headers || {},
          body: message.body || undefined,
        });
        const raw = await response.text();
        let data = raw;
        try { data = JSON.parse(raw); } catch (e) {}
        postToApp({ type: 'API_RESPONSE', requestId: message.requestId, ok: response.ok, status: response.status, data });
      } else if (message.action === 'SHARE_APP') {
        await handleShare();
      }
    } catch (e) {
      postToApp({ type: 'NAX_ERROR', message: e.message || 'Bridge error' });
    }
  };

  if (effectiveEntryType === 'web' && !safeUrl) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="shield-half" size={48} color="#FF3B30" />
        <Text style={{ color: textMain, marginTop: 12, fontWeight: '800' }}>Unsafe URL Blocked</Text>
        <Text style={{ color: textSub, marginTop: 6 }}>Only approved HTTPS apps can open in the Nax sandbox.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: headerBg }]}>
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color={textMain} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: textMain }]} numberOfLines={1}>{effectiveApp?.name || title || 'Nax Mini App'}</Text>
          <Text style={[styles.headerSubtitle, { color: textSub }]} numberOfLines={1}>
            {room ? 'Room ' + room.id.slice(0, 8) + ' • ' + room.playerCount + '/' + room.maxPlayers : effectiveEntryType === 'html' ? 'Local HTML Sandbox' : effectiveEntryType === 'web' ? (url || '').split('/')[2] || 'Secure Web App' : 'Nax App'}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
          <Ionicons name="people-outline" size={23} color={textMain} />
        </TouchableOpacity>
      </View>

      <View style={[styles.webContainer, { backgroundColor: bg }]}>
        {effectiveEntryType === 'html' && htmlCode ? (
          <>
            {loading ? <View style={[styles.loaderBox,{backgroundColor:bg}]}><ActivityIndicator size="large" color={blue}/><Text style={[styles.loaderText,{color:textSub}]}>Starting Nax sandbox…</Text></View> : null}
            <WebView
              ref={webRef}
              source={{ html: htmlCode, baseUrl: 'https://nax.app.local/' }}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['https://*','data:*']}
              injectedJavaScriptBeforeContentLoaded={injectedCode}
              onMessage={handleMessage}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={async () => {
                setLoading(false);
                if (room) {
                  postToApp({ type: 'ROOM_READY', room });
                  const state = await NaxAppSessionAPI.getState(room.id).catch(() => null);
                  if (state !== null) postToApp({ type: 'ROOM_STATE', state });
                }
              }}
              onShouldStartLoadWithRequest={request => {
                if (!RateLimiter.allow('webview:' + (title || 'app'))) return false;
                if (/^about:blank|^https:\/\//i.test(request.url)) return true;
                const check = URLValidator.scanMiniAppUrl(request.url);
                if (!check.isSafe) {
                  AuditLogger.log('miniapp.navigation_blocked', { url: request.url, reason: check.message });
                  return false;
                }
                return true;
              }}
            />
          </>
        ) : effectiveEntryType === 'web' && url ? (
          <>
            {loading && <View style={[styles.loaderBox,{backgroundColor:bg}]}><ActivityIndicator size="large" color={blue}/></View>}
            <WebView
              ref={webRef}
              source={{ uri: url }}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['https://*']}
              onLoadEnd={async () => {
                setLoading(false);
                if (room) {
                  postToApp({ type: 'ROOM_READY', room });
                  const state = await NaxAppSessionAPI.getState(room.id).catch(() => null);
                  if (state !== null) postToApp({ type: 'ROOM_STATE', state });
                }
              }}
              onMessage={handleMessage}
              injectedJavaScriptBeforeContentLoaded={injectedCode}
            />
          </>
        ) : effectiveEntryType === 'declarative' && (effectiveApp?.components || appConfig?.components) ? (
          <View style={{ flex: 1, padding: 10 }}>
            <DeclarativeMiniAppRenderer
              components={effectiveApp?.components || appConfig?.components || []}
              themeColor={effectiveApp?.color || blue}
              isTestMode={false}
              navigation={navigation}
            />
          </View>
        ) : (
          <View style={styles.errorBox}>
            <Ionicons name="warning" size={50} color="#FF9500" />
            <Text style={[styles.errorText,{color:textMain}]}>Invalid App Format</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: 1, paddingTop: Platform.OS === 'ios' ? 0 : 5 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, marginHorizontal: 8, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSubtitle: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  webContainer: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loaderBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  errorBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 18, fontWeight: '800', marginTop: 15 },
});
