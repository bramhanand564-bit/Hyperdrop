import { auth, db } from '../firebaseConfig';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

const experiencesRef = collection(db, 'experiences');

const normalize = (id, data = {}) => ({
  id,
  name: data.name || 'Untitled Experience',
  description: data.description || '',
  template: data.template || 'custom',
  icon: data.icon || '⚡',
  status: data.status || 'published',
  creatorId: data.creatorId || '',
  creatorName: data.creatorName || 'Creator',
  schema: data.schema || { fields: [], actions: [], rules: [], ui: [] },
  users: Number(data.users || 0),
  runs: Number(data.runs || 0),
  createdAt: data.createdAt || null,
  updatedAt: data.updatedAt || null,
});

const ExperienceAPI = {
  async list() {
    const snap = await getDocs(query(experiencesRef, orderBy('createdAt', 'desc')));
    return snap.docs
      .map(d => normalize(d.id, d.data()))
      .filter(item => item.status !== 'disabled');
  },

  async get(id) {
    if (!id) return null;
    const snap = await getDoc(doc(db, 'experiences', id));
    return snap.exists() ? normalize(snap.id, snap.data()) : null;
  },

  async create(input) {
    const user = auth?.currentUser;
    if (!user) throw new Error('Authentication required.');

    const name = String(input?.name || '').trim().slice(0, 80);
    if (!name) throw new Error('Experience name is required.');

    const schema = input?.schema || {
      fields: [],
      actions: [],
      rules: [],
      ui: [],
    };

    const payload = {
      name,
      description: String(input?.description || '').trim().slice(0, 500),
      template: String(input?.template || 'custom').slice(0, 40),
      icon: String(input?.icon || '⚡').slice(0, 8),
      schema,
      creatorId: user.uid,
      creatorName: user.displayName || user.email?.split('@')[0] || 'Creator',
      status: 'published',
      users: 0,
      runs: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const created = await addDoc(experiencesRef, payload);
    return { id: created.id, ...payload };
  },

  async run(id) {
    if (!id) return false;
    await updateDoc(doc(db, 'experiences', id), {
      runs: increment(1),
      updatedAt: serverTimestamp(),
    });
    return true;
  },

  async join(id) {
    if (!id) return false;
    await updateDoc(doc(db, 'experiences', id), {
      users: increment(1),
      updatedAt: serverTimestamp(),
    });
    return true;
  },
};

export default ExperienceAPI;
export { ExperienceAPI };
