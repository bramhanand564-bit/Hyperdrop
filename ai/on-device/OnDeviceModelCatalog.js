const HF = 'https://huggingface.co';

const SEED_MODELS = [
  {
    id: 'smollm2-360m-q4km', name: 'SmolLM2 360M Instruct', family: 'SmolLM2', parametersB: 0.36,
    quantization: 'Q4_K_M', format: 'GGUF', sizeMB: 271, estimatedRamMB: 850, context: 2048,
    architectures: ['arm64-v8a', 'arm64 v8', 'x86_64'], runtime: 'llama.rn', offline: true,
    license: 'Apache-2.0', repo: 'unsloth/SmolLM2-360M-Instruct-GGUF', file: 'SmolLM2-360M-Instruct-Q4_K_M.gguf',
    url: `${HF}/unsloth/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q4_K_M.gguf?download=true`,
  },
  {
    id: 'smollm2-360m-q5km', name: 'SmolLM2 360M Instruct', family: 'SmolLM2', parametersB: 0.36,
    quantization: 'Q5_K_M', format: 'GGUF', sizeMB: 290, estimatedRamMB: 900, context: 2048,
    architectures: ['arm64-v8a', 'arm64 v8', 'x86_64'], runtime: 'llama.rn', offline: true,
    license: 'Apache-2.0', repo: 'unsloth/SmolLM2-360M-Instruct-GGUF', file: 'SmolLM2-360M-Instruct-Q5_K_M.gguf',
    url: `${HF}/unsloth/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q5_K_M.gguf?download=true`,
  },
  {
    id: 'smollm2-360m-q6k', name: 'SmolLM2 360M Instruct', family: 'SmolLM2', parametersB: 0.36,
    quantization: 'Q6_K', format: 'GGUF', sizeMB: 367, estimatedRamMB: 1050, context: 2048,
    architectures: ['arm64-v8a', 'arm64 v8', 'x86_64'], runtime: 'llama.rn', offline: true,
    license: 'Apache-2.0', repo: 'unsloth/SmolLM2-360M-Instruct-GGUF', file: 'SmolLM2-360M-Instruct-Q6_K.gguf',
    url: `${HF}/unsloth/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q6_K.gguf?download=true`,
  },
  {
    id: 'smollm2-360m-q3km', name: 'SmolLM2 360M Instruct', family: 'SmolLM2', parametersB: 0.36,
    quantization: 'Q3_K_M', format: 'GGUF', sizeMB: 235, estimatedRamMB: 780, context: 2048,
    architectures: ['arm64-v8a', 'arm64 v8', 'x86_64'], runtime: 'llama.rn', offline: true,
    license: 'Apache-2.0', repo: 'unsloth/SmolLM2-360M-Instruct-GGUF', file: 'SmolLM2-360M-Instruct-Q3_K_M.gguf',
    url: `${HF}/unsloth/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q3_K_M.gguf?download=true`,
  },
];

const CATALOG_CACHE = 'nax.ai.ondevice.catalog.v1';

const OnDeviceModelCatalog = {
  seed() { return SEED_MODELS.map(item => ({ ...item })); },
  async loadCached() {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const raw = await AsyncStorage.getItem(CATALOG_CACHE);
      if (!raw) return this.seed();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : this.seed();
    } catch (_) { return this.seed(); }
  },
  async save(models) {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(CATALOG_CACHE, JSON.stringify(models));
    return models;
  },
  async discover(query = 'SmolLM2 GGUF Instruct') {
    const response = await fetch(`${HF}/api/models?search=${encodeURIComponent(query)}&limit=20`);
    if (!response.ok) throw new Error('Model catalog request failed.');
    const repos = await response.json();
    return Array.isArray(repos) ? repos.map(repo => ({
      id: `hf:${repo.id}`, name: repo.id.split('/').pop(), family: repo.id.split('/').pop(),
      repo: repo.id, source: 'huggingface', dynamic: true,
      description: repo.pipeline_tag || 'GGUF repository',
    })) : [];
  },
  async refresh(query) {
    const discovered = await this.discover(query);
    const merged = [...this.seed(), ...discovered];
    return this.save(merged);
  },
};

export default OnDeviceModelCatalog;
export { SEED_MODELS };
