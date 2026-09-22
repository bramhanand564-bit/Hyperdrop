// ==========================================
// FILE: studio/StudioPublisher.js
// ==========================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  Platform, TextInput, KeyboardAvoidingView, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// 🔥 IMPORT THE REAL API
import { auth } from '../firebaseConfig';
import { MiniAppAPI } from '../api/MiniAppAPI';
import BotAPI from '../api/BotAPI';
import { URLValidator } from '../security/BotValidator';
import AuditLogger from '../security/AuditLogger';

const CATEGORIES = ['Games', 'Productivity', 'Tools', 'AI Bots', 'Finance', 'Media'];

export default function StudioPublisher({ route, navigation }) {
  const { isDark } = useTheme();
  const { appConfig, tested = false } = route.params || {};

  const [appName, setAppName] = useState(appConfig?.name || '');
  const [appDesc, setAppDesc] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Productivity');
  const [isPublishing, setIsPublishing] = useState(false);

  // Colors
  const bg = isDark ? '#050A10' : '#F3F7FA';
  const headerBg = isDark ? '#0B1824' : '#FFFFFF';
  const cardBg = isDark ? '#101A26' : '#FFFFFF';
  const inputBg = isDark ? '#14202E' : '#EEF3F7';
  const textMain = isDark ? '#F4F7FA' : '#142532';
  const textSub = isDark ? '#8FA6B9' : '#6C8494';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const purple = '#AF52DE'; 
  const appColor = appConfig?.color || purple;

  // 🚀 REAL PUBLISH HANDLER
  const handlePublish = async () => {
    if (!appName.trim()) {
      Alert.alert('Required', 'Please provide an app name.');
      return;
    }

    if (!tested) { Alert.alert('Test Required', 'Run the sandbox test before publishing.'); return; }
    if (appConfig?.url && !URLValidator.scanMiniAppUrl(appConfig.url).isSafe) { Alert.alert('Security Blocked', 'The app URL failed security validation.'); return; }
    setIsPublishing(true);

    try {
      // Call the API Layer
      await AuditLogger.log('studio.publish', { appName: appName.trim(), category: selectedCategory, kind: appConfig.kind || 'miniapp' });
      if (appConfig.kind === 'bot') {
        const bot = await BotAPI.createValidatedBot(auth.currentUser?.uid, {
          name: appName.trim(),
          username: `${appName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20)}_${Date.now().toString().slice(-4)}`,
          description: appDesc.trim() || appConfig.description || appConfig.originalPrompt,
          welcomeMessage: appConfig.commands?.find(command => command.name === 'start')?.response || 'Hello from Nax Studio.',
          visibility: 'public',
          commands: appConfig.commands || [],
          buttons: appConfig.buttons || [],
          permissions: appConfig.permissions || []
        });
        Alert.alert('🎉 Bot Published', `${bot.name} is now available in the canonical bots collection.`, [{ text: 'Open Portal', onPress: () => navigation.navigate('PortalHome') }]);
      } else {
        await MiniAppAPI.publishMiniApp(appConfig, appName.trim(), appDesc.trim(), selectedCategory);
        Alert.alert('🎉 Published Successfully!', `"${appName}" is now live on the Nax Portal!`, [{ text: 'View in Portal', onPress: () => navigation.navigate('PortalHome') }]);
      }
      
      Alert.alert(
        "🎉 Published Successfully!", 
        `"${appName}" is now live on the Nax Portal!`,
        [
          { 
            text: "View in Portal", 
            onPress: () => navigation.navigate('PortalHome') // Route to Portal
          }
        ]
      );
    } catch (error) {
      console.log("Publish Error:", error);
      Alert.alert("Publish Failed", error.message || "Something went wrong.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!appConfig) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: textMain }}>No App Configuration found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#087EFF' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textMain }]}>Publish App</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={styles.identitySection}>
            <View style={[styles.bigIconBox, { backgroundColor: `${appColor}20` }]}>
              <Ionicons name={appConfig.icon || 'apps'} size={48} color={appColor} />
            </View>
            <Text style={[styles.identityName, { color: textMain }]}>{appName || 'App Name'}</Text>
            <Text style={[styles.identitySub, { color: textSub }]}>By You</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: textMain }]}>App Name</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: border }]}>
              <TextInput
                style={[styles.input, { color: textMain }]}
                value={appName}
                onChangeText={setAppName}
                placeholder="Enter app name"
                placeholderTextColor={textSub}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: textMain }]}>Short Description</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: border, height: 100, alignItems: 'flex-start' }]}>
              <TextInput
                style={[styles.input, { color: textMain, height: '100%', textAlignVertical: 'top' }]}
                value={appDesc}
                onChangeText={setAppDesc}
                placeholder="What does this app do?"
                placeholderTextColor={textSub}
                multiline
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: textMain }]}>Category</Text>
            <View style={styles.categoriesWrapper}>
              {CATEGORIES.map((cat, idx) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.catPill, { backgroundColor: isSelected ? purple : cardBg, borderColor: isSelected ? purple : border }]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.catText, { color: isSelected ? '#FFF' : textSub }]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.bottomBar, { backgroundColor: headerBg, borderTopColor: border }]}>
        <TouchableOpacity 
          style={[styles.publishBtn, { backgroundColor: purple, opacity: isPublishing ? 0.7 : 1 }]}
          disabled={isPublishing}
          onPress={handlePublish}
        >
          {isPublishing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="rocket" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.publishBtnText}>Publish to Nax Portal</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: Platform.OS === 'ios' ? 10 : 15, paddingBottom: 15, borderBottomWidth: 1 },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  identitySection: { alignItems: 'center', marginBottom: 30 },
  bigIconBox: { width: 90, height: 90, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  identityName: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  identitySub: { fontSize: 13, fontWeight: '500' },
  inputGroup: { marginBottom: 25 },
  inputLabel: { fontSize: 14, fontWeight: '700', marginBottom: 10, marginLeft: 4 },
  inputWrapper: { height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 15, justifyContent: 'center' },
  input: { flex: 1, fontSize: 16 },
  categoriesWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 14, fontWeight: '600' },
  bottomBar: { padding: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 15, borderTopWidth: 1 },
  publishBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  publishBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' }
});
