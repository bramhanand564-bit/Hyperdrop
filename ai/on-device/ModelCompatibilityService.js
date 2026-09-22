function compatibleArchitecture(model, device) {
  if (!model.architectures?.length || !device.architectures?.length) return true;
  return model.architectures.some(required => device.architectures.some(actual => String(actual).toLowerCase().includes(String(required).toLowerCase())));
}

const ModelCompatibilityService = {
  evaluate(model, device) {
    if (!device) return { status: 'unknown', label: 'Check device', score: 0, reason: 'Device capability scan is required.' };
    if (!device.runtimeSupported) return { status: 'unsupported', label: 'Unsupported', score: 0, reason: 'A 64-bit CPU architecture is required by the current mobile runtime.' };
    if (!compatibleArchitecture(model, device)) return { status: 'unsupported', label: 'Unsupported', score: 0, reason: 'CPU architecture is not supported by this model/runtime.' };
    const freeMB = device.freeStorageBytes ? device.freeStorageBytes / 1024 / 1024 : Infinity;
    const ramMB = device.ramBytes ? device.ramBytes / 1024 / 1024 : Infinity;
    const storageRequired = model.sizeMB * 1.15;
    if (freeMB < storageRequired) return { status: 'unsupported', label: 'Not enough storage', score: 0, reason: `Needs about ${Math.ceil(storageRequired)} MB free storage.` };
    if (device.ramBytes && ramMB < model.estimatedRamMB * 0.9) return { status: 'heavy', label: 'Too heavy', score: 25, reason: `Estimated runtime memory is ~${model.estimatedRamMB} MB.` };
    const budget = device.safeRamBudgetMB || (ramMB * 0.35);
    if (model.estimatedRamMB > budget) return { status: 'heavy', label: 'Heavy', score: 55, reason: `Model may compete with the OS/app for memory.` };
    const score = Math.max(50, Math.min(100, Math.round(100 - Math.max(0, model.estimatedRamMB - budget) / Math.max(1, budget) * 40)));
    return { status: 'supported', label: score >= 80 ? 'Recommended' : 'Supported', score, reason: 'Fits the current device profile with a conservative memory budget.' };
  },
  rank(models, device) {
    return models.map(model => ({ ...model, compatibility: this.evaluate(model, device) }))
      .sort((a, b) => (b.compatibility.score || 0) - (a.compatibility.score || 0) || a.sizeMB - b.sizeMB);
  },
};

export default ModelCompatibilityService;
