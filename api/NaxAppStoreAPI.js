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

const PRIMARY_COLLECTION = 'nax_apps';
const COMPAT_COLLECTION = 'mini_apps';
const publicRef = collection(db, PRIMARY_COLLECTION);
const compatRef = collection(db, COMPAT_COLLECTION);
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
  category: data.category || 'apps',
  html: data.html || '',
  version: Number(data.version || 1),
  category: data.category || 'apps',
  createdAt: data.createdAt || null,
  updatedAt: data.updatedAt || null,
});

const sizeOf = value => String(value || '').length * 2;

const NaxAppStoreAPI = {
  async list({ search = '', limitCount = 60 } = {}) {
    const cap = Math.min(100, Math.max(1, Number(limitCount) || 60));
    const q = String(search || '').trim().toLowerCase();
    let snap;
    try {
      snap = await getDocs(query(publicRef, where('status', '==', 'published'), limit(cap)));
    } catch (_) {
      snap = await getDocs(query(compatRef, where('storeKind', '==', 'nax_app'), limit(cap)));
    }
    return snap.docs
      .map(d => normalize(d.id, d.data()))
      .filter(app => app.status === 'published')
      .filter(app => !q || [app.name, app.description, app.creatorName].some(v => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => {
        const ta = a.updatedAt?.toMillis?.() || a.updatedAt || 0;
        const tb = b.updatedAt?.toMillis?.() || b.updatedAt || 0;
        return tb - ta;
      });
  },

  async listMine({ limitCount = 60 } = {}) {
    const uid = requireUser();
    const cap = Math.min(100, Math.max(1, Number(limitCount) || 60));
    let snap;
    try {
      snap = await getDocs(query(publicRef, where('creatorId', '==', uid), limit(cap)));
    } catch (_) {
      snap = await getDocs(query(compatRef, where('storeKind', '==', 'nax_app'), limit(cap)));
      snap = { docs: snap.docs.filter(d => d.data().creatorId === uid) };
    }
    return snap.docs.map(d => normalize(d.id, d.data())).sort((a, b) => {
      const ta = a.updatedAt?.toMillis?.() || a.updatedAt || 0;
      const tb = b.updatedAt?.toMillis?.() || b.updatedAt || 0;
      return tb - ta;
    });
  },

  async get(id) {
    if (!id) return null;
    try {
      const snap = await getDoc(doc(db, PRIMARY_COLLECTION, id));
      if (snap.exists()) return normalize(snap.id, snap.data());
    } catch (_) {}
    const compat = await getDoc(doc(db, COMPAT_COLLECTION, id));
    return compat.exists() && compat.data().storeKind === 'nax_app' ? normalize(compat.id, compat.data()) : null;
  },

  async publish(project, input = {}) {
    const uid = requireUser();
    if (!project || project.target !== 'SINGLE_HTML') throw new Error('Only Single HTML apps can be published to Nax Store right now.');
    const html = String(project.html || project.files?.['index.html'] || '').trim();
    if (!html) throw new Error('Your app has no index.html to publish.');
    if (sizeOf(html) > MAX_HTML_BYTES) throw new Error('This app is too large for the current Nax Store publisher. Keep the HTML under 850 KB.');

    const id = input.id || doc(publicRef).id;
    const payload = {
      name: String(project.name || 'Nax App').trim().slice(0, 80),
      description: String(input.description ?? project.memory?.summary ?? '').trim().slice(0, 500),
      icon: String(input.icon || '🚀').slice(0, 8),
      category: String(input.category || project.category || 'apps').toLowerCase().slice(0, 30),
      category: String(input.category || 'apps').toLowerCase().slice(0, 20),
      creatorId: uid,
      creatorName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Creator',
      status: 'published',
      html,
      version: Number(project.versions?.[project.versions.length - 1]?.version || project.version || 1),
      updatedAt: serverTimestamp(),
      naxStoreVersion: 1,
      ...(input.id ? {} : { createdAt: serverTimestamp() }),
    };

    try {
      const existing = input.id ? await getDoc(doc(publicRef, input.id)) : null;
      if (existing?.exists() && existing.data().creatorId !== uid) throw new Error('You can only update your own Nax app.');
      await setDoc(doc(publicRef, id), payload, { merge: true });
      return { id, ...payload, link: 'nax://app/' + id };
    } catch (primaryError) {
      if (primaryError?.message === 'You can only update your own Nax app.') throw primaryError;
      const compatPayload = { ...payload, storeKind: 'nax_app', createdAt: payload.createdAt || serverTimestamp() };
      try {
        const existing = input.id ? await getDoc(doc(compatRef, id)) : null;
        if (existing?.exists() && existing.data().creatorId !== uid) throw new Error('You can only update your own Nax app.');
        await setDoc(doc(compatRef, id), compatPayload, { merge: true });
        return { id, ...compatPayload, link: 'nax://app/' + id, storage: 'compat' };
      } catch (fallbackError) {
        throw new Error('Nax Store publishing failed. Your account may not have permission to publish apps yet.');
      }
    }
  },

  async unpublish(id) {
    const uid = requireUser();
    let snap = await getDoc(doc(db, PRIMARY_COLLECTION, id)).catch(() => null);
    if (!snap?.exists()) snap = await getDoc(doc(db, COMPAT_COLLECTION, id));
    if (!snap.exists()) return false;
    if (snap.data().creatorId !== uid) throw new Error('You can only unpublish your own Nax app.');
    await updateDoc(snap.ref, { status: 'disabled', updatedAt: serverTimestamp() });
    return true;
  },

  async remove(id) {
    const uid = requireUser();
    let snap = await getDoc(doc(db, PRIMARY_COLLECTION, id)).catch(() => null);
    if (!snap?.exists()) snap = await getDoc(doc(db, COMPAT_COLLECTION, id));
    if (!snap.exists()) return false;
    if (snap.data().creatorId !== uid) throw new Error('You can only delete your own Nax app.');
    await deleteDoc(snap.ref);
    return true;
  },
};

export default NaxAppStoreAPI;
