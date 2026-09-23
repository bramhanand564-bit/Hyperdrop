// api/PortalStoreAPI.js
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, getDocs, getDoc, doc, query, where, orderBy, serverTimestamp, updateDoc, increment } from 'firebase/firestore';

const storeRef = collection(db, 'portalStore');

function normalize(id, data = {}) {
  return { id, ...data, entryType: data.entryType || data.type || 'miniapp', status: data.status || 'published' };
}

const PortalStoreAPI = {
  async list({ category = '', search = '' } = {}) {
    const snap = await getDocs(query(storeRef, orderBy('createdAt', 'desc')));
    let items = snap.docs.map(d => normalize(d.id, d.data())).filter(item => item.status !== 'disabled');
    const q = String(search || '').trim().toLowerCase();
    if (category) items = items.filter(item => item.category === category);
    if (q) items = items.filter(item => [item.name, item.description, item.category, item.creatorName].some(v => String(v || '').toLowerCase().includes(q)));
    return items;
  },

  async get(id) {
    const snap = await getDoc(doc(db, 'portalStore', id));
    return snap.exists() ? normalize(snap.id, snap.data()) : null;
  },

  async add(input) {
    const uid = auth?.currentUser?.uid;
    if (!uid) throw new Error('Authentication required.');
    const payload = {
      name: String(input?.name || '').trim().slice(0, 80),
      description: String(input?.description || '').trim().slice(0, 1000),
      category: String(input?.category || 'Utility').trim().slice(0, 40),
      url: String(input?.url || '').trim(),
      iconUrl: String(input?.iconUrl || '').trim(),
      entryType: String(input?.entryType || 'miniapp'),
      creatorId: uid,
      creatorName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Creator',
      status: 'published',
      featured: false,
      views: 0,
      installs: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (!payload.name || !payload.url || !payload.description) throw new Error('Name, URL and description are required.');
    const created = await addDoc(storeRef, payload);
    return { id: created.id, ...payload };
  },

  async recordView(id) {
    if (!id) return false;
    await updateDoc(doc(db, 'portalStore', id), { views: increment(1) });
    return true;
  },

  async recordInstall(id) {
    if (!id) return false;
    await updateDoc(doc(db, 'portalStore', id), { installs: increment(1) });
    return true;
  },
};

export default PortalStoreAPI;
export { PortalStoreAPI };
