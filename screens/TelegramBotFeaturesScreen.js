import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBot, updateValidatedBot } from '../api/BotAPI';
import TelegramBotService from '../telegram/TelegramBotService';
import { TELEGRAM_FEATURES, createDefaultTelegramFeatures } from '../telegram/TelegramFeatureRegistry';

const GROUPS = ['commands','messages','buttons','users','security','moderation','automation','commerce','growth','files','search','ai','engagement','support','links','integrations','analytics','admin','i18n','telegram'];

export default function TelegramBotFeaturesScreen({ navigation, route }) {
  const botId = route?.params?.botId || route?.params?.bot?.id;
  const [bot, setBot] = useState(route?.params?.bot || null);
  const [token, setToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [connected, setConnected] = useState(false);
  const [telegramUser, setTelegramUser] = useState(null);
  const [features, setFeatures] = useState(createDefaultTelegramFeatures(bot?.telegramFeatures));
  const [loading, setLoading] = useState(!bot);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!botId) return;
    getBot(botId).then(value => {
      if (value) {
        setBot(value);
        setFeatures(createDefaultTelegramFeatures(value.telegramFeatures));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [botId]);

  useEffect(() => {
    if (!botId) return;
    TelegramBotService.hasToken(botId).then(setConnected).catch(() => setConnected(false));
  }, [botId]);

  const groups = useMemo(() => ['all', ...GROUPS], []);
  const visible = useMemo(() => filter === 'all' ? TELEGRAM_FEATURES : TELEGRAM_FEATURES.filter(item => item.category === filter), [filter]);

  const connect = async () => {
    if (!botId || !token.trim()) return Alert.alert('Telegram', 'Bot token enter karo.');
    setBusy(true);
    try {
      await TelegramBotService.saveToken(botId, token.trim());
      const me = await TelegramBotService.getMe(botId);
      setTelegramUser(me);
      setConnected(true);
      setToken('');
      Alert.alert('Connected', 'Telegram bot connected.');
    } catch (e) {
      Alert.alert('Telegram connection failed', e.message);
    } finally { setBusy(false); }
  };

  const saveFeatures = async () => {
    if (!botId || !bot) return;
    setSaving(true);
    try {
      const updated = await updateValidatedBot(botId, { telegramFeatures: features, telegramEnabled: connected });
      setBot(updated || { ...bot, telegramFeatures: features, telegramEnabled: connected });
      if (connected && Array.isArray(bot.commands)) await TelegramBotService.setCommands(botId, bot.commands);
      Alert.alert('Saved', 'Telegram bot configuration saved.');
    } catch (e) { Alert.alert('Save failed', e.message); }
    finally { setSaving(false); }
  };

  const configureWebhook = async () => {
    if (!webhookUrl.trim()) return Alert.alert('Webhook', 'HTTPS webhook URL enter karo.');
    setBusy(true);
    try {
      await TelegramBotService.setWebhook(botId, webhookUrl.trim());
      Alert.alert('Webhook enabled', 'Telegram ab is HTTPS endpoint par updates bhejega.');
    } catch (e) { Alert.alert('Webhook failed', e.message); }
    finally { setBusy(false); }
  };

  const testPolling = async () => {
    setBusy(true);
    try {
      const updates = await TelegramBotService.getUpdates(botId, undefined, 0);
      Alert.alert('Telegram updates', (Array.isArray(updates) ? updates.length : 0) + ' pending update(s).');
    } catch (e) { Alert.alert('Polling failed', e.message); }
    finally { setBusy(false); }
  };

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator style={{ flex: 1 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color="#111" /></TouchableOpacity>
        <Text style={styles.title}>Telegram Bot</Text>
        <TouchableOpacity onPress={saveFeatures} disabled={saving}><Text style={styles.save}>{saving ? '...' : 'Save'}</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Connect Bot</Text>
          <TextInput value={token} onChangeText={setToken} placeholder={connected ? 'Connected • token hidden' : '123456:ABC...'} secureTextEntry autoCapitalize="none" style={styles.input} />
          <TouchableOpacity style={styles.primary} onPress={connect} disabled={busy}><Text style={styles.primaryText}>{connected ? 'Reconnect / Verify' : 'Connect & Verify'}</Text></TouchableOpacity>
          {telegramUser ? <Text style={styles.ok}>Connected: @{telegramUser.username || telegramUser.first_name}</Text> : null}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Webhook</Text>
          <Text style={styles.note}>Production/background Telegram updates ke liye public HTTPS backend endpoint chahiye.</Text>
          <TextInput value={webhookUrl} onChangeText={setWebhookUrl} placeholder="https://your-domain.com/telegram/webhook" autoCapitalize="none" style={styles.input} />
          <TouchableOpacity style={styles.secondary} onPress={configureWebhook} disabled={!connected || busy}><Text style={styles.secondaryText}>Set Webhook</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={testPolling} disabled={!connected || busy}><Text style={styles.secondaryText}>Check Updates</Text></TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>3. Features • 100</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {groups.map(group => <TouchableOpacity key={group} onPress={() => setFilter(group)} style={[styles.chip, filter === group && styles.chipActive]}><Text style={[styles.chipText, filter === group && styles.chipTextActive]}>{group}</Text></TouchableOpacity>)}
        </ScrollView>
        {visible.map(item => (
          <View key={item.id} style={styles.feature}>
            <View style={styles.number}><Text style={styles.numberText}>{TELEGRAM_FEATURES.indexOf(item) + 1}</Text></View>
            <View style={styles.featureText}><Text style={styles.featureTitle}>{item.label}</Text><Text style={styles.featureCategory}>{item.category}</Text></View>
            <Switch value={features[item.id] !== false} onValueChange={value => setFeatures(prev => ({ ...prev, [item.id]: value }))} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#F5F7FA'},header:{height:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,borderBottomWidth:1,borderBottomColor:'#E4E7EB',backgroundColor:'#FFF'},title:{fontSize:18,fontWeight:'800'},save:{color:'#087EFF',fontWeight:'800'},content:{padding:16,paddingBottom:50},card:{backgroundColor:'#FFF',borderRadius:16,padding:16,marginBottom:14,borderWidth:1,borderColor:'#E7EAF0'},cardTitle:{fontSize:16,fontWeight:'800',marginBottom:10},note:{fontSize:12,color:'#687386',lineHeight:18,marginBottom:10},input:{height:48,borderWidth:1,borderColor:'#DDE2E8',borderRadius:12,paddingHorizontal:12,marginBottom:10,backgroundColor:'#FAFBFC'},primary:{height:46,borderRadius:12,backgroundColor:'#087EFF',alignItems:'center',justifyContent:'center'},primaryText:{color:'#FFF',fontWeight:'800'},secondary:{height:42,borderRadius:11,backgroundColor:'#EEF5FF',alignItems:'center',justifyContent:'center',marginTop:8},secondaryText:{color:'#087EFF',fontWeight:'800'},ok:{color:'#1C9C55',fontSize:12,fontWeight:'700',marginTop:8},sectionTitle:{fontSize:18,fontWeight:'800',marginBottom:10},chip:{paddingHorizontal:12,paddingVertical:8,borderRadius:20,backgroundColor:'#FFF',marginRight:8,borderWidth:1,borderColor:'#E1E5EA'},chipActive:{backgroundColor:'#087EFF',borderColor:'#087EFF'},chipText:{fontSize:12,fontWeight:'700',color:'#667085'},chipTextActive:{color:'#FFF'},feature:{minHeight:60,backgroundColor:'#FFF',borderRadius:14,borderWidth:1,borderColor:'#E7EAF0',flexDirection:'row',alignItems:'center',paddingHorizontal:12,marginBottom:8},number:{width:30,height:30,borderRadius:10,backgroundColor:'#EEF5FF',alignItems:'center',justifyContent:'center',marginRight:10},numberText:{fontSize:11,fontWeight:'800',color:'#087EFF'},featureText:{flex:1},featureTitle:{fontSize:14,fontWeight:'700'},featureCategory:{fontSize:10,color:'#8A94A6',marginTop:2,textTransform:'uppercase'}
});
