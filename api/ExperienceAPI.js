import { auth, db } from '../firebaseConfig';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
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

const requireUser = () => {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('Authentication required.');
  return uid;
};

const ExperienceAPI = {
  async list({ search = '', template = '' } = {}) {
    const snap = await getDocs(query(experiencesRef, orderBy('createdAt', 'desc')));
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
    await deleteDoc(doc(db, 'experiences', id));
    return true;
  },

  async run(id) {
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

  async performAction(id, action, values = {}) {
    const uid = requireUser();
    if (!id || !action) throw new Error('Experience action is required.');

    const experience = await this.get(id);
    if (!experience) throw new Error('Experience not found.');

    const actions = experience.schema?.actions || [];
    const definition = actions.find(item =>
      String(item.id || '').toLowerCase() === String(action.id || action).toLowerCase()
      || String(item.label || '').toLowerCase() === String(action.label || action).toLowerCase()
    );

    const actionId = definition?.id || String(action.id || action).toLowerCase().replace(/\s+/g, '_');
    const label = definition?.label || action.label || action;
    const participantRef = doc(db, 'experiences', id, 'participants', uid);

    const eventRef = await addDoc(collection(db, 'experiences', id, 'events'), {
      type: 'action',
      actionId,
      actionLabel: label,
      userId: uid,
      values,
      createdAt: serverTimestamp(),
    });

    await setDoc(participantRef, {
      userId: uid,
      lastActionId: actionId,
      lastActionLabel: label,
      lastActionAt: serverTimestamp(),
      state: {
        ...(values || {}),
        lastActionId: actionId,
        lastActionLabel: label,
        lastActionAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { eventId: eventRef.id, actionId, label };
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
      orderBy('createdAt', 'desc')
    ));
    return snap.docs.slice(0, limitCount).map(d => ({ id: d.id, ...d.data() }));
  },
};

export default ExperienceAPI;
export { ExperienceAPI, EMPTY_SCHEMA };
