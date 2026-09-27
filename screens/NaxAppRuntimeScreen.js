import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import NaxAppStoreAPI from '../api/NaxAppStoreAPI';

export default function NaxAppRuntimeScreen({ route, navigation }) {
  const { theme } = useTheme();
  const [app, setApp] = useState(null);
  const [error, setError] = useState('');

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

  const handleMessage = event => {
    try {
      const payload = JSON.parse(event.nativeEvent.data || '{}');
      if (payload.type === 'NAX_SHARE_TO_CHAT') openGatewayEntrypoint('chat');
      if (payload.type === 'NAX_OPEN_ENTRYPOINT') {
        openGatewayEntrypoint(String(payload.entrypoint || ''));
      }
      if (payload.type === 'NAX_CLOSE') navigation.goBack();
    } catch (_) {}
  };

  const gatewayBootstrap = `
    (function(){
      var APP=${JSON.stringify({ id: app?.id || '', name: app?.name || '', description: app?.description || '', icon: app?.icon || '🚀' })};
      var GATEWAY=${JSON.stringify(app?.gateway || {})};
      var USER=${JSON.stringify({ uid: auth.currentUser?.uid || '', name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User' })};
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
        close:function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'NAX_CLOSE'}));}
      };
    })(); true;`;

  if (error) return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}><View style={styles.center}><Text style={{color:theme.text}}>{error}</Text></View></SafeAreaView>;
  if (!app) return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}><View style={styles.center}><ActivityIndicator color={theme.blue}/><Text style={{color:theme.sub,marginTop:10}}>Opening Nax App…</Text></View></SafeAreaView>;
  return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}>
    <View style={[styles.header,{backgroundColor:theme.surface,borderBottomColor:theme.border}]}>
      <TouchableOpacity onPress={()=>navigation.goBack()} style={styles.headerBtn}><Ionicons name="chevron-back" size={25} color={theme.text}/></TouchableOpacity>
      <View style={{flex:1,marginHorizontal:8}}><Text style={{color:theme.text,fontWeight:'900'}} numberOfLines={1}>{app.name}</Text><Text style={{color:theme.blue,fontSize:9,fontWeight:'800'}}>NAX GATEWAY · STORE APP</Text></View>
      <TouchableOpacity onPress={()=>navigation.navigate('NaxAppSharePicker',{app})} style={styles.headerBtn}><Ionicons name="share-outline" size={21} color={theme.text}/></TouchableOpacity>
    </View>
    <WebView originWhitelist={['*']} source={{html:app.html}} javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false} onMessage={handleMessage} injectedJavaScriptBeforeContentLoaded={gatewayBootstrap} />
  </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1},header:{height:58,flexDirection:'row',alignItems:'center',paddingHorizontal:8,borderBottomWidth:1},headerBtn:{width:42,height:42,alignItems:'center',justifyContent:'center'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24}});
