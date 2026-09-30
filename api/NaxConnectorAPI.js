import { auth, db } from '../firebaseConfig';
import CreatorAnalyticsAPI from './CreatorAnalyticsAPI';
import { doc, getDoc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';

const STATE_COLLECTION = 'connector_state';
const STATE_DOC = 'public';
const MAX_FIELDS = 20;
const MAX_ACTIONS = 30;
const MAX_VALUES = 50;
const MAX_VALUE_LENGTH = 1000;

const safe = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const clone = value => { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return {}; } };

const normalizeField = field => {
  if (!field || typeof field !== 'object') return null;
  const id = safe(field.id, 80);
  const label = safe(field.label || field.name || id, 80);
  if (!id || !label) return null;
  const allowed = ['text','number','select','toggle','checkbox','rating'];
  const type = safe(field.type || 'text', 20).toLowerCase();
  return {
    id,
    label,
    type: allowed.includes(type) ? type : 'text',
    required: field.required === true,
    placeholder: safe(field.placeholder || '', 120),
    options: Array.isArray(field.options) ? field.options.slice(0, 20).map(v => safe(v, 80)).filter(Boolean) : [],
  };
};

const normalizeAction = action => {
  if (!action || typeof action !== 'object') return null;
  const id = safe(action.id || action.name, 80);
  const label = safe(action.label || action.name || id, 80);
  if (!id || !label) return null;
  const allowed = ['set','increment','decrement','toggle','vote','append','reset','open','submit'];
  const type = safe(action.type || action.actionType || 'submit', 20).toLowerCase();
  return {
    id,
    label,
    type: allowed.includes(type) ? type : 'submit',
    fieldId: safe(action.fieldId || action.targetFieldId || '', 80),
    value: action.value === undefined ? null : clone(action.value),
    primary: action.primary === true,
    requiresAuth: action.requiresAuth !== false,
  };
};

export const normalizeConnector = (connector = {}, fallback = {}) => {
  const source = connector && typeof connector === 'object' ? connector : {};
  return {
    version: Number(source.version || 1),
    enabled: source.enabled !== false,
    title: safe(source.title || fallback.name || 'Connected App', 80),
    description: safe(source.description || fallback.description || 'A live surface of this Nax app.', 240),
    icon: safe(source.icon || fallback.icon || '⚡', 8),
    mode: ['compact','standard','large'].includes(source.mode) ? source.mode : 'compact',
    sourceType: safe(source.sourceType || fallback.sourceType || 'app', 30) || 'app',
    sourceId: safe(source.sourceId || fallback.sourceId || '', 150),
    capabilities: Array.isArray(source.capabilities) ? source.capabilities.slice(0, 20).map(v => safe(v, 50)) : ['state','share','open'],
    permissions: {
      read: source.permissions?.read !== false,
      write: source.permissions?.write !== false,
      share: source.permissions?.share !== false,
    },
    fields: Array.isArray(source.fields) ? source.fields.slice(0, MAX_FIELDS).map(normalizeField).filter(Boolean) : [],
    actions: Array.isArray(source.actions) ? source.actions.slice(0, MAX_ACTIONS).map(normalizeAction).filter(Boolean) : [],
    initialState: source.initialState && typeof source.initialState === 'object' ? clone(source.initialState) : {},
    chat: {
      presentation: safe(source.chat?.presentation || 'card', 30),
      showDescription: source.chat?.showDescription !== false,
      showStatus: source.chat?.showStatus !== false,
      allowInlineActions: source.chat?.allowInlineActions !== false,
      maxFields: Math.max(0, Math.min(8, Number(source.chat?.maxFields ?? 3))),
      maxActions: Math.max(1, Math.min(8, Number(source.chat?.maxActions ?? 3))),
    },
  };
};

export const createDefaultConnector = (project = {}) => normalizeConnector({
  enabled: true,
  title: project.name || 'Connected App',
  description: project.memory?.summary || 'A live surface of this Nax app.',
  icon: project.icon || '⚡',
  sourceType: 'app',
  sourceId: project.id || '',
  capabilities: ['state','share','open'],
  permissions: { read: true, write: true, share: true },
  fields: [],
  actions: [],
  initialState: {},
  chat: { presentation:'card', showDescription:true, showStatus:true, allowInlineActions:true, maxFields:3, maxActions:3 },
}, project);

const stateRef = appId => doc(db, 'nax_apps', appId, STATE_COLLECTION, STATE_DOC);

const requireUser = () => {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('Sign in is required.');
  return uid;
};

