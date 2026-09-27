import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import AIService from '../ai/AIService';
import NaxAppStoreAPI from './NaxAppStoreAPI';

const PROJECTS_KEY = 'nax.ai-app-builder.projects.v2';
const CURRENT_KEY = 'nax.ai-app-builder.current.v2';
const WORKSPACE_CHAT_KEY = 'nax.ai-app-builder.workspace-chat.v1';
const ROOT_DIR = `${FileSystem.documentDirectory || ''}hyperdrop-apps/`;
const MAX_VERSIONS = 8;
const MAX_SINGLE_HTML_BYTES = 4 * 1024 * 1024;

const safeSlug = value => String(value || 'app').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'app';
const safePath = value => String(value || '').replace(/\\/g, '/').replace(/^\/+/, '').split('/').filter(part => part && part !== '.' && part !== '..').join('/');
const textBytes = value => String(value || '').length * 2;

const DEFAULT_HTML = name => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#111827">
<title>${String(name || 'My App').replace(/[<>]/g, '')}</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f5f7fb;color:#111827}
.app{max-width:760px;margin:auto;padding:28px 18px}.card{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:22px;box-shadow:0 8px 30px rgba(0,0,0,.06)}
button{border:0;border-radius:12px;padding:12px 16px;font-weight:800;background:#2563eb;color:#fff}
</style>
</head>
<body><main class="app"><section class="card"><h1>${String(name || 'My App').replace(/[<>]/g, '')}</h1><p>Your app is ready. Tell the AI what to build next.</p><button id="start">Start</button></section></main>
<script>
const state={started:false};
document.getElementById('start')?.addEventListener('click',()=>{state.started=true;document.getElementById('start').textContent='Ready ✓'});
window.HYPERDROP_APP={version:1,name:${JSON.stringify(name || 'My App')}};
</script>
</body></html>`;

function memoryObject(project) {
  return {
    version: 1,
    name: project.name,
    target: project.target,
    summary: 'App managed by the Hyperdrop AI App Builder.',
    decisions: ['Prefer the smallest viable build target.', 'Keep Single HTML apps self-contained.', 'Never embed API keys or secrets in generated source.'],
    features: [],
    pending: [],
    importantFiles: project.target === 'SINGLE_HTML' ? ['index.html'] : ['README.md', 'MEMORY.md'],
    history: [],
  };
}

function memoryMarkdown(memory = {}) {
  const list = value => Array.isArray(value) && value.length ? value.map(item => '- ' + String(item)).join('\n') : '- None';
  const history = Array.isArray(memory.history) && memory.history.length
    ? memory.history.map(item => '- v' + item.version + ': ' + item.action).join('\n')
    : '- None';
  return [
    '# App Memory',
    '',
    '## Project',
    '- Name: ' + (memory.name || 'Untitled App'),
    '- Target: ' + (memory.target || 'SINGLE_HTML'),
    '- Summary: ' + (memory.summary || ''),
    '',
    '## Features',
    list(memory.features),
    '',
    '## Pending',
    list(memory.pending),
    '',
    '## Decisions',
    list(memory.decisions),
    '',
    '## Important Files',
    list(memory.importantFiles),
    '',
    '## Change History',
    history,
    '',
  ].join('\n');
}

function classifyRequest(text) {
  const value = String(text || '').toLowerCase();
  const nativeSignals = [
    'bluetooth','ble','background service','native module','android service','foreground service',
    'usb','serial port','nfc','accessibility service','vpn service','custom c++','c++',
    'ndk','jni','system overlay','device admin','root access','native android','widget provider',
    'home screen widget','lock screen','call screening','default dialer','sms receiver',
  ];
  const heavySignals = [
    'multi module native','native plugin','custom native library','kernel','3d engine native',
    'android sdk integration','custom gradle plugin'
  ];
  const advanced = nativeSignals.some(signal => value.includes(signal)) || heavySignals.some(signal => value.includes(signal));
  return {
    target: advanced ? 'ADVANCED_PROJECT' : 'SINGLE_HTML',
    reason: advanced
      ? 'The request likely needs native/platform capabilities that a single HTML file cannot reliably provide.'
      : 'The request can normally be built as a self-contained HTML/CSS/JavaScript app.',
  };
}

function extractJson(text) {
  const raw = String(text || '').trim().replace(/^\`\`\`(?:json)?/i, '').replace(/\`\`\`$/,'').trim();
  try { return JSON.parse(raw); } catch (_) {}

  const start = raw.indexOf('{');
  if (start < 0) throw new Error('AI did not return builder JSON.');
  const candidate = raw.slice(start);

  const repaired = repairTruncatedJson(candidate);
  if (repaired) {
    try { return JSON.parse(repaired); } catch (_) {}
  }

  const match = candidate.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_) {}
  }
  throw new Error('AI response was cut off before the builder JSON was complete. Try again; the current app was not changed.');
}

function repairTruncatedJson(source) {
  let inString = false;
  let escaped = false;
  const stack = [];
  let out = '';

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    out += ch;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }

  if (!inString && stack.length) {
    while (stack.length) {
      const open = stack.pop();
      out += open === '{' ? '}' : ']';
    }
    return out;
  }

  if (inString) {
    if (escaped) out += '\\';
    out += '"';
    while (stack.length) {
      const open = stack.pop();
      out += open === '{' ? '}' : ']';
    }
    return out;
  }
  return null;
}

function embedMemory(html, memory) {
  const source = String(html || '');
  const payload = JSON.stringify({
    version: memory?.version || 1,
    name: memory?.name || 'Untitled App',
    target: memory?.target || 'SINGLE_HTML',
    features: Array.isArray(memory?.features) ? memory.features.slice(0, 50) : [],
    pending: Array.isArray(memory?.pending) ? memory.pending.slice(0, 50) : [],
  }).replace(/<\/script/gi, '<\\/script');
  const tag = '<script type="application/json" id="hyperdrop-memory">' + payload + '</script>';
  const stripped = source.replace(/<script[^>]+id=["']hyperdrop-memory["'][^>]*>[\s\S]*?<\/script>/gi, '');
  return /<\/head>/i.test(stripped)
    ? stripped.replace(/<\/head>/i, tag + '</head>')
    : tag + stripped;
}

function validateSingleHtml(html) {
  const source = String(html || '').trim();
  if (!source || !/<html[\s>]/i.test(source) || !/<body[\s>]/i.test(source)) {
    throw new Error('AI returned an incomplete HTML document.');
  }
  if (textBytes(source) > MAX_SINGLE_HTML_BYTES) {
    throw new Error('Generated single-file app is larger than 4 MB. Ask the AI to make it smaller.');
  }
  if (/<script[^>]+src\s*=|<link[^>]+rel=["']stylesheet["'][^>]+href\s*=/i.test(source)) {
    throw new Error('Single HTML apps must keep JavaScript and CSS self-contained.');
  }
  return source;
}

async function ensureDir(path) {
  try { await FileSystem.makeDirectoryAsync(path, { intermediates: true }); } catch (_) {}
}

async function projectRoot(id) {
  await ensureDir(ROOT_DIR);
  const root = ROOT_DIR + safeSlug(id) + '/';
  await ensureDir(root);
  return root;
}

async function writeTextFile(root, relativePath, content) {
  const rel = safePath(relativePath);
  if (!rel) throw new Error('Invalid project file path.');
  const full = root + rel;
  const parts = full.split('/');
  parts.pop();
  await ensureDir(parts.join('/') + '/');
  await FileSystem.writeAsStringAsync(full, String(content ?? ''), { encoding: FileSystem.EncodingType.UTF8 });
}

async function readTextFile(root, relativePath) {
  return FileSystem.readAsStringAsync(root + safePath(relativePath), { encoding: FileSystem.EncodingType.UTF8 });
}

async function deleteTextFile(root, relativePath) {
  await FileSystem.deleteAsync(root + safePath(relativePath), { idempotent: true });
}

function validateProjectFiles(files = {}, target = 'ADVANCED_PROJECT') {
  const entries = Object.entries(files || {});
  if (entries.length > 200) throw new Error('Project contains too many files.');
  let total = 0;
  for (const [path, content] of entries) {
    const rel = safePath(path);
    if (!rel) throw new Error('Invalid project file path.');
    const value = String(content ?? '');
    const size = textBytes(value);
    if (size > (target === 'SINGLE_HTML' ? MAX_SINGLE_HTML_BYTES : 2 * 1024 * 1024)) {
      throw new Error('Project file is too large: ' + rel);
    }
    total += size;
    if (total > 12 * 1024 * 1024) throw new Error('Project source is larger than 12 MB.');
    if (/(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|xox[baprs]-[0-9A-Za-z-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(value)) {
      throw new Error('Generated source appears to contain a secret. Remove it and use a secure integration instead.');
    }
  }
  return Object.fromEntries(entries.map(([path, content]) => [safePath(path), String(content ?? '')]));
}

async function writeProjectFiles(root, files) {
  for (const [path, content] of Object.entries(files || {})) await writeTextFile(root, path, content);
}

async function readProjectFiles(root, paths) {
  const output = {};
  for (const path of paths || []) {
    try { output[path] = await readTextFile(root, path); } catch (_) {}
  }
  return output;
}

async function readMetadata() {
  try { return JSON.parse(await AsyncStorage.getItem(PROJECTS_KEY) || '[]'); } catch (_) { return []; }
}

async function writeMetadata(items) {
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(items));
}

async function saveMetadata(meta) {
  const items = await readMetadata();
  const next = { ...meta, html: undefined };
  delete next.html;
  const index = items.findIndex(item => item.id === meta.id);
  if (index >= 0) items[index] = next; else items.unshift(next);
  await writeMetadata(items);
  await AsyncStorage.setItem(CURRENT_KEY, meta.id);
}

async function snapshot(project) {
  const root = await projectRoot(project.id);
  const version = project.versions?.[project.versions.length - 1]?.version || 1;
  const snapRoot = root + '.versions/v' + version + '/';
  await ensureDir(snapRoot);
  await writeProjectFiles(snapRoot, project.files || {});
  return { ...project, rootPath: root };
}

async function trimSnapshots(project) {
  const versions = project.versions || [];
  if (versions.length <= MAX_VERSIONS) return;
  const root = await projectRoot(project.id);
  const stale = versions.slice(0, versions.length - MAX_VERSIONS);
  for (const item of stale) await FileSystem.deleteAsync(root + '.versions/v' + item.version, { idempotent: true });
}

function advancedSeed(name) {
  const safeName = String(name || 'Advanced App').replace(/[<>]/g, '');
  return {
    'README.md': `# ${safeName}\n\nGenerated by Hyperdrop AI App Builder.\n\nBuild target: Advanced Project.\n`,
    'MEMORY.md': '',
    'src/index.html': `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeName}</title><link rel="stylesheet" href="./styles.css"></head><body><main id="app"><h1>${safeName}</h1><p>Ask the AI builder to implement this project.</p></main><script src="./main.js"></script></body></html>`,
    'src/styles.css': 'body{font-family:system-ui;margin:0;padding:24px;background:#f5f7fb;color:#111827}.app{max-width:760px;margin:auto}',
    'src/main.js': 'document.getElementById("app").classList.add("app");',
  };
}

