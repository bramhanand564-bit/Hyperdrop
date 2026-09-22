export const AI_CONNECTION_TYPES = {
  OPENAI_COMPATIBLE: 'openai-compatible',
  GEMINI: 'gemini',
  LOCAL_HTTP: 'local-http',
  ON_DEVICE: 'on-device',
};

export const AIConnectionRegistry = {
  presets: [
    {
      type: AI_CONNECTION_TYPES.ON_DEVICE,
      label: '📱 Offline AI',
      description: 'GGUF model downloaded to the phone and executed locally with llama.cpp. No internet is required after download.',
      baseUrl: '',
    },
    {
      type: AI_CONNECTION_TYPES.OPENAI_COMPATIBLE,
      label: 'OpenAI-compatible',
      description: 'One API connection can expose many models.',
      baseUrl: 'https://api.openai.com/v1',
    },
    {
      type: AI_CONNECTION_TYPES.GEMINI,
      label: 'Gemini',
      description: 'Connect a Gemini API key and choose any supported model.',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    },
    {
      type: AI_CONNECTION_TYPES.LOCAL_HTTP,
      label: 'Local HTTP',
      description: 'Connect Ollama, llama.cpp, or another local OpenAI-compatible server.',
      baseUrl: 'http://127.0.0.1:8080/v1',
    },
  ],

  getPreset(type) {
    return this.presets.find(item => item.type === type) || this.presets[0];
  },

  normalizeModels(models, fallbackModel = '') {
    const source = Array.isArray(models) ? models : String(models || '').split(',');
    const values = source.map(model => String(model || '').trim()).filter(Boolean);
    if (fallbackModel && !values.includes(fallbackModel)) values.unshift(fallbackModel);
    return [...new Set(values)].slice(0, 100);
  },
};

export default AIConnectionRegistry;
