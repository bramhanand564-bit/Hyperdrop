import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebaseConfig';
import BotAPI from '../../api/BotAPI';
import BotRuntime from '../../bot-runtime/BotRuntime';
import AIService from '../../ai/AIService';

export default function BotAppSurface({ appId, botId, appName, appIcon='🤖', navigation }) {
  const [bot, setBot] = useState(null);
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [buttons, setButtons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const runtimeRef = useRef(null);

  useEffect(() => {
    let alive = true;
    if (!botId) { setLoading(false); return () => { alive = false; }; }
    BotAPI.getBot(botId).then(value => {
      if (!alive) return;
      if (!value) { setReply('This bot is no longer available.'); setLoading(false); return; }
      setBot(value);
      setButtons(Array.isArray(value.buttons) ? value.buttons.slice(0, 8) : []);
      const runtime = new BotRuntime({
        bot: value,
        user: { uid: auth.currentUser?.uid || '', name: auth.currentUser?.displayName || 'User' }
      });
      const started = runtime.start();
      runtimeRef.current = runtime;
      if (started?.response?.text) setReply(started.response.text);
      setButtons(started?.response?.buttons || value.buttons || []);
      setLoading(false);
    }).catch(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [botId]);

  const send = async value => {
    const text = String(value ?? input).trim();
    if (!text || busy || !bot) return;
    setInput('');
    setBusy(true);
    try {
      if (bot.systemPrompt) {
        const aiReply = await AIService.generateText({
          connectionId: bot.aiConnectionId || undefined,
          model: bot.aiModel || undefined,
          systemPrompt: bot.systemPrompt,
          messages: [{ role:'user', content:text }],
          maxTokens: 800,
        });
        setReply(String(aiReply || '').slice(0, 5000));
        setButtons(bot.buttons || []);
      } else {
        const runtime = runtimeRef.current;
        const result = runtime ? runtime.handleMessage({ text }) : null;
        setReply(result?.response?.text || 'No response.');
        setButtons(result?.response?.buttons || bot.buttons || []);
      }
      await BotAPI.recordBotUsage(bot.id).catch(() => {});
    } catch (e) {
      setReply(e?.message || 'Bot response failed.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="small" color="#087EFF" /><Text style={styles.muted}>Loading bot surface…</Text></View>;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}><Text style={{fontSize:22}}>{appIcon}</Text></View>
        <View style={{flex:1,marginLeft:9}}>
          <Text style={styles.title} numberOfLines={1}>{appName || bot?.name || 'Bot App'}</Text>
          <Text style={styles.status}>● LIVE BOT · CONNECTED TO ORIGINAL LOGIC</Text>
        </View>
      </View>
      <View style={styles.replyBox}>
        <Text style={styles.reply}>{reply || bot?.welcomeMessage || 'Send a message.'}</Text>
      </View>
      {buttons.length ? <View style={styles.buttons}>{buttons.slice(0, 8).map((button,index) => (
        <TouchableOpacity key={button.id || button.buttonId || index} disabled={busy} onPress={() => send(button.type === 'command' ? '/' + String(button.command || '').replace(/^\\/+/, '') : (button.text || button.label || ''))} style={styles.button}>
          <Text style={styles.buttonText}>{button.label || button.text || 'Option'}</Text>
        </TouchableOpacity>
      ))}</View> : null}
      <View style={styles.composer}>
        <TextInput value={input} onChangeText={setInput} placeholder="Message the bot…" placeholderTextColor="#8AA0B5" style={styles.input} maxLength={5000} />
        <TouchableOpacity onPress={() => send()} disabled={busy || !input.trim()} style={[styles.send,{opacity:busy || !input.trim() ? .45 : 1}]}>
          {busy ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="arrow-up" size={17} color="#FFF" />}
        </TouchableOpacity>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation?.navigate('NaxAppRuntime',{appId})} style={styles.openBtn}><Ionicons name="open-outline" size={14} color="#087EFF" /><Text style={styles.openText}>Open Full App</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles=StyleSheet.create({
  card:{width:290,borderWidth:1,borderColor:'rgba(8,126,255,.18)',borderRadius:19,padding:12,backgroundColor:'rgba(8,126,255,.045)'},
  head:{flexDirection:'row',alignItems:'center'},icon:{width:43,height:43,borderRadius:13,backgroundColor:'rgba(8,126,255,.1)',alignItems:'center',justifyContent:'center'},title:{fontSize:14,fontWeight:'900',color:'#142532'},status:{fontSize:8,fontWeight:'900',color:'#34C759',marginTop:4},
  replyBox:{marginTop:10,borderRadius:13,borderWidth:1,borderColor:'rgba(8,126,255,.12)',backgroundColor:'#FFF',padding:9},reply:{fontSize:12,lineHeight:17,color:'#142532'},
  buttons:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:8},button:{borderWidth:1,borderColor:'rgba(8,126,255,.2)',borderRadius:10,paddingHorizontal:9,paddingVertical:7,backgroundColor:'#FFF'},buttonText:{fontSize:10,fontWeight:'900',color:'#087EFF'},
  composer:{marginTop:9,minHeight:42,borderWidth:1,borderColor:'rgba(8,126,255,.16)',borderRadius:12,backgroundColor:'#FFF',flexDirection:'row',alignItems:'center',paddingLeft:10,paddingRight:4},input:{flex:1,fontSize:12,color:'#142532'},send:{width:34,height:34,borderRadius:11,backgroundColor:'#087EFF',alignItems:'center',justifyContent:'center'},
  footer:{marginTop:8,paddingTop:7,borderTopWidth:1,borderTopColor:'rgba(8,126,255,.09)'},openBtn:{flexDirection:'row',alignItems:'center',gap:5},openText:{fontSize:9,fontWeight:'900',color:'#087EFF'},loading:{padding:15,alignItems:'center'},muted:{fontSize:10,color:'#6C8494',marginTop:7}
});