function androidWrapper(project) {
  const packageName = 'com.hyperdrop.generated.' + safeSlug(project.id).replace(/-/g, '').slice(0, 18);
  const html = project.html || project.files?.['index.html'] || project.files?.['src/index.html'] || DEFAULT_HTML(project.name);
  return {
    'android/settings.gradle': `pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name = "HyperdropApp"
include(":app")
`,
    'android/build.gradle': `plugins {
    id "com.android.application" version "8.5.2" apply false
}
`,
    'android/gradle.properties': 'org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\n',
    'android/app/build.gradle': `plugins { id "com.android.application" }

android {
    namespace "${packageName}"
    compileSdk 35
    defaultConfig {
        applicationId "${packageName}"
        minSdk 24
        targetSdk 35
        versionCode 1
        versionName "1.0"
    }
}

dependencies {
}
`,
    'android/app/src/main/AndroidManifest.xml': `<manifest xmlns:android="http://schemas.android.com/apk/res/android"><uses-permission android:name="android.permission.INTERNET"/><application android:theme="@style/AppTheme" android:label="${String(project.name || 'Hyperdrop App').replace(/[<&\"]/g,'')}"><activity android:name=".MainActivity" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity></application></manifest>`,
    'android/app/src/main/res/values/styles.xml': '<resources><style name="AppTheme" parent="android:style/Theme.Material.Light.NoActionBar"><item name="android:fontFamily">sans</item><item name="android:colorAccent">#2563EB</item></style></resources>',
    ['android/app/src/main/java/' + packageName.replace(/\\./g, '/') + '/MainActivity.java']: `package ${packageName};

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/index.html");
        setContentView(webView);
    }
}
`,
    'android/app/src/main/assets/index.html': html,
    '.github/workflows/build-apk.yml': `name: Build Android APK
on:
  workflow_dispatch:
  push:
    paths:
      - "android/**"

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: android
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"
      - uses: android-actions/setup-android@v3
      - name: Install Android SDK
        run: sdkmanager "platforms;android-35" "build-tools;35.0.0"
      - name: Install Gradle
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: "8.7"
      - name: Build debug APK
        run: gradle :app:assembleDebug
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: hyperdrop-app-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
`,
  };
}

