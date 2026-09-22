import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { URLValidator } from '../security/BotValidator';

function buildAppConfig(prompt) {
  const safePrompt = String(prompt || '').trim().slice(0, 2000);
  return {
    name: 'Nax Generated App',
    description: safePrompt,
    originalPrompt: safePrompt,
    version: 1,
    entryType: 'declarative',
    icon: 'apps',
    color: '#AF52DE',
    permissions: [],
    components: [
      { type: 'header', text: 'Nax Generated App' },
      { type: 'text', text: safePrompt || 'Generated from Nax Studio.' },
      { type: 'input', placeholder: 'Try the app...' },
      { type: 'button', label: 'Continue', action: 'continue' }
    ]
  };
}

function validateAppConfig(config) {
  const errors = [];
  if (!config?.name) errors.push('App name is required.');
  if (config?.entryType !== 'declarative') errors.push('Only declarative apps are allowed in this Studio pipeline.');
  if (!Array.isArray(config?.components) || config.components.length === 0) errors.push('Generated app must contain components.');
  if (JSON.stringify(config).length > 10000) errors.push('Generated app configuration is too large.');
  return { valid: errors.length === 0, errors };
}

export default function StudioGenerator() {
  const { isDark } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const prompt = route?.params?.prompt || '';
  const [step, setStep] = useState('generating');
  const [appConfig, setAppConfig] = useState(null);
  const [error, setError] = useState('');

  const bg = isDark ? '#050A10' : '#F3F7FA';
  const cardBg = isDark ? '#1A222C' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? '#888888' : '#666666';
  const accent = '#087EFF';

  useEffect(() => {
    let mounted = true;
    const runPipeline = async () => {
      try {
        setStep('generating');
        await new Promise(resolve => setTimeout(resolve, 400));
        const config = buildAppConfig(prompt);
        if (!mounted) return;
        setStep('validating');
        const validation = validateAppConfig(config);
        if (!validation.valid) throw new Error(validation.errors.join(' '));
        setAppConfig(config);

        setStep('security');
        const security = config.url ? URLValidator.scanMiniAppUrl(config.url) : { isSafe: true };
        if (!security.isSafe) throw new Error(security.message || 'Security validation failed.');

        setStep('ready');
      } catch (e) {
        if (mounted) {
          setError(e?.message || 'Generation failed.');
          setStep('error');
        }
      }
    };
    runPipeline();
    return () => { mounted = false; };
  }, [prompt]);

  const openPreview = () => {
    if (appConfig) navigation.navigate('StudioPreview', { appConfig });
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.headerBox}>
        <MaterialCommunityIcons name="brain" size={40} color={accent} />
        <Text style={[styles.title, { color: textMain }]}>Nax Studio Pipeline</Text>
        <Text style={[styles.subtitle, { color: textSub }]}>Generate → Validate → Security Scan → Preview → Test → Publish</Text>
      </View>

      <View style={[styles.progressBox, { backgroundColor: cardBg }]}>
        {step !== 'ready' && step !== 'error' && <ActivityIndicator size="large" color={accent} />}
        <Text style={[styles.progressText, { color: textMain }]}>
          {step === 'generating' && 'Generating structured app configuration...'}
          {step === 'validating' && 'Validating app configuration...'}
          {step === 'security' && 'Running security scan...'}
          {step === 'ready' && 'Security scan passed. App is ready for preview.'}
          {step === 'error' && error}
        </Text>
      </View>

      {step === 'ready' && appConfig && (
        <View style={[styles.resultBox, { backgroundColor: cardBg }]}>
          <Ionicons name="checkmark-circle" size={50} color="#34C759" />
          <Text style={[styles.successText, { color: textMain }]}>App Configuration Ready</Text>
          <Text style={[styles.detail, { color: textSub }]}>{appConfig.originalPrompt}</Text>
          <TouchableOpacity style={[styles.testBtn, { backgroundColor: accent }]} onPress={openPreview}>
            <Text style={styles.testBtnText}>Open Secure Preview</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'error' && (
        <TouchableOpacity style={[styles.testBtn, { backgroundColor: accent }]} onPress={() => navigation.goBack()}>
          <Text style={styles.testBtnText}>Back to Studio</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  headerBox: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  subtitle: { fontSize: 13, textAlign: 'center', marginTop: 5, paddingHorizontal: 20 },
  progressBox: { padding: 30, borderRadius: 16, alignItems: 'center', elevation: 2 },
  progressText: { marginTop: 20, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  resultBox: { padding: 30, borderRadius: 16, alignItems: 'center', elevation: 2, marginTop: 20 },
  successText: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 12 },
  detail: { textAlign: 'center', marginBottom: 20 },
  testBtn: { width: '100%', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  testBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});