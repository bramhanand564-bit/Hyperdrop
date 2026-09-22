import ModelDownloadService from './ModelDownloadService';
import DeviceCapabilityService from './DeviceCapabilityService';

let activeContext = null;
let activeModelId = null;

function getLlama() {
  try { return require('llama.rn'); } catch (error) {
    throw new Error('On-device AI runtime is not available in Expo Go. Build Nax with the native dev/release profile first.');
  }
}

const OnDeviceAIService = {
  async getDeviceCapabilities() { return DeviceCapabilityService.scan(); },
  async isInstalled(model) { return ModelDownloadService.isInstalled(model); },
  async downloadModel(model, onProgress) { return ModelDownloadService.download(model, onProgress); },
  async removeModel(model) {
    if (activeModelId === model.id) await this.unload();
    return ModelDownloadService.remove(model);
  },
  async load(model, device = null) {
    const caps = device || await DeviceCapabilityService.scan();
    if (!caps.runtimeSupported) throw new Error('This device CPU architecture is not supported for the current on-device runtime.');
    const installed = await ModelDownloadService.isInstalled(model);
    if (!installed) throw new Error('Download the model before loading it.');
    if (activeContext && activeModelId === model.id) return activeContext;
    if (activeContext) await this.unload();
    const { initLlama } = getLlama();
    const path = await ModelDownloadService.pathFor(model);
    activeContext = await initLlama({ model: path, n_ctx: model.context || 2048, n_gpu_layers: 99, use_mlock: false });
    activeModelId = model.id;
    return activeContext;
  },
  async unload() {
    if (activeContext?.release) await activeContext.release();
    activeContext = null;
    activeModelId = null;
  },
  async generateText({ model, messages = [], systemPrompt = '', temperature = 0.2, maxTokens = 800, onToken } = {}) {
    if (!model) throw new Error('On-device model is required.');
    const context = await this.load(model);
    const normalized = [];
    if (systemPrompt) normalized.push({ role: 'system', content: String(systemPrompt) });
    messages.filter(item => item?.content).forEach(item => normalized.push({ role: item.role || 'user', content: String(item.content) }));
    const result = await context.completion({ messages: normalized, n_predict: maxTokens, temperature }, data => onToken?.(data?.token || ''));
    return String(result?.text || '');
  },
  async test(model) { return this.generateText({ model, messages: [{ role: 'user', content: 'Reply with exactly: OK' }], maxTokens: 8, temperature: 0 }); },
};

export default OnDeviceAIService;
export { OnDeviceAIService };