const AIAppBuilderService = {
  classifyRequest,

  async listProjects() {
    return (await readMetadata()).map(item => ({ ...item, html: undefined }));
  },

  async getProject(id) {
    const meta = (await readMetadata()).find(item => item.id === id);
    if (!meta) return null;
    const root = await projectRoot(meta.id);
    const files = await readProjectFiles(root, meta.filePaths || []);
    return { ...meta, rootPath: root, files, html: files['index.html'] || files['src/index.html'] || '' };
  },

  async createProject({ name = 'Untitled App', request = '', target, html } = {}) {
    const route = target || classifyRequest(request).target;
    const now = Date.now();
    const id = 'app_' + now + '_' + Math.random().toString(36).slice(2, 8);
    const project = {
      id, name, target: route, filePaths: [],
      memory: null, versions: [], redo: [], chat: [], createdAt: now, updatedAt: now,
    };
    project.memory = memoryObject(project);
    project.memory.history.push({ version: 1, action: 'created', at: now });
    const files = route === 'SINGLE_HTML'
      ? { 'index.html': embedMemory(validateSingleHtml(html || DEFAULT_HTML(name)), project.memory), 'MEMORY.md': memoryMarkdown(project.memory) }
      : { ...advancedSeed(name), 'MEMORY.md': memoryMarkdown(project.memory) };
    project.filePaths = Object.keys(files);
    project.files = validateProjectFiles(files, route);
    project.versions = [{ version: 1, action: 'created', at: now, memory: project.memory, filePaths: project.filePaths }];
    const root = await projectRoot(id);
    await writeProjectFiles(root, files);
    await snapshot(project);
    delete project.files;
    await saveMetadata(project);
    return this.getProject(id);
  },

  async saveProject(project, { action = 'save', createVersion = false } = {}) {
    const root = await projectRoot(project.id);
    let files = validateProjectFiles(project.files || {}, project.target);
    const memory = { ...(project.memory || {}), importantFiles: project.target === 'SINGLE_HTML' ? ['index.html'] : (project.filePaths || []) };
    if (project.target === 'SINGLE_HTML' && files['index.html']) {
      files['index.html'] = embedMemory(validateSingleHtml(files['index.html']), memory);
      files = validateProjectFiles(files, project.target);
    }
    await writeProjectFiles(root, files);
    const next = { ...project, filePaths: Object.keys(files), memory, updatedAt: Date.now() };
    delete next.html;
    delete next.files;
    if (createVersion) {
      next.redo = [];
      const version = (next.versions?.[next.versions.length - 1]?.version || 0) + 1;
      next.versions = [...(next.versions || []), { version, action, at: Date.now(), memory, filePaths: Object.keys(files) }];
      const snapshotProject = { ...next, files };
      await snapshot(snapshotProject);
      await trimSnapshots(snapshotProject);
    }
    await saveMetadata(next);
    return this.getProject(next.id);
  },

  async updateFile(project, path, content, { createVersion = true, action = 'manual file edit' } = {}) {
    const rel = safePath(path);
    if (!rel) throw new Error('Invalid file path.');
    if (project.target === 'SINGLE_HTML' && rel === 'index.html') content = validateSingleHtml(content);
    const files = validateProjectFiles({ ...(project.files || {}), [rel]: String(content ?? '') }, project.target);
    const next = { ...project, files, filePaths: Object.keys(files) };
    return this.saveProject(next, { action, createVersion });
  },

  async deleteFile(project, path) {
    if (project.target === 'SINGLE_HTML' && safePath(path) === 'index.html') throw new Error('Single HTML apps must keep index.html.');
    const rel = safePath(path);
    const files = { ...(project.files || {}) };
    delete files[rel];
    await deleteTextFile(await projectRoot(project.id), rel);
    return this.saveProject({ ...project, files, filePaths: Object.keys(files) }, { action: 'deleted ' + rel, createVersion: true });
  },

  async buildWithAI({ project, request, connectionId, model, chat = [] }) {
    const route = classifyRequest(request);
    const currentFiles = project?.files || {};
    const nativeRoute = route.target === 'ADVANCED_PROJECT' && /(bluetooth|ble|background service|native|android|apk|aab|gradle|kotlin|c\\+\\+|jni|ndk|usb|nfc|vpn|widget|accessibility|device admin)/i.test(request);
    const systemPrompt = `You are Hyperdrop's AI App Builder. You build real software, not explanations.
Return ONLY valid JSON.

MODES:
- CHAT: use for greetings, planning, discussion, questions, brainstorming, or when the user has NOT actually asked you to create/change/test/fix the app.
- TEST: use when the user asks to test/check/verify the current app without requesting a code change yet.
- BUILD: use when the user explicitly asks to create, change, add, remove, improve, debug, or fix the app/code.
For TEST return:
{"mode":"TEST","reply":"...","status":"verified|partial|blocked","tests":[{"name":"...","result":"pass|fail|unknown","detail":"..."}],"failures":["..."],"nextSteps":["..."],"suggestedReplies":["..."]}
Do not change files in TEST mode. Inspect the existing project carefully and never claim a test passed merely because the code looks plausible.
For CHAT return:
{"mode":"CHAT","reply":"...","progress":"...","remaining":["..."],"nextSteps":["..."],"suggestedReplies":["..."]}
Do NOT generate HTML, rename the project, or modify files in CHAT mode.
For BUILD, follow the rules below.

DECISION:
Use SINGLE_HTML when the feature can reliably run as one self-contained HTML file with inline CSS/JavaScript and browser APIs.
Use ADVANCED_PROJECT when native Android/platform APIs, native modules, multi-file architecture, C/C++/JNI, background services, or other capabilities make one HTML file unreliable.
Current automatic route: ${route.target}.

For SINGLE_HTML BUILD return:
{"mode":"BUILD","target":"SINGLE_HTML","name":"...","summary":"...","status":"working|partial|blocked","progress":"...","remaining":["..."],"nextSteps":["..."],"suggestedReplies":["..."],"html":"<!doctype html>...","memory":{"features":[],"pending":[],"decisions":[]}}
Requirements: complete working app; inline CSS and JavaScript; no external script/CSS dependencies; responsive; accessible; functional; keep it compact.

For ADVANCED_PROJECT BUILD return:
{"mode":"BUILD","target":"ADVANCED_PROJECT","name":"...","summary":"...","status":"working|partial|blocked","progress":"...","remaining":["..."],"nextSteps":["..."],"suggestedReplies":["..."],"files":{"README.md":"...","MEMORY.md":"...","src/...":"..."},"memory":{"features":[],"pending":[],"decisions":[]}}
Create a coherent source project and preserve existing files unless the request changes them.
When the automatic route requires native Android capabilities (current native route: ${nativeRoute}), prefer a real Android project under android/ with settings.gradle, build.gradle, app/build.gradle, AndroidManifest.xml, source code and resources rather than pretending HTML alone provides the native feature.
Conversation behavior: act like a real coding agent. Do the requested work directly. Never call an app complete unless you have strong evidence from the supplied code/context. For a newly generated app, prefer status "partial" unless all requested behavior is clearly implemented. After every build, report what is working, what remains, and the best next action. If the user says fix, not working, error, broken, or similar, inspect the existing project and modify the code to fix it instead of only explaining. suggestedReplies must be short actionable messages the user can tap and send. Never ask the user to manually edit code when you can edit it yourself.\nNever include API keys/secrets.
`;
    const result = await AIService.generateText({
      connectionId, model, systemPrompt,
      messages: [{
        role: 'user',
        content: [
          'Project: ' + (project?.name || 'new app'),
          'Target: ' + (project?.target || route.target),
          'Existing files:',
          JSON.stringify(currentFiles),
          'Project memory:',
          JSON.stringify(project?.memory || {}),
          'Recent builder conversation:',
          JSON.stringify((Array.isArray(chat) ? chat : []).slice(-12)),
          'User request:',
          request,
        ].join('\n\n'),
      }],
      temperature: 0.12,
      maxTokens: 24000,
    });
    return extractJson(result);
  },

  async applyBuild(project, draft, request, chatMessages = []) {
    if (draft?.mode === 'CHAT') return project;
    const route = classifyRequest(request);
    const target = route.target === 'ADVANCED_PROJECT' ? 'ADVANCED_PROJECT' : (draft.target === 'ADVANCED_PROJECT' ? 'ADVANCED_PROJECT' : 'SINGLE_HTML');
    const now = Date.now();
    let files;
    if (target === 'SINGLE_HTML') {
      const html = validateSingleHtml(draft.html || project.html || DEFAULT_HTML(project.name));
      files = { ...(project.files || {}), 'index.html': html };
    } else {
      const seed = project.target === 'SINGLE_HTML' ? advancedSeed(project.name) : {};
      files = { ...seed, ...(project.files || {}), ...(draft.files || {}) };
      if (!files['src/index.html'] && files['index.html']) files['src/index.html'] = files['index.html'];
    }
    const nextVersion = (project.versions?.[project.versions.length - 1]?.version || 0) + 1;
    const memory = {
      ...(project.memory || memoryObject(project)),
      ...(draft.memory || {}),
      version: nextVersion,
      name: draft.name || project.name,
      target,
      history: [...(project.memory?.history || []), { version: nextVersion, action: request || draft.summary || 'AI update', at: now }].slice(-40),
    };
    files['MEMORY.md'] = memoryMarkdown(memory);
    const next = {
      ...project,
      name: draft.name || project.name,
      status: draft.status || 'done',
      progress: draft.progress || draft.summary || 'Build updated.',
      remaining: Array.isArray(draft.remaining) ? draft.remaining.slice(0, 8) : [],
      nextSteps: Array.isArray(draft.nextSteps) ? draft.nextSteps.slice(0, 8) : [],
      suggestedReplies: Array.isArray(draft.suggestedReplies) ? draft.suggestedReplies.slice(0, 6) : [],
      target,
      files,
      filePaths: Object.keys(files),
      memory,
      chat: [...(project.chat || []), ...(Array.isArray(chatMessages) ? chatMessages : []), { role: 'assistant', content: draft.summary || draft.progress || 'Build updated.' }].slice(-30),
      updatedAt: now,
      versions: [...(project.versions || []), { version: nextVersion, action: request || draft.summary || 'AI update', at: now, memory, filePaths: Object.keys(files) }],
      redo: [],
    };
    const saved = await this.saveProject(next, { action: request || draft.summary || 'AI update', createVersion: false });
    await snapshot({ ...saved, files: saved.files });
    await trimSnapshots(saved);
    await saveMetadata(saved);
    return saved;
  },

  async undo(project) {
    if (!project?.versions || project.versions.length < 2) return project;
    const versions = project.versions.slice(0, -1);
    const previous = versions[versions.length - 1];
    const root = await projectRoot(project.id);
    const files = await readProjectFiles(root + '.versions/v' + previous.version + '/', previous.filePaths || project.filePaths || []);
    if (!Object.keys(files).length) throw new Error('Previous version snapshot is unavailable.');
    const currentPaths = project.filePaths || [];
    for (const path of currentPaths) {
      if (!Object.prototype.hasOwnProperty.call(files, path)) await deleteTextFile(root, path);
    }
    await writeProjectFiles(root, files);
    const removed = project.versions[project.versions.length - 1];
    const next = { ...project, files, filePaths: Object.keys(files), versions, redo: [...(project.redo || []), removed], memory: previous.memory || project.memory };
    return this.saveProject(next, { action: 'undo to v' + previous.version, createVersion: false });
  },

  async redo(project) {
    const stack = project?.redo || [];
    if (!stack.length) return project;
    const entry = stack[stack.length - 1];
    const root = await projectRoot(project.id);
    const files = await readProjectFiles(root + '.versions/v' + entry.version + '/', entry.filePaths || []);
    if (!Object.keys(files).length) throw new Error('Redo snapshot is unavailable.');
    const currentPaths = project.filePaths || [];
    for (const path of currentPaths) {
      if (!Object.prototype.hasOwnProperty.call(files, path)) await deleteTextFile(root, path);
    }
    await writeProjectFiles(root, files);
    const next = {
      ...project,
      files,
      filePaths: Object.keys(files),
      versions: [...(project.versions || []), entry],
      redo: stack.slice(0, -1),
      memory: entry.memory || project.memory,
    };
    return this.saveProject(next, { action: 'redo to v' + entry.version, createVersion: false });
  },

  async restoreVersion(project, version) {
    const index = (project?.versions || []).findIndex(item => item.version === version);
    if (index < 0) throw new Error('Version not found.');
    const entry = project.versions[index];
    const root = await projectRoot(project.id);
    const files = await readProjectFiles(root + '.versions/v' + entry.version + '/', entry.filePaths || []);
    if (!Object.keys(files).length) throw new Error('Version snapshot is unavailable.');
    for (const path of project.filePaths || []) {
      if (!Object.prototype.hasOwnProperty.call(files, path)) await deleteTextFile(root, path);
    }
    await writeProjectFiles(root, files);
    const future = (project.versions || []).slice(index + 1);
    const next = {
      ...project,
      files,
      filePaths: Object.keys(files),
      versions: (project.versions || []).slice(0, index + 1),
      redo: [...future, ...(project.redo || [])],
      memory: entry.memory || project.memory,
    };
    return this.saveProject(next, { action: 'restored v' + version, createVersion: false });
  },

  async prepareAndroidPackage(project) {
    const existing = project?.files || {};
    const hasAndroidProject = Object.keys(existing).some(path => path === 'android/settings.gradle' || path === 'android/build.gradle' || path === 'android/app/build.gradle');
    if (hasAndroidProject && existing['.github/workflows/build-apk.yml']) {
      return project;
    }
    const wrapper = hasAndroidProject ? { ...existing } : { ...existing, ...androidWrapper(project) };
    if (hasAndroidProject && !wrapper['.github/workflows/build-apk.yml']) {
      const html = project.html || existing['index.html'] || existing['src/index.html'] || DEFAULT_HTML(project.name);
      wrapper['android/app/src/main/assets/index.html'] = wrapper['android/app/src/main/assets/index.html'] || html;
      wrapper['.github/workflows/build-apk.yml'] = `name: Build Android APK
on:
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: android
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"
      - uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: "8.7"
      - name: Build debug APK
        run: gradle :app:assembleDebug
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: hyperdrop-app-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
`;
    }
    const next = { ...project, files: wrapper, filePaths: Object.keys(wrapper) };
    return this.saveProject(next, { action: 'prepared Android APK project', createVersion: true });
  },

  async importProject(input = {}) {
    const source = input?.project || input;
    if (!source || typeof source !== 'object') throw new Error('Invalid Nax project file.');
    const files = source.files && typeof source.files === 'object' ? source.files : {};
    const html = String(source.html || files['index.html'] || '').trim();
    if (!html && !Object.keys(files).length) throw new Error('Imported project has no files.');
    const target = source.target === 'ADVANCED_PROJECT' ? 'ADVANCED_PROJECT' : 'SINGLE_HTML';
    const project = {
      id: source.id || null,
      name: String(source.name || 'Imported Nax App').slice(0, 80),
      target,
      html: target === 'SINGLE_HTML' ? html : undefined,
      files: target === 'SINGLE_HTML'
        ? { 'index.html': html, 'MEMORY.md': source.memoryMarkdown || memoryMarkdown(source.memory || MEMORY_TEMPLATE({ name: source.name || 'Imported Nax App', target })) }
        : { ...files, 'MEMORY.md': files['MEMORY.md'] || memoryMarkdown(source.memory || MEMORY_TEMPLATE({ name: source.name || 'Imported Nax App', target })) },
      memory: source.memory || MEMORY_TEMPLATE({ name: source.name || 'Imported Nax App', target }),
      versions: [],
      chat: [],
      version: Number(source.version || 1),
      status: 'imported',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return this.saveProject(project, { action: 'imported custom project', createVersion: true });
  },

  async exportProject(project) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportRoot = (FileSystem.documentDirectory || '') + 'HyperdropExports/' + safeSlug(project.name) + '-' + stamp + '/';
    await ensureDir(exportRoot);
    const files = project.files || {};
    for (const [path, content] of Object.entries(files)) await writeTextFile(exportRoot, path, content);
    return exportRoot;
  },

  async publishToNaxStore(project, options = {}) {
    if (!project) throw new Error('No app selected.');
    const published = await NaxAppStoreAPI.publish(project, { ...options, id: options.id || project.naxStoreId });
    const next = { ...project, naxStoreId: published.id, naxStoreStatus: 'published', naxStoreVersion: published.version, updatedAt: Date.now() };
    return project.id ? this.saveProject(next, { action: 'published to Nax Store', createVersion: false }) : next;
  },

  async saveChat(project, messages) {
    const normalized = (Array.isArray(messages) ? messages : []).slice(-80).map(item => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: String(item.content || ''),
      at: item.at || Date.now(),
      mode: item.mode || undefined,
    }));
    if (project?.id) {
      const next = { ...project, chat: normalized, updatedAt: Date.now() };
      return this.saveProject(next, { action: 'chat updated', createVersion: false });
    }
    await AsyncStorage.setItem(WORKSPACE_CHAT_KEY, JSON.stringify(normalized));
    return normalized;
  },

  async getWorkspaceChat() {
    try {
      const raw = await AsyncStorage.getItem(WORKSPACE_CHAT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  },

  async clearWorkspaceChat() {
    await AsyncStorage.removeItem(WORKSPACE_CHAT_KEY);
  },

  async getCurrent() {
    const id = await AsyncStorage.getItem(CURRENT_KEY);
    return id ? this.getProject(id) : null;
  },

  async setCurrent(id) {
    if (id) await AsyncStorage.setItem(CURRENT_KEY, id);
  },

  async removeProject(id) {
    const root = await projectRoot(id);
    await FileSystem.deleteAsync(root, { idempotent: true });
    const items = (await readMetadata()).filter(item => item.id !== id);
    await writeMetadata(items);
    const current = await AsyncStorage.getItem(CURRENT_KEY);
    if (current === id) await AsyncStorage.removeItem(CURRENT_KEY);
  },
};

export default AIAppBuilderService;
export { AIAppBuilderService };
