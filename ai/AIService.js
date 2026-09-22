import AISettingsService from './AISettingsService';
import { AI_CONNECTION_TYPES } from './AIProviderRegistry';
import OnDeviceAIService from './on-device/OnDeviceAIService';

function ensureMessages(messages, systemPrompt = '') {
  const normalized = Array.isArray(messages)
    ? messages.filter(item => item && item.content).map(item => ({ role: item.role || 'user', content: String(item.content) }))
    : [];
  if (systemPrompt && !normalized.some(item => item.role === 'system')) normalized.unshift({ role: 'system', content: String(systemPrompt) });
  return normalized;
}
function normalizeBaseUrl(value) { return String(value || '').trim().replace(/\/$/, ''); }
function extractOpenAIText(data) { return data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || data?.output_text || data?.response || ''; }

const AIService = {
  async listConnections() { return AISettingsService.listConnections(); },
  async getActiveConnection() { return AISettingsService.getActiveConnection(); },
  async saveConnection(input) { return AISettingsService.saveConnection(input); },
  async deleteConnection(id) { return AISettingsService.deleteConnection(id); },
  async setActiveConnection(id) { return AISettingsService.setActiveConnection(id); },
  async listRemoteModels(input = null) {
    const connection = typeof input === 'string'
      ? await AISettingsService.getConnection(input, { includeSecret: true })
      : input?.connectionId
        ? await AISettingsService.getConnection(input.connectionId, { includeSecret: true })
        : input;
    if (!connection) throw new Error('AI connection details are required.');
    if (connection.type === AI_CONNECTION_TYPES.ON_DEVICE) return [];
    const baseUrl = normalizeBaseUrl(connection.baseUrl);
    if (!baseUrl) throw new Error('API base URL is required.');
    if (connection.type === AI_CONNECTION_TYPES.GEMINI) {
      const url = baseUrl + '/models?key=' + encodeURIComponent(connection.apiKey || '');
      const response = await fetch(url);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || 'Model discovery failed (' + response.status + ').');
      return (data.models || []).map(item => String(item.name || '').replace(/^models\//, '')).filter(Boolean);
    }
    const response = await fetch(baseUrl + '/models', {
      headers: connection.apiKey ? { Authorization: 'Bearer ' + connection.apiKey } : {},
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || 'Model discovery failed (' + response.status + ').');
    return (data.data || data.models || []).map(item => String(item.id || item.name || '').trim()).filter(Boolean);
  },
  async testConnection(connectionId) {
    const connection = await AISettingsService.getConnection(connectionId, { includeSecret: false });
    if (connection?.type === AI_CONNECTION_TYPES.ON_DEVICE) {
      const model = connection.models?.[0] ? JSON.parse(connection.models[0]) : null;
      if (!model) throw new Error('Select a downloaded offline model first.');
      return OnDeviceAIService.test(model);
    }
    return this.generateText({ connectionId, messages: [{ role: 'user', content: 'Reply with exactly: OK' }], maxTokens: 8, temperature: 0 });
  },
  async generateText({ connectionId, model, messages = [], systemPrompt = '', temperature = 0.2, maxTokens = 800, onToken } = {}) {
    const connection = connectionId ? await AISettingsService.getConnection(connectionId, { includeSecret: true }) : await AISettingsService.getActiveConnection();
    if (!connection) throw new Error('No AI connection configured. Open Settings → AI & Models.');
    const selectedModel = model || connection.model || connection.models?.[0];
    if (connection.type === AI_CONNECTION_TYPES.ON_DEVICE) {
      let selected = null;
      try { selected = selectedModel ? JSON.parse(selectedModel) : null; } catch (_) {}
      if (!selected) throw new Error('Choose a downloaded Offline AI model in Settings → AI & Models → Offline AI.');
      return OnDeviceAIService.generateText({ model: selected, messages, systemPrompt, temperature, maxTokens, onToken });
    }
    if (!selectedModel) throw new Error('No model selected for this AI connection.');
    const normalizedMessages = ensureMessages(messages, systemPrompt);
    if (!normalizedMessages.length) normalizedMessages.push({ role: 'user', content: 'Hello' });

    if (connection.type === AI_CONNECTION_TYPES.GEMINI) {
      const url = `${normalizeBaseUrl(connection.baseUrl)}/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(connection.apiKey || '')}`;
      const body = { contents: [{ role: 'user', parts: [{ text: normalizedMessages.map(item => `${item.role}: ${item.content}`).join('\n\n') }] }], generationConfig: { temperature, maxOutputTokens: maxTokens } };
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || 'Gemini request failed.');
      return data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
    }

    const url = `${normalizeBaseUrl(connection.baseUrl)}/chat/completions`;
    const headers = { 'Content-Type': 'application/json' };
    if (connection.apiKey) headers.Authorization = `Bearer ${connection.apiKey}`;
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ model: selectedModel, messages: normalizedMessages, temperature, max_tokens: maxTokens, stream: false }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `AI request failed (${response.status}).`);
    const text = extractOpenAIText(data);
    if (!text) throw new Error('AI provider returned no text.');
    return String(text);
  },
};
export default AIService;
export { AIService };
