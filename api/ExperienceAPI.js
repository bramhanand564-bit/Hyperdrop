import { auth, db } from '../firebaseConfig';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  writeBatch,
  orderBy,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const experiencesRef = collection(db, 'experiences');

const EMPTY_SCHEMA = {
  version: 1,
  fields: [],
  actions: [],
  rules: [],
  ui: {
    card: ['icon', 'name', 'description', 'primaryActions'],
    full: ['header', 'fields', 'actions', 'status'],
  },
};

const normalize = (id, data = {}) => ({
  id,
  name: data.name || 'Untitled Experience',
  description: data.description || '',
  template: data.template || 'custom',
  icon: data.icon || '⚡',
  status: data.status || 'published',
  creatorId: data.creatorId || '',
  creatorName: data.creatorName || 'Creator',
  schema: data.schema || EMPTY_SCHEMA,
  createdAt: data.createdAt || null,
  updatedAt: data.updatedAt || null,
});

const sanitizeValues = (fields, values = {}) => {
  const safe = {};
  (Array.isArray(fields) ? fields : []).slice(0, 40).forEach(field => {
    if (!field?.id || values[field.id] === undefined || values[field.id] === null) return;
    const raw = values[field.id];
    if (field.type === 'Checkbox') {
      safe[field.id] = !!raw;
      return;
    }
    if (field.type === 'Number') {
      const number = Number(raw);
      if (Number.isFinite(number)) safe[field.id] = Math.max(-1000000000, Math.min(1000000000, number));
      return;
    }
    if (field.type === 'Rating') {
      const rating = Number(raw);
      if (Number.isFinite(rating)) safe[field.id] = Math.max(1, Math.min(5, Math.round(rating)));
      return;
    }
    if (field.type === 'Image' || field.type === 'File') {
      if (typeof raw === 'object' && raw) {
        const url = String(raw.url || raw.secureUrl || '').trim();
        const name = String(raw.name || 'File').slice(0, 180);
        const mimeType = String(raw.mimeType || 'application/octet-stream').slice(0, 120);
        const bytes = Number(raw.bytes);
        if (/^https:\/\/[^\s]+$/i.test(url)) {
          safe[field.id] = {
            url,
            name,
            mimeType,
            bytes: Number.isFinite(bytes) ? Math.max(0, Math.min(500000000, bytes)) : null,
          };
        }
      }
      return;
    }
    const stringValue = String(raw);
    safe[field.id] = stringValue.slice(0, field.type === 'Text' ? 2000 : 500);
  });
  return safe;
};

const requireUser = () => {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('Authentication required.');
  return uid;
};

