function compatibleArchitecture(model, device) {
  if (!model.architectures?.length || !device.architectures?.length) return true;
  return model.architectures.some(required => device.architectures.some(actual => String(actual).toLowerCase().includes(String(required).toLowerCase())));
}

const ModelCompatibilityService = {
  evaluate(model, device) {
    if (!device) return { status:'unknown', label:'Check device', score:0, reason:'Device scan is required.' };
    if (!device.runtimeSupported) return { status:'unsupported', label:'Unsupported', score:0, reason:'A 64-bit CPU is required by the current mobile runtime.' };
    if (!compatibleArchitecture(model, device)) return { status:'unsupported', label:'Unsupported', score:0, reason:'CPU architecture is not supported by this runtime.' };

    const freeMB = device.freeStorageBytes ? device.freeStorageBytes / 1024 / 1024 : Infinity;
    const ramMB = device.ramBytes ? device.ramBytes / 1024 / 1024 : Infinity;
    const storageRequired = Number(model.sizeMB || 0) * 1.15;
    if (freeMB < storageRequired) return { status:'unsupported', label:'Low storage', score:0, reason:`Needs about ${Math.ceil(storageRequired)} MB free storage.` };

    const estimated = Number(model.estimatedRamMB || 0);
    if (device.ramBytes && ramMB < estimated * 0.9) {
      return { status:'heavy', label:'Too heavy', score:25, reason:`Estimated runtime memory is ~${estimated} MB.` };
    }

    const budget = Number(device.safeRamBudgetMB || ramMB * 0.35);
    if (estimated > budget) return { status:'heavy', label:'Heavy', score:55, reason:'May compete with the OS/app for memory.' };

    const headroom = budget ? Math.max(0, Math.min(1, (budget - estimated) / budget)) : 0;
    const score = Math.round(70 + headroom * 30);
    return {
      status:'supported',
      label:score >= 88 ? 'Recommended' : 'Supported',
      score,
      reason:score >= 88 ? 'Good memory headroom for this device.' : 'Fits the device, but leaves less memory headroom.',
    };
  },

  rank(models, device) {
    return models
      .filter(model => model && Number.isFinite(Number(model.sizeMB)) && model.url)
      .map(model => ({ ...model, compatibility:this.evaluate(model, device) }))
      .sort((a,b) => {
        const roleBoost = (item) => item.role === 'coding' ? 2 : 1;
        return (b.compatibility.score || 0) - (a.compatibility.score || 0) || roleBoost(b) - roleBoost(a) || a.sizeMB - b.sizeMB;
      });
  },
};

export default ModelCompatibilityService;