const getApp = async appId => {
  if (!appId) return null;
  const snap = await getDoc(doc(db, 'nax_apps', appId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

const getState = async (appId, connector = {}) => {
  if (!appId) return { values: clone(connector.initialState || {}) };
  const snap = await getDoc(stateRef(appId));
  if (!snap.exists()) return { values: clone(connector.initialState || {}) };
  const data = snap.data() || {};
  return { values: data.values || {}, updatedBy: data.updatedBy || null, updatedAt: data.updatedAt || null, lastActionId: data.lastActionId || null };
};

const value = input => {
  if (input === null || input === undefined) return null;
  if (typeof input === 'string') return input.slice(0, MAX_VALUE_LENGTH);
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  if (typeof input === 'boolean') return input;
  if (Array.isArray(input)) return input.slice(0, 20).map(value);
  return safe(input, MAX_VALUE_LENGTH);
};

const applyAction = (current, action, input = {}) => {
  if (action.type === 'reset') return {};
  const next = { ...(current || {}) };
  const fieldId = action.fieldId || safe(input.fieldId, 80);
  if (['set','increment','decrement','toggle','vote','append','submit'].includes(action.type) && !fieldId) throw new Error('This action has no target field.');

  if (action.type === 'set' || action.type === 'submit') {
    if (fieldId) next[fieldId] = value(input.value !== undefined ? input.value : action.value);
  } else if (action.type === 'increment' || action.type === 'decrement') {
    const currentNumber = Number(next[fieldId] || 0);
    const delta = Number(input.delta ?? action.value ?? 1);
    next[fieldId] = currentNumber + (action.type === 'increment' ? delta : -delta);
  } else if (action.type === 'toggle') {
    next[fieldId] = !Boolean(next[fieldId]);
  } else if (action.type === 'vote') {
    next[fieldId] = value(input.value !== undefined ? input.value : action.value);
  } else if (action.type === 'append') {
    const items = Array.isArray(next[fieldId]) ? next[fieldId].slice(-19) : [];
    items.push(value(input.value !== undefined ? input.value : action.value));
    next[fieldId] = items;
  }

  const limited = {};
  Object.keys(next).slice(0, MAX_VALUES).forEach(key => { limited[safe(key, 80)] = value(next[key]); });
  return limited;
};

const performAction = async (appId, actionId, input = {}, context = {}) => {
  const uid = requireUser();
  const app = await getApp(appId);
  if (!app) throw new Error('App not found.');
  if (app.status !== 'published' && app.creatorId !== uid) throw new Error('This app is not available.');
  const connector = normalizeConnector(app.connector, app);
  if (!connector.enabled || connector.permissions.write === false) throw new Error('This connector is read-only.');
  const action = connector.actions.find(item => item.id === safe(actionId, 80));
  if (!action) throw new Error('Connector action is not available.');

  let result;
  await runTransaction(db, async transaction => {
    const ref = stateRef(appId);
    const snap = await transaction.get(ref);
    const current = snap.exists() ? (snap.data()?.values || {}) : clone(connector.initialState || {});
    const values = applyAction(current, action, input);
    transaction.set(ref, {
      values,
      updatedBy: uid,
      lastActionId: action.id,
      surface: safe(context.surface || context.chatId || '', 120),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    result = { status: 'updated', actionId: action.id, label: action.label, values };
  });
  CreatorAnalyticsAPI.recordAppEvent(app, 'action');
  return result;
};

const initializeState = async (appId, initialState = {}) => {
  const uid = requireUser();
  const app = await getApp(appId);
  if (!app) throw new Error('App not found.');
  if (app.creatorId !== uid) throw new Error('Only the creator can initialize state.');
  const ref = stateRef(appId);
  await runTransaction(db, async transaction => {
    const snap = await transaction.get(ref);
    if (snap.exists()) return;
    transaction.set(ref, { values: clone(initialState) || {}, updatedBy: uid, updatedAt: serverTimestamp() });
  });
  return getState(appId, app.connector || {});
};

const subscribeState = (appId, onValue, onError) => {
  if (!appId) return () => {};
  return onSnapshot(stateRef(appId), snap => {
    const data = snap.exists() ? snap.data() || {} : {};
    onValue?.({ values: data.values || {}, updatedBy: data.updatedBy || null, updatedAt: data.updatedAt || null, lastActionId: data.lastActionId || null });
  }, onError);
};

const api = { normalizeConnector, createDefaultConnector, getConnector: async appId => { const app = await getApp(appId); return app ? normalizeConnector(app.connector, app) : null; }, getState, initializeState, subscribeState, performAction };
export default api;