const ExperienceAPI = {
  async list({ search = '', template = '', limitCount = 50 } = {}) {
    const snap = await getDocs(query(
      experiencesRef,
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(Math.min(100, Math.max(1, Number(limitCount) || 50)))
    ));
    const q = String(search || '').trim().toLowerCase();

    return snap.docs
      .map(d => normalize(d.id, d.data()))
      .filter(item => item.status !== 'disabled')
      .filter(item => !template || item.template === template)
      .filter(item => !q || [item.name, item.description, item.creatorName, item.template]
        .some(value => String(value || '').toLowerCase().includes(q)));
  },

  async listMine() {
    const uid = requireUser();
    const snap = await getDocs(query(experiencesRef, where('creatorId', '==', uid)));
    return snap.docs
      .map(d => normalize(d.id, d.data()))
      .sort((a, b) => {
        const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bt - at;
      });
  },

  async get(id) {
    if (!id) return null;
    const snap = await getDoc(doc(db, 'experiences', id));
    return snap.exists() ? normalize(snap.id, snap.data()) : null;
  },

  async create(input = {}) {
    const user = auth?.currentUser;
    if (!user) throw new Error('Authentication required.');

    const name = String(input.name || '').trim().slice(0, 80);
    if (!name) throw new Error('Experience name is required.');

    const schema = input.schema || EMPTY_SCHEMA;
    if (JSON.stringify(schema).length > 250000) throw new Error('Experience configuration is too large.');
    if (!Array.isArray(schema.fields) || !Array.isArray(schema.actions)) throw new Error('Invalid Experience configuration.');
    const payload = {
      name,
      description: String(input.description || '').trim().slice(0, 500),
      template: String(input.template || 'custom').slice(0, 40),
      icon: String(input.icon || '⚡').slice(0, 8),
      schema,
      creatorId: user.uid,
      creatorName: user.displayName || user.email?.split('@')[0] || 'Creator',
      status: 'published',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const created = await addDoc(experiencesRef, payload);
    return { id: created.id, ...payload };
  },

  async update(id, input = {}) {
    const uid = requireUser();
    if (!id) throw new Error('Experience id is required.');

    const payload = {
      ...(input.name !== undefined ? { name: String(input.name).trim().slice(0, 80) } : {}),
      ...(input.description !== undefined ? { description: String(input.description).trim().slice(0, 500) } : {}),
      ...(input.icon !== undefined ? { icon: String(input.icon).slice(0, 8) } : {}),
      ...(input.template !== undefined ? { template: String(input.template).slice(0, 40) } : {}),
      ...(input.schema !== undefined ? { schema: input.schema } : {}),
      ...(input.status !== undefined ? { status: String(input.status).slice(0, 20) } : {}),
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    };

    await updateDoc(doc(db, 'experiences', id), payload);
    return this.get(id);
  },

  async remove(id) {
    requireUser();
    if (!id) return false;
    const root = doc(db, 'experiences', id);
    const [participants, events] = await Promise.all([
      getDocs(collection(db, 'experiences', id, 'participants')),
      getDocs(collection(db, 'experiences', id, 'events')),
    ]);

    const refs = [
      ...participants.docs.map(item => item.ref),
      ...events.docs.map(item => item.ref),
      root,
    ];

    for (let index = 0; index < refs.length; index += 400) {
      const batch = writeBatch(db);
      refs.slice(index, index + 400).forEach(ref => batch.delete(ref));
      await batch.commit();
    }

    return true;
  },

  async run(id, context = {}) {
    const uid = requireUser();
    if (!id) return false;

    await setDoc(doc(db, 'experiences', id, 'participants', uid), {
      userId: uid,
      lastRunAt: serverTimestamp(),
      runCount: increment(1),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await addDoc(collection(db, 'experiences', id, 'events'), {
      type: 'run',
      action: 'open',
      userId: uid,
      chatId: context.chatId || null,
      createdAt: serverTimestamp(),
    });

    return true;
  },

  async join(id) {
    const uid = requireUser();
    if (!id) return false;

    await setDoc(doc(db, 'experiences', id, 'participants', uid), {
      userId: uid,
      joinedAt: serverTimestamp(),
      status: 'active',
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await addDoc(collection(db, 'experiences', id, 'events'), {
      type: 'join',
      action: 'join',
      userId: uid,
      createdAt: serverTimestamp(),
    });

    return true;
  },

  async performAction(id, action, values = {}, context = {}) {
    const uid = requireUser();
    if (!id || !action) throw new Error('Experience action is required.');

    const experience = await this.get(id);
    if (!experience) throw new Error('Experience not found.');

    const actions = experience.schema?.actions || [];
    const definition = actions.find(item =>
      String(item.id || '').toLowerCase() === String(action.id || action).toLowerCase()
      || String(item.label || '').toLowerCase() === String(action.label || action).toLowerCase()
    );

    if (!definition) throw new Error('This action is not available in the Experience.');

    const actionId = definition.id;
    const label = definition.label;
    const participantRef = doc(db, 'experiences', id, 'participants', uid);
    const currentSnap = await getDoc(participantRef);
    const currentState = currentSnap.exists() ? (currentSnap.data().state || {}) : {};
    const fieldList = Array.isArray(experience.schema?.fields) ? experience.schema.fields : [];
    const safeValues = sanitizeValues(fieldList, values);

    const requiredMissing = fieldList.find(field => field.required && (
      safeValues[field.id] === undefined
      || safeValues[field.id] === null
      || safeValues[field.id] === ''
      || (field.type === 'Checkbox' && safeValues[field.id] === false)
    ));
    if (requiredMissing && ['complete','submit','claim','book','pay','approve'].includes(String(label).toLowerCase())) {
      throw new Error('Required field missing: ' + (requiredMissing.label || requiredMissing.id));
    }

    const rule = (experience.schema?.rules || []).find(item => String(item.when || '').toLowerCase() === actionId.toLowerCase());
    const lowerLabel = String(label).toLowerCase();
    const status = rule?.set?.status ?? (['complete','claim','submit','book','pay','approve'].includes(lowerLabel) ? 'completed' : (['start','accept','join'].includes(lowerLabel) ? 'active' : currentState.status || 'ready'));
    const pointsDelta = Math.max(0, Number(rule?.set?.pointsDelta || 0));
    const nextPoints = Math.max(0, Number(currentState.points || 0) + pointsDelta);

    const eventRef = await addDoc(collection(db, 'experiences', id, 'events'), {
      type: 'action',
      actionId,
      actionLabel: label,
      userId: uid,
      values: safeValues,
      chatId: context.chatId || null,
      transferId: context.transferId || null,
      pointsDelta,
      createdAt: serverTimestamp(),
    });

    await setDoc(participantRef, {
      userId: uid,
      status: status === 'completed' ? 'completed' : 'active',
      lastActionId: actionId,
      lastActionLabel: label,
      lastActionAt: serverTimestamp(),
      state: {
        ...currentState,
        ...safeValues,
        status,
        points: nextPoints,
        lastActionId: actionId,
        lastActionLabel: label,
        lastActionAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { eventId: eventRef.id, actionId, label, status, points: nextPoints, pointsDelta };
  },

  async getParticipant(id, userId = auth.currentUser?.uid) {
    if (!id || !userId) return null;
    const snap = await getDoc(doc(db, 'experiences', id, 'participants', userId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async listParticipants(id) {
    requireUser();
    if (!id) return [];
    const snap = await getDocs(collection(db, 'experiences', id, 'participants'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async listEvents(id, limitCount = 100) {
    requireUser();
    if (!id) return [];
    const snap = await getDocs(query(
      collection(db, 'experiences', id, 'events'),
      orderBy('createdAt', 'desc'),
      limit(Math.min(500, Math.max(1, Number(limitCount) || 100)))
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
};

export default ExperienceAPI;
export { ExperienceAPI, EMPTY_SCHEMA };
