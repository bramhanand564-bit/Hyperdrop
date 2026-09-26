import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import AIAppBuilderService from '../api/AIAppBuilderService';
import AISettingsService from '../ai/AISettingsService';

export default function AIAppBuilderScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [project, setProject] = useState(route.params?.project || null);
    const [connectionId, setConnectionId] = useState(null);
  const [model, setModel] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [items, active] = await Promise.all([AISettingsService.listConnections(), AISettingsService.getActiveConnection()]);
      setConnectionId(active?.id || items?.[0]?.id || null);
      setModel(active?.model || active?.models?.[0] || items?.[0]?.model || items?.[0]?.models?.[0] || null);
      if (!project) {
        const current = await AIAppBuilderService.getCurrent();
        if (current) setProject(current);
      }
    } catch (e) { console.log('AI builder load:', e); }
  }, [project]);

  useEffect(() => { load(); }, [load]);

  const previewHtml = useMemo(() => project?.target === 'SINGLE_HTML' ? project.html : '<html><body style="font-family:system-ui;padding:30px"><h2>Advanced project</h2><p>Source project created. Native packaging is the next build stage.</p></body></html>', [project]);

  const send = async () => {
    const request = input.trim();
    if (!request || busy) return;
    setBusy(true);
    setMessages(m => [...m, { role: 'user', content: request }]);
    try {
      let current = project;
      if (!current) current = await AIAppBuilderService.createProject({ name: request.slice(0, 45), request });
      const draft = await AIAppBuilderService.buildWithAI({ project: current, request, connectionId, model });
      const next = await AIAppBuilderService.applyBuild(current, draft, request);
      setProject(next);
      setMessages(m => [...m, { role: 'assistant', content: draft.summary || 'Updated the app.' }]);
      setInput('');
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Builder error: ' + (e?.message || 'Unknown error') }]);
    } finally { setBusy(false); }
  };

  const undo = async () => {
    if (!project) return;
    const next = await AIAppBuilderService.undo(project);
    setProject(next);
    setMessages(m => [...m, { role: 'assistant', content: 'Reverted to the previous version.' }]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="chevron-back" size={22} color={theme.text}/></TouchableOpacity>
          <View style={{ flex: 1 }}><Text style={[styles.title,{color:theme.text}]}>{project?.name || 'AI App Builder'}</Text><Text style={[styles.sub,{color:theme.sub}]}>{project?.target === 'ADVANCED_PROJECT' ? 'Advanced project' : 'Single HTML app'}</Text></View>
          <TouchableOpacity onPress={undo} disabled={!project || project.versions?.length < 2} style={[styles.tool,{borderColor:theme.border,opacity:project?.versions?.length>1?1:.4}]}><Ionicons name="arrow-undo" size={18} color={theme.text}/></TouchableOpacity>
        </View>
        <View style={styles.preview}><WebView originWhitelist={['*']} source={{ html: previewHtml }} javaScriptEnabled domStorageEnabled /></View>
        <View style={[styles.chat,{borderTopColor:theme.border,backgroundColor:theme.surface}]}>
          <View style={styles.log}><Text style={[styles.logTitle,{color:theme.text}]}>Build chat</Text>{messages.slice(-4).map((m,i)=><Text key={i} style={[styles.msg,{color:m.role==='user'?theme.text:theme.sub}]} numberOfLines={3}>{m.role==='user'?'You: ':'AI: '}{m.content}</Text>)}</View>
          <View style={[styles.inputRow,{borderColor:theme.border,backgroundColor:theme.bg}]}>
            <TextInput value={input} onChangeText={setInput} placeholder={project ? 'Tell AI what to change…' : 'Describe the app you want…'} placeholderTextColor={theme.sub} style={[styles.input,{color:theme.text}]} multiline />
            <TouchableOpacity onPress={send} disabled={busy || !input.trim()} style={[styles.send,{backgroundColor:theme.blue,opacity: busy || !input.trim() ? 0.4 : 1}]}>{busy?<ActivityIndicator color="#FFF" size="small"/>:<Ionicons name="arrow-up" size={20} color="#FFF"/>}</TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles=StyleSheet.create({
safe:{flex:1},header:{height:62,borderBottomWidth:1,flexDirection:'row',alignItems:'center',paddingHorizontal:10},back:{width:40,alignItems:'center'},title:{fontSize:16,fontWeight:'900'},sub:{fontSize:10,marginTop:2},tool:{width:38,height:38,borderWidth:1,borderRadius:12,alignItems:'center',justifyContent:'center'},preview:{flex:1,minHeight:260},chat:{minHeight:210,maxHeight:290,padding:12},log:{flex:1},logTitle:{fontWeight:'900',fontSize:12,marginBottom:5},msg:{fontSize:11,lineHeight:15,marginBottom:3},inputRow:{minHeight:52,maxHeight:100,borderWidth:1,borderRadius:16,flexDirection:'row',alignItems:'center',paddingLeft:12,paddingRight:5},input:{flex:1,fontSize:13,maxHeight:88},send:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'}
});
