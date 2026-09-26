import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import AIAppBuilderService from '../api/AIAppBuilderService';

export default function AIAppRuntimeScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [project, setProject] = useState(route.params?.project || null);
  const [loading, setLoading] = useState(!project);
  const inlineHtml = route.params?.html || '';
  const html = project?.html || project?.files?.['index.html'] || inlineHtml;

  useEffect(() => {
    let mounted = true;
    const id = route.params?.projectId;
    if (!id) return undefined;
    setLoading(true);
    AIAppBuilderService.getProject(id).then(value => {
      if (mounted) setProject(value);
    }).catch(() => {}).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [route.params?.projectId]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btn}><Ionicons name="chevron-back" size={22} color={theme.text} /></TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{project?.name || route.params?.title || 'App'}</Text>
          <Text style={[styles.sub, { color: theme.sub }]}>Running app</Text>
        </View>
        <View style={styles.btn} />
      </View>
      <View style={{ flex: 1 }}>
        {loading ? <View style={styles.center}><ActivityIndicator color={theme.blue} /></View> : html ? (
          <WebView
            source={{ html }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            style={styles.web}
          />
        ) : (
          <View style={styles.center}><Ionicons name="warning-outline" size={34} color={theme.sub} /><Text style={[styles.empty,{color:theme.sub}]}>No runnable HTML found.</Text></View>
        )}
      </View>
    </SafeAreaView>
  );
}
const styles=StyleSheet.create({
  safe:{flex:1},header:{height:60,borderBottomWidth:1,flexDirection:'row',alignItems:'center',paddingHorizontal:8},btn:{width:42,height:42,alignItems:'center',justifyContent:'center'},title:{fontSize:15,fontWeight:'900'},sub:{fontSize:10,marginTop:2},web:{flex:1,backgroundColor:'#fff'},center:{flex:1,alignItems:'center',justifyContent:'center'},empty:{fontSize:12,marginTop:8}
});
