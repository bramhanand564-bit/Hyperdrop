import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import NaxAppStoreAPI from '../api/NaxAppStoreAPI';

export default function NaxAppRuntimeScreen({ route }) {
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

  const handleMessage = event => {
    try {
      const payload = JSON.parse(event.nativeEvent.data || '{}');
      if (payload.type === 'NAX_SHARE_TO_CHAT') navigation.navigate('NaxAppSharePicker', { app });
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
