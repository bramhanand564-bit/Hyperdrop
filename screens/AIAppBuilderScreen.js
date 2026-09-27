import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import AIAppBuilderService from '../api/AIAppBuilderService';
import AISettingsService from '../ai/AISettingsService';
import NaxAppStoreAPI from '../api/NaxAppStoreAPI';

function previewSource(project) {
  if (!project) return '<html><body style="font-family:system-ui;padding:30px"><h2>Start building</h2><p>Describe an app below.</p></body></html>';
  if (project.target === 'SINGLE_HTML') return project.html || project.files?.['index.html'] || '';
  const files = project.files || {};
  const htmlPath = Object.keys(files).find(path => /(?:^|\/)index\.html$/i.test(path));
  let html = htmlPath ? files[htmlPath] : '';
  if (!html) return '<html><body style="font-family:system-ui;padding:30px"><h2>Advanced project</h2><p>No preview HTML file yet.</p></body></html>';
  const base = htmlPath.includes('/') ? htmlPath.slice(0, htmlPath.lastIndexOf('/') + 1) : '';

  html = html.replace(/<link[^>]*href=["']([^"']+)["'][^>]*>/gi, (full, rel) => {
    const path = base + String(rel).replace(/^\.\//, '');
    return /stylesheet/i.test(full) && files[path] != null ? '<style>' + files[path] + '</style>' : full;
  });

  html = html.replace(/<script[^>]+src=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (full, rel) => {
    const path = base + String(rel).replace(/^\.\//, '');
    return files[path] != null ? '<script>' + files[path] + '</script>' : full;
  });

  return html;
}

export default function AIAppBuilderScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [project, setProject] = useState(route.params?.project || null);
  const [connectionId, setConnectionId] = useState(null);
  const [model, setModel] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('preview');
  const [selectedFile, setSelectedFile] = useState('index.html');
  const [editorValue, setEditorValue] = useState('');
  const [savingCode, setSavingCode] = useState(false);
  const [publishingStore, setPublishingStore] = useState(false);
  const [chatTab, setChatTab] = useState(false);

  const load = useCallback(async () => {
    try {
      const active = await AISettingsService.getActiveConnection();
      if (active) {
        setConnectionId(active.id);
        setModel(active.model || active.models?.[0] || null);
      }
      const importedProject = route.params?.importedProject;
      if (importedProject && !project) {
        const imported = await AIAppBuilderService.importProject(importedProject);
        setProject(imported);
        setMessages([{ role: 'assistant', content: 'Custom project imported successfully. Tell me what it is, what you want to change, and how it should work. I will discuss first and only build when you ask.', at: Date.now() }]);
        return;
      }
      const importedHtml = route.params?.importedHtml;
      if (importedHtml && !project) {
        const imported = await AIAppBuilderService.createProject({
          name: route.params?.importedName || 'Imported Nax App',
          request: 'Imported HTML app',
          target: 'SINGLE_HTML',
          html: importedHtml,
        });
        setProject(imported);
        setMessages([{ role: 'assistant', content: 'Imported successfully. Chat with me about what you want to change, then tell me when to build.', at: Date.now() }]);
        return;
      }
      const id = route.params?.project?.id;
      if (id) {
        const full = await AIAppBuilderService.getProject(id);
        if (full) { setProject(full); setMessages(full.chat || []); }
      } else if (!project) {
        const current = await AIAppBuilderService.getCurrent();
        if (current) setProject(current);
        const workspaceChat = await AIAppBuilderService.getWorkspaceChat();
        if (workspaceChat.length) setMessages(workspaceChat);
      }
    } catch (e) { console.log('AI builder load:', e); }
  }, [route.params?.project?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (project?.files?.[selectedFile] != null) setEditorValue(project.files[selectedFile]);
    else if (project?.html && selectedFile === 'index.html') setEditorValue(project.html);
    else setEditorValue('');
  }, [project, selectedFile]);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => {}, 1000);
    return () => clearInterval(timer);
  }, [busy]);

  const persistChat = async nextMessages => {
    setMessages(nextMessages);
    try { await AIAppBuilderService.saveChat(project, nextMessages); } catch (_) {}
  };

  const files = useMemo(() => Object.keys(project?.files || {}).sort(), [project]);
  const previewHtml = useMemo(() => previewSource(project), [project]);

  const send = async () => {
    const request = input.trim();
    if (!request || busy) return;
    setBusy(true);
    const userMessage = { role: 'user', content: request, at: Date.now() };
    const nextUserMessages = [...messages, userMessage];
    setMessages(nextUserMessages);
    try {
      let current = project;
      const chatHistory = nextUserMessages;
      const draft = await AIAppBuilderService.buildWithAI({ project: current, request, connectionId, model, chat: chatHistory });
      if (draft?.mode === 'CHAT') {
        const assistant = { role: 'assistant', content: draft.reply || draft.progress || 'Haan bhai, bolo. Hum is app par saath mein kaam kar sakte hain.', at: Date.now(), mode: 'CHAT' };
        await AIAppBuilderService.saveChat(current, [...nextUserMessages, assistant]);
        setMessages(m => [...m, assistant]);
        setInput('');
        return;
      }

      if (draft?.mode === 'TEST') {
        const testLines = Array.isArray(draft.tests)
          ? draft.tests.map(test => (test.result === 'pass' ? '✓ ' : test.result === 'fail' ? '✗ ' : '? ') + test.name + (test.detail ? ': ' + test.detail : '')).join('\n')
          : '';
        const assistant = {
          role: 'assistant',
          content: [draft.reply || 'Test complete.', testLines, Array.isArray(draft.failures) && draft.failures.length ? 'Problems: ' + draft.failures.join(' · ') : 'No confirmed problems found.', Array.isArray(draft.nextSteps) && draft.nextSteps.length ? 'Next: ' + draft.nextSteps[0] : ''].filter(Boolean).join('\n')
        };
        await AIAppBuilderService.saveChat(current, [...nextUserMessages, assistant]);
        setMessages(m => [...m, assistant]);
        setInput('');
        return;
      }

      if (!current) current = await AIAppBuilderService.createProject({ name: draft.name || request.slice(0, 50), request, target: draft.target, html: draft.html });
      const next = await AIAppBuilderService.applyBuild(current, draft, request, chatHistory);
      const assistantText = [
        draft.progress || draft.summary || 'Build updated.',
        Array.isArray(draft.remaining) && draft.remaining.length ? 'Baki: ' + draft.remaining.join(' · ') : 'Baki: kuch critical nahi.',
        Array.isArray(draft.nextSteps) && draft.nextSteps.length ? 'Next: ' + draft.nextSteps[0] : 'Next: jo change chahiye bol do.',
      ].join('\n');
      const assistant = { role: 'assistant', content: assistantText };
      setProject(next);
      const finalChat = [...nextUserMessages, assistant];
      setMessages(finalChat);
      await AIAppBuilderService.saveChat(next, finalChat).catch(() => {});
      const selected = next.files?.[selectedFile] != null ? selectedFile : (next.target === 'SINGLE_HTML' ? 'index.html' : Object.keys(next.files || {})[0]);
      if (selected) setSelectedFile(selected);
      setInput('');
      setTab('preview');
    } catch (e) {
      const errorText = e?.message || 'Unknown error';
      setMessages(m => [...m, { role: 'assistant', content: 'Issue mila: ' + errorText + '\\nMain isko fix kar sakta hoon. “Fix it” bhejo.' }]);
    } finally { setBusy(false); }
  };

  const saveCode = async () => {
    if (!project || !selectedFile || savingCode) return;
    setSavingCode(true);
    try {
      const next = await AIAppBuilderService.updateFile(project, selectedFile, editorValue, { action: 'manual edit ' + selectedFile, createVersion: true });
      setProject(next);
      setMessages(m => [...m, { role: 'assistant', content: 'Saved ' + selectedFile + '.' }]);
    } catch (e) { Alert.alert('Save failed', e?.message || 'Could not save the file.'); }
    finally { setSavingCode(false); }
  };


  const redo = async () => {
    if (!project || !(project.redo || []).length) return;
    try { setProject(await AIAppBuilderService.redo(project)); setMessages(m => [...m, { role: 'assistant', content: 'Re-applied the next build version.' }]); }
    catch (e) { Alert.alert('Redo', e?.message || 'Could not re-apply the version.'); }
  };

  const undo = async () => {
    if (!project || (project.versions || []).length < 2) return;
    try { setProject(await AIAppBuilderService.undo(project)); setMessages(m => [...m, { role: 'assistant', content: 'Reverted one build version.' }]); }
    catch (e) { Alert.alert('Undo', e?.message || 'Could not restore the previous version.'); }
  };

  const publishToStore = async () => {
    if (!project || project.target !== 'SINGLE_HTML') {
      Alert.alert('Nax Store', 'Only Single HTML apps can be published to Nax Store right now.');
      return;
    }
    if (publishingStore) return;
    setPublishingStore(true);
    try {
      const next = await AIAppBuilderService.publishToNaxStore(project);
      setProject(next);
      setMessages(m => [...m, { role: 'assistant', content: 'Published to Nax Store ✓\\nYour app is now public and ready to use.', at: Date.now() }]);
      Alert.alert('Published ✓', 'Your app is now live on Nax Store.');
    } catch (e) {
      Alert.alert('Publish failed', e?.message || 'Could not publish to Nax Store. Check that you are signed in.');
    } finally {
      setPublishingStore(false);
    }
  };

  const prepareAndroid = async () => {
    if (!project) return;
    try {
      const next = await AIAppBuilderService.prepareAndroidPackage(project);
      setProject(next);
      setTab('files');
      Alert.alert('Android project ready', 'Android source + GitHub Actions APK workflow was added to this project.');
    } catch (e) { Alert.alert('Android packaging', e?.message || 'Could not prepare the Android project.'); }
  };

  const publishToStore = async () => {
    if (!project || project.target !== 'SINGLE_HTML') {
      Alert.alert('Nax Store', 'Public web publishing currently supports Single HTML apps. Advanced APK publishing will come with the Android release pipeline.');
      return;
    }
    setPublishingStore(true);
    try {
      const next = await AIAppBuilderService.publishToNaxStore(project);
      setProject(next);
      setMessages(m => [...m, { role: 'assistant', content: 'Published to Nax Store ✓. Your app is now public in the store.', at: Date.now() }]);
      Alert.alert('Published', 'Your app is now live in Nax Store.');
    } catch (e) {
      Alert.alert('Publish failed', e?.message || 'Could not publish to Nax Store.');
    } finally { setPublishingStore(false); }
  };

  const exportProject = async () => {
    if (!project) return;
    try {
      const path = await AIAppBuilderService.exportProject(project);
      Alert.alert('Exported', 'Project files saved locally at:\n' + path);
    } catch (e) { Alert.alert('Export failed', e?.message || 'Could not export the project.'); }
  };

  const startNew = () => {
    setProject(null);
    setSelectedFile('index.html');
    setEditorValue('');
    setMessages([]);
    setInput('');
    AIAppBuilderService.clearWorkspaceChat().catch(() => {});
    setTab('preview');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="chevron-back" size={22} color={theme.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{project?.name || 'AI App Builder'}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: project?.target === 'ADVANCED_PROJECT' ? '#FF9500' : theme.green }]} />
              <Text style={[styles.sub, { color: theme.sub }]}>{project?.target === 'ADVANCED_PROJECT' ? 'Advanced project' : 'Single HTML'}{project?.naxStoreStatus === 'published' ? ' · 🟢 Live on Nax Store' : model ? ' · AI ready' : ' · Configure AI in Settings'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={undo} disabled={!project || (project.versions || []).length < 2} style={[styles.icon, { borderColor: theme.border, opacity: project && (project.versions || []).length > 1 ? 1 : .35 }]}><Ionicons name="arrow-undo" size={18} color={theme.text} /></TouchableOpacity>
          <TouchableOpacity onPress={redo} disabled={!project || !(project.redo || []).length} style={[styles.icon, { borderColor: theme.border, marginLeft: 5, opacity: project && (project.redo || []).length ? 1 : .35 }]}><Ionicons name="arrow-redo" size={18} color={theme.text} /></TouchableOpacity>
          {project && <TouchableOpacity onPress={() => navigation.navigate('AIAppRuntime', { projectId: project.id, title: project.name })} style={[styles.icon, { borderColor: theme.border, marginLeft: 5 }]}><Ionicons name="play" size={17} color={theme.text} /></TouchableOpacity>}
          {project?.target === 'SINGLE_HTML' && <TouchableOpacity onPress={publishToStore} disabled={publishingStore} style={[styles.icon, { borderColor: theme.border, marginLeft: 5, opacity: publishingStore ? .5 : 1 }]}><Ionicons name="cloud-upload-outline" size={17} color={theme.blue} /></TouchableOpacity>}
          <TouchableOpacity onPress={startNew} style={[styles.icon, { borderColor: theme.border, marginLeft: 6 }]}><Ionicons name="add" size={18} color={theme.text} /></TouchableOpacity>
        </View>

        <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
          {[
            ['preview', 'eye-outline', 'Preview'],
            ['code', 'code-slash-outline', 'Code'],
            ['files', 'folder-open-outline', 'Files'],
            ['chat', 'chatbubble-ellipses-outline', 'Chat'],
          ].map(([id, iconName, label]) => (
            <TouchableOpacity key={id} onPress={() => setTab(id)} style={[styles.tab, tab === id && { borderBottomColor: theme.blue }]}><Ionicons name={iconName} size={15} color={tab === id ? theme.blue : theme.sub} /><Text style={[styles.tabText, { color: tab === id ? theme.blue : theme.sub }]}>{label}</Text></TouchableOpacity>
          ))}
        </View>

        {tab === 'chat' ? (
          <View style={[styles.fullChat, { backgroundColor: theme.bg }]}>
            <View style={[styles.chatHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
              <View>
                <Text style={[styles.chatTitle, { color: theme.text }]}>AI Chat</Text>
                <Text style={[styles.chatSub, { color: theme.sub }]}>{busy ? 'AI is thinking / implementing…' : 'Discuss first. Build only when you ask.'}</Text>
              </View>
              <View style={[styles.livePill, { borderColor: busy ? theme.blue : theme.border }]}>
                <View style={[styles.liveDot, { backgroundColor: busy ? theme.blue : theme.green }]} />
                <Text style={[styles.liveText, { color: theme.text }]}>{busy ? 'IMPLEMENTING' : 'LIVE'}</Text>
              </View>
            </View>
            <ScrollView style={styles.chatHistory} contentContainerStyle={{ padding: 12 }}>
              {messages.length ? messages.map((m, i) => (
                <View key={i} style={[styles.messageBubble, { backgroundColor: m.role === 'user' ? theme.surface : theme.surfaceStrong, borderColor: theme.border, alignSelf: m.role === 'user' ? 'flex-end' : 'stretch' }]}>
                  <Text style={[styles.messageRole, { color: m.role === 'user' ? theme.blue : theme.sub }]}>{m.role === 'user' ? 'You' : 'AI'}{m.at ? ' · ' + new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                  <Text style={[styles.msg, { color: theme.text }]}>{m.content}</Text>
                </View>
              )) : <Text style={[styles.tip, { color: theme.sub }]}>Start by talking to the AI. You can discuss the idea, purpose, UI, behavior and workflow before asking it to build anything.</Text>}
            </ScrollView>
            <View style={[styles.fullComposer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
              <TextInput value={input} onChangeText={setInput} placeholder="Talk to AI… discuss before building" placeholderTextColor={theme.sub} style={[styles.input, { color: theme.text }]} multiline />
              <TouchableOpacity onPress={send} disabled={busy || !input.trim()} style={[styles.send, { backgroundColor: theme.blue, opacity: busy || !input.trim() ? .4 : 1 }]}>
                {busy ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="arrow-up" size={19} color="#FFF" />}
              </TouchableOpacity>
            </View>
          </View>
        ) : tab === 'preview' ? (
          <View style={styles.preview}><WebView originWhitelist={['*']} source={{ html: previewHtml }} javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false} /></View>
        ) : tab === 'code' ? (
          <View style={{ flex: 1 }}>
            <View style={[styles.codeHead, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
              <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>{selectedFile || 'index.html'}</Text>
              <TouchableOpacity onPress={saveCode} disabled={!project || savingCode} style={[styles.save, { backgroundColor: theme.blue, opacity: project && !savingCode ? 1 : .4 }]}>{savingCode ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveText}>Save</Text>}</TouchableOpacity>
            </View>
            <TextInput
              value={editorValue}
              onChangeText={setEditorValue}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              textAlignVertical="top"
              style={[styles.editor, { backgroundColor: theme.bg, color: theme.text }]}
              placeholder="Select a file first"
              placeholderTextColor={theme.sub}
            />
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.filesWrap}>
            <Text style={[styles.fileTitle, { color: theme.text }]}>Project files</Text>
            {files.map(path => (
              <TouchableOpacity key={path} onPress={() => { setSelectedFile(path); setTab('code'); }} style={[styles.fileRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name={path === 'MEMORY.md' ? 'brain-outline' : path.endsWith('.html') ? 'logo-html5' : path.endsWith('.css') ? 'color-palette-outline' : path.endsWith('.js') || path.endsWith('.kt') ? 'code-slash-outline' : 'document-text-outline'} size={18} color={theme.blue} />
                <Text style={[styles.filePath, { color: theme.text }]}>{path}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.sub} />
              </TouchableOpacity>
            ))}
            {!project ? <Text style={[styles.help, { color: theme.sub }]}>Create an app from chat and its files will appear here.</Text> : null}
            {project ? (
              <View>
                <View style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Version history</Text>
                  {(project.versions || []).slice().reverse().slice(0, 5).map(version => (
                    <TouchableOpacity key={version.version} onPress={async () => { try { setProject(await AIAppBuilderService.restoreVersion(project, version.version)); setMessages(m => [...m, { role: 'assistant', content: 'Restored v' + version.version + '.' }]); } catch (e) { Alert.alert('Restore failed', e?.message || 'Could not restore the version.'); } }} style={styles.historyRow}>
                      <Text style={[styles.historyVersion, { color: theme.text }]}>v{version.version}</Text><Text style={[styles.historyAction, { color: theme.sub }]} numberOfLines={1}>{version.action}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Nax Store</Text>
                  <Text style={[styles.actionText, { color: theme.sub }]}>Publish this Single HTML app so other Nax users can discover and use it.</Text>
                  <TouchableOpacity onPress={publishToStore} disabled={publishingStore} style={[styles.actionBtn, { backgroundColor: theme.blue, marginTop: 10, opacity: publishingStore ? .5 : 1 }]}>
                    {publishingStore ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="cloud-upload-outline" size={15} color="#FFF" />}
                    <Text style={styles.actionBtnText}>{publishingStore ? 'Publishing…' : (project.naxStoreStatus === 'published' ? 'Update Live App' : 'Publish to Nax Store')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 10 }]}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Package</Text>
                  <Text style={[styles.actionText, { color: theme.sub }]}>Generate an Android WebView project and a GitHub Actions workflow that can build an APK from the app source.</Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={prepareAndroid} style={[styles.actionBtn, { backgroundColor: theme.blue }]}><Ionicons name="logo-android" size={15} color="#FFF" /><Text style={styles.actionBtnText}>Prepare APK</Text></TouchableOpacity>
                    <TouchableOpacity onPress={exportProject} style={[styles.actionBtn, { backgroundColor: theme.surfaceStrong, borderColor: theme.border, borderWidth: 1 }]}><Ionicons name="download-outline" size={15} color={theme.text} /><Text style={[styles.actionBtnText, { color: theme.text }]}>Export</Text></TouchableOpacity>
                  </View>
                </View>              </View>
            ) : null}
          </ScrollView>
        )}

        {tab !== 'chat' ? <View style={[styles.chat, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          {project?.progress ? (
            <View style={[styles.progressCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <View style={styles.progressHeader}>
                <Ionicons name="sparkles" size={13} color={theme.blue} />
                <Text style={[styles.progressLabel, { color: theme.blue }]}>AI BUILD STATUS</Text>
              </View>
              <Text style={[styles.progressText, { color: theme.text }]} numberOfLines={2}>{project.progress}</Text>
              {project.remaining?.length ? <Text style={[styles.remainingText, { color: theme.sub }]} numberOfLines={2}>Baki: {project.remaining.join(' · ')}</Text> : <Text style={[styles.remainingText, { color: theme.sub }]}>Baki: kuch critical nahi</Text>}
            </View>
          ) : null}
          <View style={styles.log}>
            {messages.length ? messages.slice(-4).map((m, i) => (
              <View key={i} style={[styles.messageBubble, { backgroundColor: m.role === 'user' ? theme.bg : theme.surfaceStrong, borderColor: theme.border, alignSelf: m.role === 'user' ? 'flex-end' : 'stretch' }]}>
                <Text style={[styles.messageRole, { color: m.role === 'user' ? theme.blue : theme.sub }]}>{m.role === 'user' ? 'You' : 'AI'}</Text>
                <Text style={[styles.msg, { color: theme.text }]}>{m.content}</Text>
              </View>
            )) : <Text style={[styles.tip, { color: theme.sub }]}>{project ? 'AI is your coding partner. Say “make this better”, “fix it”, or ask what should happen next.' : 'Tell me what app to build. I will build it, test the structure, and tell you what is done and what remains.'}</Text>}
          </View>
          <View style={[styles.inputRow, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <TextInput value={input} onChangeText={setInput} placeholder={project ? 'Tell AI what to change…' : 'Describe the app you want…'} placeholderTextColor={theme.sub} style={[styles.input, { color: theme.text }]} multiline />
            <TouchableOpacity onPress={send} disabled={busy || !input.trim()} style={[styles.send, { backgroundColor: theme.blue, opacity: busy || !input.trim() ? .4 : 1 }]}>{busy ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="arrow-up" size={19} color="#FFF" />}</TouchableOpacity>
          </View>
        </View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
  safe:{flex:1},header:{height:62,borderBottomWidth:1,flexDirection:'row',alignItems:'center',paddingHorizontal:9},back:{width:38,alignItems:'center'},title:{fontSize:16,fontWeight:'900'},statusRow:{flexDirection:'row',alignItems:'center',marginTop:2},dot:{width:6,height:6,borderRadius:3,marginRight:5},sub:{fontSize:10},icon:{width:37,height:37,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center'},tabs:{height:43,borderBottomWidth:1,flexDirection:'row'},tab:{flex:1,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6,borderBottomWidth:2,borderBottomColor:'transparent'},tabText:{fontSize:11,fontWeight:'900'},preview:{flex:1,backgroundColor:'#fff'},codeHead:{height:47,borderBottomWidth:1,flexDirection:'row',alignItems:'center',paddingHorizontal:12},fileName:{flex:1,fontSize:12,fontWeight:'800'},save:{height:34,minWidth:58,borderRadius:10,alignItems:'center',justifyContent:'center'},saveText:{color:'#fff',fontWeight:'900',fontSize:11},editor:{flex:1,padding:14,fontFamily:Platform.OS==='ios'?'Menlo':'monospace',fontSize:12,lineHeight:18},filesWrap:{padding:14,paddingBottom:160},fileTitle:{fontSize:18,fontWeight:'900',marginBottom:10},fileRow:{minHeight:48,borderWidth:1,borderRadius:14,paddingHorizontal:13,flexDirection:'row',alignItems:'center',marginBottom:8},filePath:{flex:1,fontSize:12,fontWeight:'800',marginLeft:10},help:{fontSize:12,lineHeight:18,marginTop:12,textAlign:'center'},actionCard:{borderWidth:1,borderRadius:18,padding:14,marginTop:10},actionTitle:{fontSize:15,fontWeight:'900'},actionText:{fontSize:11,lineHeight:17,marginTop:4},historyRow:{flexDirection:'row',alignItems:'center',paddingVertical:7},historyVersion:{fontSize:11,fontWeight:'900',width:36},historyAction:{fontSize:10,flex:1},actionRow:{flexDirection:'row',gap:8,marginTop:12},actionBtn:{height:40,flex:1,borderRadius:12,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6},actionBtnText:{color:'#FFF',fontSize:11,fontWeight:'900'},fullChat:{flex:1},chatHeader:{minHeight:58,paddingHorizontal:14,paddingVertical:9,borderBottomWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},chatTitle:{fontSize:16,fontWeight:'900'},chatSub:{fontSize:10,marginTop:2},livePill:{borderWidth:1,borderRadius:14,paddingHorizontal:9,paddingVertical:5,flexDirection:'row',alignItems:'center',gap:5},liveDot:{width:6,height:6,borderRadius:3},liveText:{fontSize:8,fontWeight:'900',letterSpacing:1},chatHistory:{flex:1},fullComposer:{minHeight:62,maxHeight:115,padding:8,borderTopWidth:1,flexDirection:'row',alignItems:'center',gap:7},chat:{minHeight:205,maxHeight:300,padding:11,borderTopWidth:1},progressCard:{borderWidth:1,borderRadius:12,padding:8,marginBottom:6},progressHeader:{flexDirection:'row',alignItems:'center',gap:5},progressLabel:{fontSize:8,fontWeight:'900',letterSpacing:1},progressText:{fontSize:10,fontWeight:'800',lineHeight:14,marginTop:3},remainingText:{fontSize:9,lineHeight:13,marginTop:2},log:{flex:1},messageBubble:{borderWidth:1,borderRadius:12,paddingHorizontal:9,paddingVertical:6,marginBottom:5,maxWidth:'94%'},messageRole:{fontSize:9,fontWeight:'900',marginBottom:2},msg:{fontSize:11,lineHeight:16,marginBottom:1},tip:{fontSize:11,lineHeight:16},inputRow:{minHeight:54,maxHeight:105,borderWidth:1,borderRadius:16,flexDirection:'row',alignItems:'center',paddingLeft:12,paddingRight:5},input:{flex:1,maxHeight:92,fontSize:13,paddingTop:10,paddingBottom:10},send:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'}
});
