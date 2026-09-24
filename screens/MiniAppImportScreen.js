import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { unzipSync, strFromU8 } from 'fflate';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import LocalMiniAppStore from '../mini-apps/LocalMiniAppStore';

function base64ToBytes(value) {
  const raw = globalThis.atob ? globalThis.atob(value) : (globalThis.Buffer ? globalThis.Buffer.from(value, 'base64').toString('binary') : null);
  if (!raw) throw new Error('Base64 decoder is unavailable on this device.');
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return globalThis.btoa ? globalThis.btoa(binary) : globalThis.Buffer.from(binary, 'binary').toString('base64');
}

function mimeFor(name = '') {
  const ext = name.toLowerCase().split('.').pop();
  const map = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
    svg: 'image/svg+xml', ico: 'image/x-icon', mp3: 'audio/mpeg', wav: 'audio/wav',
    ogg: 'audio/ogg', mp4: 'video/mp4', webm: 'video/webm', json: 'application/json',
    txt: 'text/plain', css: 'text/css', js: 'text/javascript', html: 'text/html',
  };
  return map[ext] || 'application/octet-stream';
}

function cleanRef(ref = '') {
  return decodeURIComponent(String(ref).split('#')[0].split('?')[0]).replace(/^\.\//, '').replace(/^\//, '');
}

function resolveKey(ref, keys, baseDir = '') {
  const raw = cleanRef(ref);
  if (!raw || /^data:|^https?:/i.test(raw)) return null;
  const candidate = (baseDir + raw).replace(/\\/g, '/');
  const exact = keys.find(key => key === raw || key === candidate);
  if (exact) return exact;
  return keys.find(key => key.endsWith('/' + raw) || key.endsWith('/' + candidate)) || null;
}

function buildBundledHtml(indexKey, files) {
  const indexHtml = strFromU8(files[indexKey]);
  const keys = Object.keys(files);
  const baseDir = indexKey.includes('/') ? indexKey.slice(0, indexKey.lastIndexOf('/') + 1) : '';
  const readText = key => strFromU8(files[key]);

  let html = indexHtml.replace(/<script([^>]+)src=["']([^"']+)["']([^>]*)><\/script>/gi, function(full, before, src, after) {
    const key = resolveKey(src, keys, baseDir);
    if (!key || !/\.m?js$/i.test(key)) return full;
    return '<script' + before + after + '>\n' + readText(key) + '\n<\/script>';
  });

  html = html.replace(/<link([^>]+)href=["']([^"']+\.css(?:\?[^"']*)?)["']([^>]*)>/gi, function(full, before, href, after) {
    const key = resolveKey(href, keys, baseDir);
    if (!key) return full;
    return '<style data-nax-import="' + key + '">\n' + readText(key) + '\n<\/style>';
  });

  const replaceAsset = ref => {
    const key = resolveKey(ref, keys, baseDir);
    if (!key) return ref;
    return 'data:' + mimeFor(key) + ';base64,' + bytesToBase64(files[key]);
  };

  html = html.replace(/(src|href)=["']([^"']+)["']/gi, function(full, attr, ref) {
    if (/^(data:|https?:|mailto:|#|javascript:)/i.test(ref)) return full;
    const key = resolveKey(ref, keys, baseDir);
    if (!key || /\.(?:js|css|html)$/i.test(key)) return full;
    return attr + '="' + replaceAsset(ref) + '"';
  });

  html = html.replace(/url\((['"]?)([^)'"]+)\1\)/gi, function(full, quote, ref) {
    if (/^(data:|https?:|#)/i.test(ref)) return full;
    const key = resolveKey(ref, keys, baseDir);
    return key ? 'url("' + replaceAsset(ref) + '")' : full;
  });

  return html;
}

export default function MiniAppImportScreen({ navigation }) {
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);
  const [lastImported, setLastImported] = useState(null);

  const pick = async () => {
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'text/html', 'text/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets || !result.assets[0]) return;

      const asset = result.assets[0];
      const fileName = asset.name || 'Imported App';
      const baseName = fileName.replace(/\.(zip|html?|txt)$/i, '') || 'Imported App';
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const bytes = base64ToBytes(base64);
      let htmlCode = '';
      let manifest = {};

      if (/\.zip$/i.test(fileName) || asset.mimeType === 'application/zip') {
        const files = unzipSync(bytes);
        const keys = Object.keys(files);
        const indexKey = keys.find(key => /(?:^|\/)index\.html?$/i.test(key));
        if (!indexKey) throw new Error('ZIP must contain an index.html file.');
        const manifestKey = keys.find(key => /(?:^|\/)nax-manifest\.json$/i.test(key));
        if (manifestKey) {
          try { manifest = JSON.parse(strFromU8(files[manifestKey])); } catch (e) {}
        }
        htmlCode = buildBundledHtml(indexKey, files);
      } else {
        htmlCode = strFromU8(bytes);
      }

      if (!htmlCode.trim()) throw new Error('The selected file is empty.');
      if (htmlCode.length > 900000) throw new Error('Keep imported apps under about 900 KB for the local sandbox.');

      const saved = await LocalMiniAppStore.save({
        name: manifest.name || baseName,
        description: manifest.description || 'Imported HTML mini-app',
        category: manifest.category || 'Other',
        color: manifest.color || '#087EFF',
        icon: manifest.icon || 'code-slash',
        maxPlayers: Math.min(16, Math.max(2, Number(manifest.maxPlayers || 4))),
        entryType: 'html',
        htmlCode,
        permissions: Array.isArray(manifest.permissions) ? manifest.permissions : [],
        apiDomains: Array.isArray(manifest.apiDomains) ? manifest.apiDomains.slice(0, 20) : [],
        sourceFile: fileName,
        status: 'draft',
      });

      setLastImported(saved);
      Alert.alert('Imported', saved.name + ' is ready in the Nax sandbox.', [
        { text: 'Test Now', onPress: () => navigation.navigate('MiniAppViewer', {
          title: saved.name, appConfig: saved, entryType: 'html', htmlCode: saved.htmlCode, localAppId: saved.id,
        }) },
        { text: 'My Apps', style: 'cancel', onPress: () => navigation.navigate('MiniAppLibrary') },
      ]);
    } catch (e) {
      Alert.alert('Import failed', e.message || 'Could not import the app.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={25} color={theme.text} /></TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.title, { color: theme.text }]}>Import Nax App</Text>
            <Text style={[styles.sub, { color: theme.sub }]}>Bring HTML/ZIP projects from any AI or editor</Text>
          </View>
        </View>

        <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.icon, { backgroundColor: 'rgba(8,126,255,.12)' }]}>
            <Ionicons name="cloud-upload-outline" size={34} color={theme.blue} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Build anywhere. Run here.</Text>
          <Text style={[styles.heroText, { color: theme.sub }]}>
            Export a small HTML game or tool from GPT, Codex, another AI, or your laptop. Import it, test it privately, then publish it when ready.
          </Text>
          <TouchableOpacity style={[styles.primary, { backgroundColor: theme.blue }]} onPress={pick} disabled={busy}>
            {busy ? <ActivityIndicator color="#FFF" /> : <>
              <Ionicons name="document-attach-outline" size={20} color="#FFF" />
              <Text style={styles.primaryText}>Choose HTML / ZIP</Text>
            </>}
          </TouchableOpacity>
          <Text style={[styles.hint, { color: theme.sub }]}>ZIP should contain index.html. Small local projects work best.</Text>
        </View>

        {lastImported ? (
          <TouchableOpacity
            style={[styles.last, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => navigation.navigate('MiniAppViewer', {
              title: lastImported.name, appConfig: lastImported, entryType: 'html', htmlCode: lastImported.htmlCode, localAppId: lastImported.id,
            })}
          >
            <Ionicons name="play-circle" size={25} color={theme.blue} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.lastTitle, { color: theme.text }]}>{lastImported.name}</Text>
              <Text style={[styles.lastSub, { color: theme.sub }]}>Imported draft • Tap to test</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.sub} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity onPress={() => navigation.navigate('MiniAppLibrary')} style={styles.libraryLink}>
          <Ionicons name="folder-open-outline" size={20} color={theme.blue} />
          <Text style={{ color: theme.blue, fontWeight: '800', marginLeft: 8 }}>Open My Local Apps</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 21, fontWeight: '900' },
  sub: { fontSize: 12, marginTop: 3 },
  hero: { borderWidth: 1, borderRadius: 24, padding: 20 },
  icon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  heroText: { fontSize: 14, lineHeight: 21 },
  primary: { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  primaryText: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  hint: { fontSize: 11, marginTop: 10, textAlign: 'center' },
  last: { marginTop: 16, borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center' },
  lastTitle: { fontSize: 15, fontWeight: '900' },
  lastSub: { fontSize: 11, marginTop: 3 },
  libraryLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 22, padding: 12 },
});
