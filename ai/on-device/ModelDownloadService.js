import * as FileSystem from 'expo-file-system/legacy';

const ROOT = `${FileSystem.documentDirectory}nax-models/`;
const safeName = value => String(value || '').replace(/[^a-zA-Z0-9._-]/g, '_');

async function ensureRoot() {
  const info = await FileSystem.getInfoAsync(ROOT);
  if (!info.exists) await FileSystem.makeDirectoryAsync(ROOT, { intermediates: true });
}

const ModelDownloadService = {
  async pathFor(model) { await ensureRoot(); return `${ROOT}${safeName(model.id)}.gguf`; },
  async isInstalled(model) { const info = await FileSystem.getInfoAsync(await this.pathFor(model)); return !!info.exists && Number(info.size || 0) > 0; },
  async listInstalled() {
    await ensureRoot();
    const names = await FileSystem.readDirectoryAsync(ROOT).catch(() => []);
    return names.filter(name => name.endsWith('.gguf')).map(name => ({ name, path: `${ROOT}${name}` }));
  },
  async download(model, onProgress) {
    if (!model?.url) throw new Error('This model does not have a verified download URL yet.');
    await ensureRoot();
    const path = await this.pathFor(model);
    const task = FileSystem.createDownloadResumable(model.url, path, {}, progress => {
      const total = progress.totalBytesExpectedToWrite || model.sizeMB * 1024 * 1024;
      onProgress?.(total ? progress.totalBytesWritten / total : 0);
    });
    const result = await task.downloadAsync();
    return result?.uri || path;
  },
  async remove(model) { const path = await this.pathFor(model); await FileSystem.deleteAsync(path, { idempotent: true }); },
};

export default ModelDownloadService;
