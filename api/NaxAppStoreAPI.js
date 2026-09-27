import { auth, db } from '../firebaseConfig';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const ref = collection(db, 'nax_apps');
const MAX_HTML_BYTES = 850000;

const requireUser = () => {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('Authentication required.');
  return uid;
};

const normalize = (id, data = {}) => ({
  id,
  name: data.name || 'Untitled App',
  description: data.description || '',
  icon: data.icon || '🚀',
  creatorId: data.creatorId || '',
  creatorName: data.creatorName || 'Creator',
  status: data.status || 'published',
  html: data.html || '',
  version: Number(data.version || 1),
  createdAt: data.createdAt || null,
  updatedAt: data.updatedAt || null,
});

const sizeOf = value => String(value || '').length * 2;

const NaxAppStoreAPI = {
  async list({ search = '', limitCount = 60 } = {}) {
    const cap = Math.min(100, Math.max(1, Number(limitCount) || 60));
    const snap = await getDocs(query(ref, where('status', '==', 'published'), limit(cap)));
    const q = String(search || '').trim().toLowerCase();
    return snap.docs
      .map(d => normalize(d.id, d.data()))
      .filter(app => !q || [app.name, app.description, app.creatorName].some(v => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => {
        const ta = a.updatedAt?.toMillis?.() || a.updatedAt || 0;
        const tb = b.updatedAt?.toMillis?.() || b.updatedAt || 0;
        return tb - ta;
      });
  },

  async listMine({ limitCount = 60 } = {}) {
    const uid = requireUser();
    const snap = await getDocs(query(ref, where('creatorId', '==', uid), limit(Math.min(100, Math.max(1, Number(limitCount) || 60)))));
    return snap.docs.map(d => normalize(d.id, d.data())).sort((a, b) => {
      const ta = a.updatedAt?.toMillis?.() || a.updatedAt || 0;
      const tb = b.updatedAt?.toMillis?.() || b.updatedAt || 0;
      return tb - ta;
    });
  },

  async get(id) {
    if (!id) return null;
    const snap = await getDoc(doc(db, 'nax_apps', id));
    return snap.exists() ? normalize(snap.id, snap.data()) : null;
  },

  async publish(project, input = {}) {
    const uid = requireUser();
    if (!project || project.target !== 'SINGLE_HTML') throw new Error('Only Single HTML apps can be published to Nax Store right now.');
    const html = String(project.html || project.files?.['index.html'] || '').trim();
    if (!html) throw new Error('Your app has no index.html to publish.');
    if (sizeOf(html) > MAX_HTML_BYTES) throw new Error('This app is too large for the current Nax Store publisher. Keep the HTML under 850 KB.');
    const id = input.id || doc(ref).id;
    const existing = input.id ? await getDoc(doc(db, 'nax_apps', input.id)) : null;
    if (existing?.exists() && existing.data().creatorId !== uid) throw new Error('You can only update your own Nax app.');
    const payload = {
      name: String(project.name || 'Nax App').trim().slice(0, 80),
      description: String(input.description ?? project.memory?.summary ?? '').trim().slice(0, 500),
      icon: String(input.icon || '🚀').slice(0, 8),
      creatorId: uid,
      creatorName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Creator',
      status: 'published',
      html,
      version: Number(project.version || 1),
      updatedAt: serverTimestamp(),
      ...(existing?.exists() ? {} : { createdAt: serverTimestamp() }),
    };
    await setDoc(doc(db, 'nax_apps', id), payload, { merge: false });
    return { id, ...payload };
  },

  async unpublish(id) {
    const uid = requireUser();
    const snap = await getDoc(doc(db, 'nax_apps', id));
    if (!snap.exists()) return false;
    if (snap.data().creatorId !== uid) throw new Error('You can only unpublish your own Nax app.');
    await updateDoc(snap.ref, { status: 'disabled', updatedAt: serverTimestamp() });
    return true;
  },

  async remove(id) {
    const uid = requireUser();
    const snap = await getDoc(doc(db, 'nax_apps', id));
    if (!snap.exists()) return false;
    if (snap.data().creatorId !== uid) throw new Error('You can only delete your own Nax app.');
    await deleteDoc(snap.ref);
    return true;
  },
};

export default NaxAppStoreAPI;
