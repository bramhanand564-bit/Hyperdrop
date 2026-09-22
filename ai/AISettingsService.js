import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AIConnectionRegistry } from './AIProviderRegistry';

const SETTINGS_KEY = 'nax.ai.settings.v1';
const SECRET_PREFIX = 'nax.ai.secret.';
const EMPTY = { activeConnectionId: null, connections: [] };

function makeId() {
  return `ai_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function readSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      activeConnectionId: parsed?.activeConnectionId || null,
      connections: Array.isArray(parsed?.connections) ? parsed.connections : [],
    };
  } catch (error) {
    console.error('AISettingsService.readSettings:', error);
    return EMPTY;
  }
}

async function writeSettings(settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

async function setSecret(id, apiKey) {
  const key = `${SECRET_PREFIX}${id}`;
  if (apiKey) await SecureStore.setItemAsync(key, apiKey);
  else await SecureStore.deleteItemAsync(key).catch(() => {});
}

async function getSecret(id) {
  if (!id) return '';
  try {
    return await SecureStore.getItemAsync(`${SECRET_PREFIX}${id}`) || '';
  } catch (error) {
    console.error('AISettingsService.getSecret:', error);
    return '';
  }
}

const AISettingsService = {
  async listConnections({ includeSecrets = false } = {}) {
    const settings = await readSettings();
    if (!includeSecrets) return settings;
    const connections = await Promise.all(
      settings.connections.map(async connection => ({
        ...connection,
        apiKey: await getSecret(connection.id),
      }))
    );
    return { ...settings, connections };
  },

  async getConnection(id, { includeSecret = true } = {}) {
    if (!id) return null;
    const settings = await readSettings();
    const connection = settings.connections.find(item => item.id === id);
    if (!connection) return null;
    if (!includeSecret) return connection;
    return { ...connection, apiKey: await getSecret(id) };
  },

  async getActiveConnection() {
    const settings = await readSettings();
    const activeId = settings.activeConnectionId || settings.connections[0]?.id;
    if (!activeId) return null;
    return this.getConnection(activeId, { includeSecret: true });
  },

  async saveConnection(input = {}) {
    const name = String(input.name || '').trim();
    const type = input.type || 'openai-compatible';
    const baseUrl = String(input.baseUrl || '').trim().replace(/\/$/, '');
    const model = String(input.model || '').trim();
    const models = AIConnectionRegistry.normalizeModels(input.models, model);

    if (!name) throw new Error('Connection name is required.');
    if (!baseUrl) throw new Error('API base URL is required.');
    if (!model && !models.length) throw new Error('At least one model is required.');

    const settings = await readSettings();
    const id = input.id || makeId();
    const existingIndex = settings.connections.findIndex(item => item.id === id);

    const connection = {
      id,
      name,
      type,
      baseUrl,
      model: model || models[0],
      models,
      createdAt: existingIndex >= 0 ? settings.connections[existingIndex].createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    if (existingIndex >= 0) settings.connections[existingIndex] = connection;
    else settings.connections.push(connection);

    if (!settings.activeConnectionId) settings.activeConnectionId = id;
    await writeSettings(settings);
    await setSecret(id, String(input.apiKey || '').trim());

    return { ...connection, apiKey: String(input.apiKey || '').trim() };
  },

  async setActiveConnection(id) {
    const settings = await readSettings();
    if (!settings.connections.some(item => item.id === id)) throw new Error('AI connection not found.');
    settings.activeConnectionId = id;
    await writeSettings(settings);
    return this.getConnection(id, { includeSecret: true });
  },

  async deleteConnection(id) {
    const settings = await readSettings();
    settings.connections = settings.connections.filter(item => item.id !== id);
    if (settings.activeConnectionId === id) settings.activeConnectionId = settings.connections[0]?.id || null;
    await writeSettings(settings);
    await setSecret(id, '');
    return settings;
  },

  async getModelOptions(id) {
    const connection = await this.getConnection(id, { includeSecret: false });
    return connection?.models || (connection?.model ? [connection.model] : []);
  },
};

export default AISettingsService;
