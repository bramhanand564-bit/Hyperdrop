const HF = 'https://huggingface.co';

const SEED_MODELS = [
  { id:'qwen3-0.6b-q4km', name:'Qwen3 0.6B', family:'Qwen3', role:'general', roleLabel:'Everyday / Fast', description:'Smallest practical general model for quick chat and lightweight creators.', parametersB:0.6, quantization:'Q4_K_M', format:'GGUF', sizeMB:484, estimatedRamMB:1150, context:4096, architectures:['arm64-v8a','arm64 v8','x86_64'], runtime:'llama.rn', offline:true, license:'Apache-2.0', repo:'tensorblock/Qwen_Qwen3-0.6B-GGUF', file:'Qwen3-0.6B-Q4_K_M.gguf', url:`${HF}/tensorblock/Qwen_Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_K_M.gguf?download=true` },
  { id:'qwen3-1.7b-q4km', name:'Qwen3 1.7B', family:'Qwen3', role:'general', roleLabel:'Best General', description:'Stronger everyday model for writing, reasoning and Experience generation.', parametersB:1.7, quantization:'Q4_K_M', format:'GGUF', sizeMB:1282, estimatedRamMB:2600, context:4096, architectures:['arm64-v8a','arm64 v8','x86_64'], runtime:'llama.rn', offline:true, license:'Apache-2.0', repo:'tensorblock/Qwen_Qwen3-1.7B-GGUF', file:'Qwen3-1.7B-Q4_K_M.gguf', url:`${HF}/tensorblock/Qwen_Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf?download=true` },
  { id:'qwen25-coder-1.5b-q4km', name:'Qwen2.5-Coder 1.5B', family:'Qwen2.5-Coder', role:'coding', roleLabel:'Best for Coding', description:'Focused coding model for code, scripts and debugging.', parametersB:1.5, quantization:'Q4_K_M', format:'GGUF', sizeMB:986, estimatedRamMB:2200, context:4096, architectures:['arm64-v8a','arm64 v8','x86_64'], runtime:'llama.rn', offline:true, license:'Apache-2.0', repo:'Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF', file:'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf', url:`${HF}/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf?download=true` },
  { id:'gemma3-1b-q4km', name:'Gemma 3 1B', family:'Gemma 3', role:'general', roleLabel:'Balanced', description:'Compact general-purpose model with a good quality/size balance.', parametersB:1, quantization:'Q4_K_M', format:'GGUF', sizeMB:806, estimatedRamMB:1850, context:4096, architectures:['arm64-v8a','arm64 v8','x86_64'], runtime:'llama.rn', offline:true, license:'Gemma', repo:'ggml-org/gemma-3-1b-it-GGUF', file:'gemma-3-1b-it-Q4_K_M.gguf', url:`${HF}/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf?download=true` },
  { id:'smollm2-1.7b-q4km', name:'SmolLM2 1.7B', family:'SmolLM2', role:'general', roleLabel:'Lightweight', description:'Lightweight Apache-2.0 model for simple offline tasks.', parametersB:1.7, quantization:'Q4_K_M', format:'GGUF', sizeMB:1056, estimatedRamMB:2300, context:4096, architectures:['arm64-v8a','arm64 v8','x86_64'], runtime:'llama.rn', offline:true, license:'Apache-2.0', repo:'unsloth/SmolLM2-1.7B-Instruct-GGUF', file:'SmolLM2-1.7B-Instruct-Q4_K_M.gguf', url:`${HF}/unsloth/SmolLM2-1.7B-Instruct-GGUF/resolve/main/SmolLM2-1.7B-Instruct-Q4_K_M.gguf?download=true` },
];

const CATALOG_CACHE = 'nax.ai.ondevice.catalog.v2';

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
  async discover(query = 'GGUF Instruct') {
    const response = await fetch(`${HF}/api/models?search=${encodeURIComponent(query)}&limit=20`);
    if (!response.ok) throw new Error('Model catalog request failed.');
    const repos = await response.json();
    const discovered = [];
    for (const repo of Array.isArray(repos) ? repos.slice(0,20) : []) {
      try {
        const detailResponse = await fetch(`${HF}/api/models/${repo.id}`);
        if (!detailResponse.ok) continue;
        const detail = await detailResponse.json();
        const files = Array.isArray(detail?.siblings) ? detail.siblings : [];
        files.filter(file => /\\.gguf$/i.test(file?.rfilename || '')).slice(0,12).forEach(file => {
          const filename = file.rfilename;
          const sizeBytes = Number(file.size || file.lfs?.size || file.pointer_size || 0);
          const sizeMB = Math.round(sizeBytes / 1024 / 1024);
          if (!sizeMB || sizeMB > 3072) return;
          const quant = (filename.match(/(Q\\d(?:_K)?(?:_[A-Z]+)?|IQ\\d(?:_[A-Z]+)?|F16|F32)/i) || ['GGUF'])[1];
          discovered.push({
            id:`hf:${repo.id}:${filename}`, name:repo.id.split('/').pop(), family:repo.id.split('/').pop(),
            role:/coder|code/i.test(repo.id)?'coding':'general', roleLabel:/coder|code/i.test(repo.id)?'Coding':'General',
            description:'Discovered GGUF model. Check its model card before downloading.',
            parametersB:Number(repo?.config?.num_parameters || repo?.safetensors?.total || 0)/1e9 || null,
            quantization:quant.toUpperCase(), format:'GGUF', sizeMB, estimatedRamMB:Math.round(sizeMB*2.1), context:4096,
            architectures:['arm64-v8a','arm64 v8','x86_64'], runtime:'llama.rn', offline:true, repo:repo.id, file:filename,
            url:`${HF}/${repo.id}/resolve/main/${encodeURIComponent(filename).replace(/%2F/g,'/')}?download=true`,
            license:detail?.cardData?.license || detail?.license || 'See model card', source:'huggingface', dynamic:true
          });
        });
      } catch (_) {}
    }
    return discovered;
  },
  async refresh(query) {
    const discovered = await this.discover(query);
    const merged = [...this.seed(), ...discovered];
    return this.save(Array.from(new Map(merged.map(model => [model.id, model])).values()));
  },
};

export default OnDeviceModelCatalog;
export { SEED_MODELS };
