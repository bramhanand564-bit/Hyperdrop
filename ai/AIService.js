import AISettingsService from './AISettingsService';
import { AI_CONNECTION_TYPES } from './AIProviderRegistry';

function ensureMessages(messages, systemPrompt = '') {
  const normalized = Array.isArray(messages)
    ? messages
        .filter(item => item && item.content)
        .map(item => ({ role: item.role || 'user', content: String(item.content) }))
    : [];
  if (systemPrompt && !normalized.some(item => item.role === 'system')) {
    normalized.unshift({ role: 'system', content: String(systemPrompt) });
  }
  return normalized;
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function extractOpenAIText(data) {
  return data?.choices?.[0]?.message?.content
    || data?.choices?.[0]?.text
    || data?.output_text
    || data?.response
    || '';
}

const AIService = {
  async listConnections() {
    return AISettingsService.listConnections();
  },

  async getActiveConnection() {
    return AISettingsService.getActiveConnection();
  },

  async saveConnection(input) {
    return AISettingsService.saveConnection(input);
  },

  async deleteConnection(id) {
    return AISettingsService.deleteConnection(id);
  },

  async setActiveConnection(id) {
    return AISettingsService.setActiveConnection(id);
  },

  async testConnection(connectionId) {
    return this.generateText({
      connectionId,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      maxTokens: 8,
      temperature: 0,
    });
  },

  async generateText({
    connectionId,
    model,
    messages = [],
    systemPrompt = '',
    temperature = 0.2,
    maxTokens = 800,
  } = {}) {
    const connection = connectionId
      ? await AISettingsService.getConnection(connectionId, { includeSecret: true })
      : await AISettingsService.getActiveConnection();

    if (!connection) throw new Error('No AI connection configured. Open Settings → AI & Models.');
    const selectedModel = model || connection.model || connection.models?.[0];
    if (!selectedModel) throw new Error('No model selected for this AI connection.');

    const normalizedMessages = ensureMessages(messages, systemPrompt);
    if (!normalizedMessages.length) normalizedMessages.push({ role: 'user', content: 'Hello' });

    if (connection.type === AI_CONNECTION_TYPES.GEMINI) {
      const url = `${normalizeBaseUrl(connection.baseUrl)}/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(connection.apiKey || '')}`;
      const body = {
        contents: [{
          role: 'user',
          parts: [{ text: normalizedMessages.map(item => `${item.role}: ${item.content}`).join('\n\n') }],
        }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || 'Gemini request failed.');
      return data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
    }

    const url = `${normalizeBaseUrl(connection.baseUrl)}/chat/completions`;
    const headers = { 'Content-Type': 'application/json' };
    if (connection.apiKey) headers.Authorization = `Bearer ${connection.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: selectedModel,
        messages: normalizedMessages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `AI request failed (${response.status}).`);

    const text = extractOpenAIText(data);
    if (!text) throw new Error('AI provider returned no text.');
    return String(text);
  },
};

export default AIService;
export { AIService };
