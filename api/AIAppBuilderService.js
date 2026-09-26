import AsyncStorage from '@react-native-async-storage/async-storage';
import AIService from '../ai/AIService';

const PROJECTS_KEY = 'nax.ai-app-builder.projects.v1';
const CURRENT_KEY = 'nax.ai-app-builder.current.v1';

const DEFAULT_HTML = (name = 'My App') => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#111827">
<title>${name}</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f5f7fb;color:#111827}
.app{max-width:760px;margin:auto;padding:28px 18px}.card{background:white;border:1px solid #e5e7eb;border-radius:20px;padding:22px;box-shadow:0 8px 30px rgba(0,0,0,.06)}
button{border:0;border-radius:12px;padding:12px 16px;font-weight:800;background:#2563eb;color:#fff}
</style>
</head>
<body><main class="app"><section class="card"><h1>${name}</h1><p>Your app is ready. Ask the AI builder to change it.</p></section></main>
<script>
window.HYPERDROP_APP={version:1,name:${JSON.stringify(name)}};
</script>
</body></html>`;

const MEMORY_TEMPLATE = (project) => ({
  version: 1,
  name: project.name,
  target: project.target,
  summary: 'Single-file HTML app managed by the Hyperdrop AI App Builder.',
  decisions: ['Prefer the smallest viable build target.', 'Keep the app self-contained when possible.'],
  features: [],
  pending: [],
  importantFiles: ['index.html'],
  history: [],
});

async function readProjects() {
  try { return JSON.parse(await AsyncStorage.getItem(PROJECTS_KEY) || '[]'); } catch (_) { return []; }
}
async function writeProjects(projects) { await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)); }

function classifyRequest(text) {
  const value = String(text || '').toLowerCase();
  const nativeSignals = [
    'bluetooth','ble','background service','native module','android service','foreground service',
    'camera in background','usb','serial port','nfc','accessibility service','vpn service',
    'custom c++','c++','ndk','jni','system overlay','device admin','root access','native android'
  ];
  const advanced = nativeSignals.some(signal => value.includes(signal));
  return {
    target: advanced ? 'ADVANCED_PROJECT' : 'SINGLE_HTML',
    reason: advanced
      ? 'The request appears to need native/platform capabilities that a single HTML file cannot reliably provide.'
      : 'The requested app can normally be built as a self-contained HTML/CSS/JavaScript app.',
  };
}

function extractJson(text) {
  const raw = String(text || '').trim().replace(/^\`\`\`(?:json)?/i, '').replace(/\`\`\`$/,'').trim();
  try { return JSON.parse(raw); } catch (_) {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI did not return valid builder JSON.');
  return JSON.parse(match[0]);
}

const AIAppBuilderService = {
  classifyRequest,
  async listProjects() { return readProjects(); },
  async getProject(id) {
    const projects = await readProjects();
    return projects.find(item => item.id === id) || null;
  },
  async createProject({ name = 'Untitled App', request = '', target } = {}) {
    const route = target || classifyRequest(request).target;
    const now = Date.now();
    const project = {
      id: 'app_' + now + '_' + Math.random().toString(36).slice(2, 8),
      name,
      target: route,
      html: route === 'SINGLE_HTML' ? DEFAULT_HTML(name) : '',
      files: route === 'ADVANCED_PROJECT' ? { 'MEMORY.md': '' } : { 'index.html': DEFAULT_HTML(name) },
      memory: null,
      versions: [],
      createdAt: now,
      updatedAt: now,
    };
    project.memory = MEMORY_TEMPLATE(project);
    project.memory.history.push({ version: 1, action: 'created', at: now });
    project.versions.push({ version: 1, html: project.html, files: project.files, memory: project.memory, at: now });
    const projects = await readProjects();
    projects.unshift(project);
    await writeProjects(projects);
    await AsyncStorage.setItem(CURRENT_KEY, project.id);
    return project;
  },
  async saveProject(project) {
    const projects = await readProjects();
    const next = { ...project, updatedAt: Date.now() };
    const index = projects.findIndex(item => item.id === next.id);
    if (index >= 0) projects[index] = next; else projects.unshift(next);
    await writeProjects(projects);
    await AsyncStorage.setItem(CURRENT_KEY, next.id);
    return next;
  },
  async applySingleHtml(project, html, summary = 'Updated app') {
    const nextVersion = (project.versions?.length || 0) + 1;
    const next = {
      ...project,
      html: String(html || project.html),
      files: { ...(project.files || {}), 'index.html': String(html || project.html) },
      memory: {
        ...(project.memory || MEMORY_TEMPLATE(project)),
        history: [...(project.memory?.history || []), { version: nextVersion, action: summary, at: Date.now() }].slice(-30),
      },
      versions: [...(project.versions || []), { version: nextVersion, html: String(html || project.html), files: { ...(project.files || {}), 'index.html': String(html || project.html) }, memory: project.memory, at: Date.now() }].slice(-20),
    };
    return this.saveProject(next);
  },
  async buildWithAI({ project, request, connectionId, model }) {
    const route = classifyRequest(request);
    const systemPrompt = `You are Hyperdrop's AI App Builder. Build real applications, not explanations.
Return ONLY valid JSON.
For SINGLE_HTML, return:
{"target":"SINGLE_HTML","name":"...","summary":"...","html":"<!doctype html>...","memory":{"features":[],"pending":[],"decisions":[]}}
The HTML must be completely self-contained: inline CSS and JavaScript, no external scripts, no external dependencies, responsive, functional and safe.
For ADVANCED_PROJECT, return:
{"target":"ADVANCED_PROJECT","name":"...","summary":"...","files":{"MEMORY.md":"...","README.md":"...","src/index.js":"..."},"memory":{"features":[],"pending":[],"decisions":[]}}
Do not include secrets or API keys. Prefer the simplest target that fully satisfies the request. Current heuristic route is ${route.target}: ${route.reason}.`;
    const result = await AIService.generateText({
      connectionId, model,
      systemPrompt,
      messages: [{ role: 'user', content: `Existing project: ${project?.name || 'new app'}\nExisting HTML:\n${project?.html || '(none)'}\nExisting memory:\n${JSON.stringify(project?.memory || {})}\nUser request:\n${request}` }],
      temperature: 0.15,
      maxTokens: 12000,
    });
    return extractJson(result);
  },
  async applyBuild(project, draft, request) {
    const target = draft.target === 'ADVANCED_PROJECT' ? 'ADVANCED_PROJECT' : 'SINGLE_HTML';
    const now = Date.now();
    const nextVersion = (project.versions?.length || 0) + 1;
    const memory = {
      ...(project.memory || MEMORY_TEMPLATE(project)),
      ...(draft.memory || {}),
      version: nextVersion,
      name: draft.name || project.name,
      target,
      history: [...(project.memory?.history || []), { version: nextVersion, action: request || draft.summary || 'AI update', at: now }].slice(-30),
    };
    const files = target === 'SINGLE_HTML'
      ? { ...(project.files || {}), 'index.html': String(draft.html || project.html || '') }
      : { ...(project.files || {}), ...(draft.files || {}) };
    const next = {
      ...project, name: draft.name || project.name, target, html: target === 'SINGLE_HTML' ? files['index.html'] : project.html,
      files, memory, updatedAt: now,
      versions: [...(project.versions || []), { version: nextVersion, html: target === 'SINGLE_HTML' ? files['index.html'] : project.html, files, memory, at: now }].slice(-20),
    };
    return this.saveProject(next);
  },
  async undo(project) {
    if (!project?.versions || project.versions.length < 2) return project;
    const versions = project.versions.slice(0, -1);
    const previous = versions[versions.length - 1];
    return this.saveProject({ ...project, html: previous.html || project.html, files: previous.files || project.files, memory: previous.memory || project.memory, versions });
  },
  async getCurrent() {
    const id = await AsyncStorage.getItem(CURRENT_KEY);
    return id ? this.getProject(id) : null;
  },
};

export default AIAppBuilderService;
export { AIAppBuilderService };
