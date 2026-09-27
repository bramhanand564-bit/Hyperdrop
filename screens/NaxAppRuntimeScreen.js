import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
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

  if (error) return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}><View style={styles.center}><Text style={{color:theme.text}}>{error}</Text></View></SafeAreaView>;
  if (!app) return <SafeAreaView style={[styles.safe,{backgroundColor:theme.bg}]}><View style={styles.center}><ActivityIndicator color={theme.blue}/><Text style={{color:theme.sub,marginTop:10}}>Opening Nax App…</Text></View></SafeAreaView>;
  return <SafeAreaView style={styles.safe}><WebView originWhitelist={['*']} source={{html:app.html}} javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false} /></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24}});
