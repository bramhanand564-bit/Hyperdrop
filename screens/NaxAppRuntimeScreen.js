import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import NaxAppStoreAPI from '../api/NaxAppStoreAPI';
import NaxConnectorAPI from '../api/NaxConnectorAPI';
import BotAPI from '../api/BotAPI';
import BotRuntime from '../bot-runtime/BotRuntime';
import AIService from '../ai/AIService';

export default function NaxAppRuntimeScreen({ route, navigation }) {
  const { theme } = useTheme();
  const [app, setApp] = useState(null);
  const [error, setError] = useState('');
  const webViewRef = useRef(null);
  const botRuntimeRef = useRef(null);
  const botHistoryRef = useRef([]);

  useEffect(() => {
    let active = true;
    NaxAppStoreAPI.get(route.params?.appId).then(value => {
      if (active) setApp(value);
    }).catch(e => active && setError(e?.message || 'Could not load app.'));
    return () => { active = false; };
  }, [route.params?.appId]);

  const openGatewayEntrypoint = async entrypoint => {
    const gateway = app?.gateway || {};
    if (gateway.enabled === false) return false;
    if (gateway.entrypoints?.[entrypoint] === false) return false;

    if (entrypoint === 'chat') {
      navigation.navigate('NaxAppSharePicker', { app });
      return true;
    }
    if (entrypoint === 'discover') {
      navigation.navigate('Discover', { naxGatewayAppId: app.id, naxGatewayAppName: app.name });
      return true;
    }
    if (entrypoint === 'moments') {
      navigation.navigate('Moments', { naxGatewayAppId: app.id, naxGatewayAppName: app.name });
      return true;
    }
    if (entrypoint === 'settings') {
      navigation.navigate('Settings', { naxGatewayAppId: app.id, naxGatewayAppName: app.name });
      return true;
    }
    if (entrypoint === 'web') {
      navigation.navigate('ExperienceWebView', {
        title: app.name || 'Nax App',
        htmlCode: app.html || '',
      });
      return true;
    }
    if (entrypoint === 'deepLink') {
      try {
        await Linking.openURL('nax://app/' + encodeURIComponent(app.id));
        return true;
      } catch (_) {
        return false;
      }
    }
    return false;
  };

  const sendToWeb = payload => {
    const script = 'window.__naxBotResponse && window.__naxBotResponse(' + JSON.stringify(payload || {}) + '); true;';
    webViewRef.current?.injectJavaScript(script);
  };

  const handleBotInput = async text => {
    if (!app?.botId) return;
    try {
      const bot = await BotAPI.getBot(app.botId);
      if (!bot) throw new Error('Original bot is no longer available.');
      if (bot.systemPrompt) {
        const reply = await AIService.generateText({
          connectionId: bot.aiConnectionId || undefined,
          model: bot.aiModel || undefined,
          systemPrompt: bot.systemPrompt,
          messages: [...botHistoryRef.current.slice(-20), { role:'user', content:String(text || '').slice(0,5000) }],
          maxTokens: 800,
        });
        await BotAPI.recordBotUsage(bot.id).catch(() => {});
        botHistoryRef.current = [...botHistoryRef.current, { role:'user', content:String(text || '').slice(0,5000) }, { role:'assistant', content:String(reply || '').slice(0,5000) }].slice(-40);
        sendToWeb({ text: String(reply || '').slice(0,5000), buttons: bot.buttons || [] });
        return;
      }
      if (!botRuntimeRef.current || botRuntimeRef.current.bot?.id !== bot.id) {
        botRuntimeRef.current = new BotRuntime({ bot, user:{ uid:auth.currentUser?.uid || '', name:auth.currentUser?.displayName || 'User' } });
        const started = botRuntimeRef.current.start();
        if (!botRuntimeRef.current.isRunning()) throw new Error(started?.response?.text || 'Bot is unavailable.');
      }
      const cleanText = String(text || '').slice(0,5000);
      const result = botRuntimeRef.current.handleMessage({ text:cleanText });
      await BotAPI.recordBotUsage(bot.id).catch(() => {});
      botHistoryRef.current = [...botHistoryRef.current, { role:'user', content:cleanText }, { role:'assistant', content:result?.response?.text || '' }].slice(-40);
      sendToWeb(result?.response || { text:'No response.' });
    } catch (e) {
      sendToWeb({ text:e?.message || 'Bot response failed.' });
    }
  };

  const handleMessage = event => {
    try {
      const payload = JSON.parse(event.nativeEvent.data || '{}');
      if (payload.type === 'NAX_SHARE_TO_CHAT') openGatewayEntrypoint('chat');
      if (payload.type === 'NAX_OPEN_ENTRYPOINT') {
        openGatewayEntrypoint(String(payload.entrypoint || ''));
      }
      if (payload.type === 'NAX_CLOSE') navigation.goBack();
      if (payload.type === 'NAX_BOT_INPUT') handleBotInput(payload.text || '');
      if (payload.type === 'NAX_CONNECTOR_ACTION') {
        NaxConnectorAPI.performAction(app?.id, payload.actionId, payload.input || {}, { surface:'full_app' })
          .then(result => webViewRef.current?.injectJavaScript('window.__naxConnectorResult && window.__naxConnectorResult(' + JSON.stringify(result || {}) + '); true;'))
          .catch(e => webViewRef.current?.injectJavaScript('window.__naxConnectorError && window.__naxConnectorError(' + JSON.stringify({ message:e?.message || 'Action failed.' }) + '); true;'));
      }
      if (payload.type === 'NAX_CONNECTOR_STATE') {
        NaxConnectorAPI.getState(app?.id, app?.connector || {}).then(state => webViewRef.current?.injectJavaScript('window.__naxConnectorState && window.__naxConnectorState(' + JSON.stringify(state || {}) + '); true;')).catch(()=>{});
      }
    } catch (_) {}
  };

  const gatewayBootstrap = `
    (function(){
      var APP=${JSON.stringify({ id: app?.id || '', name: app?.name || '', description: app?.description || '', icon: app?.icon || '🚀' })};
      var GATEWAY=${JSON.stringify(app?.gateway || {})};
      var USER=${JSON.stringify({ uid: auth.currentUser?.uid || '', name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User' })};
      var CONNECTOR=${JSON.stringify(app?.connector || {})};
      window.Nax={
        app:APP,user:USER,gateway:GATEWAY,
        getApp:function(){return APP;},getGateway:function(){return GATEWAY;},
        shareToChat:function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'NAX_SHARE_TO_CHAT'}));},
        openEntrypoint:function(name){window.ReactNativeWebView.postMessage(JSON.stringify({type:'NAX_OPEN_ENTRYPOINT',entrypoint:String(name||'')}));},
        openChat:function(){this.openEntrypoint('chat');},
        openDiscover:function(){this.openEntrypoint('discover');},
        openMoments:function(){this.openEntrypoint('moments');},
        openSettings:function(){this.openEntrypoint('settings');},
        openWeb:function(){this.openEntrypoint('web');},
        openDeepLink:function(){this.openEntrypoint('deepLink');},
        connector:CONNECTOR,
        sendBotMessage:function(text){window.ReactNativeWebView.postMessage(JSON.stringify({type:'NAX_BOT_INPUT',text:String(text||'')}));},
        connectorAction:function(actionId,input){window.ReactNativeWebView.postMessage(JSON.stringify({type:'NAX_CONNECTOR_ACTION',actionId:String(actionId||''),input:input||{}}));},
        connectorState:{},
        onConnectorUpdate:null,
        getConnectorState:function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'NAX_CONNECTOR_STATE'}));},
        __applyConnectorState:function(state){this.connectorState=(state&&state.values)||{};if(typeof this.onConnectorUpdate==='function')try{this.onConnectorUpdate(this.connectorState,state||{});}catch(e){}},
        close:function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'NAX_CLOSE'}));}
      };
      window.__naxConnectorState=function(state){window.Nax&&window.Nax.__applyConnectorState(state||{});};
      window.__naxConnectorResult=function(result){window.Nax&&window.Nax.__applyConnectorState(result||{});};
      window.__naxConnectorError=function(error){if(window.Nax&&typeof window.Nax.onConnectorError==='function')try{window.Nax.onConnectorError(error||{});}catch(e){}};
      };
    })(); true;`;

  if (error) return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}><View style={styles.center}><Text style={{color:theme.text}}>{error}</Text></View></SafeAreaView>;
  if (!app) return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}><View style={styles.center}><ActivityIndicator color={theme.blue}/><Text style={{color:theme.sub,marginTop:10}}>Opening Nax App…</Text></View></SafeAreaView>;
  return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}>
    <View style={[styles.header,{backgroundColor:theme.surface,borderBottomColor:theme.border}]}>
      <TouchableOpacity onPress={()=>navigation.goBack()} style={styles.headerBtn}><Ionicons name="chevron-back" size={25} color={theme.text}/></TouchableOpacity>
      <View style={{flex:1,marginHorizontal:8}}><Text style={{color:theme.text,fontWeight:'900'}} numberOfLines={1}>{app.name}</Text><Text style={{color:theme.blue,fontSize:9,fontWeight:'800'}}>NAX GATEWAY · {app.sourceType === 'bot' ? 'BOT APP' : 'STORE APP'}</Text></View>
      <TouchableOpacity onPress={()=>navigation.navigate('NaxAppSharePicker',{app})} style={styles.headerBtn}><Ionicons name="share-outline" size={21} color={theme.text}/></TouchableOpacity>
    </View>
    <WebView ref={webViewRef} originWhitelist={['*']} source={{html:app.html}} javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false} onMessage={handleMessage} onLoadEnd={() => webViewRef.current?.injectJavaScript('window.Nax&&window.Nax.getConnectorState(); true;')} injectedJavaScriptBeforeContentLoaded={gatewayBootstrap} />
  </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1},header:{height:58,flexDirection:'row',alignItems:'center',paddingHorizontal:8,borderBottomWidth:1},headerBtn:{width:42,height:42,alignItems:'center',justifyContent:'center'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24}});