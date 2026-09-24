import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@nax/local_mini_apps_v1';

async function readAll() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

async function writeAll(list) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

export const LocalMiniAppStore = {
  async list() {
    return readAll();
  },
  async get(id) {
    if (!id) return null;
    const list = await readAll();
    return list.find(item => item.id === id) || null;
  },
  async save(app) {
    const list = await readAll();
    const value = {
      ...app,
      id: app.id || 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      source: 'local-import',
      status: app.status || 'draft',
      updatedAt: Date.now(),
      createdAt: app.createdAt || Date.now(),
    };
    const next = [value, ...list.filter(item => item.id !== value.id)].slice(0, 30);
    await writeAll(next);
    return value;
  },
  async update(id, patch = {}) {
    const list = await readAll();
    const next = list.map(item => item.id === id ? { ...item, ...patch, updatedAt: Date.now() } : item);
    await writeAll(next);
    return next.find(item => item.id === id) || null;
  },
  async remove(id) {
    const list = await readAll();
    await writeAll(list.filter(item => item.id !== id));
    return true;
  },
};

export default LocalMiniAppStore;
