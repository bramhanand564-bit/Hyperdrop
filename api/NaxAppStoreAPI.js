import { app, auth, db } from '../firebaseConfig';
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
  writeBatch,
  where,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';

const storage = getStorage(app);

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
  title: data.title || data.name || 'Untitled App',
  description: data.description || '',
  icon: data.icon || '🚀',
  iconUrl: data.iconUrl || '',
  screenshots: Array.isArray(data.screenshots) ? data.screenshots : [],
  creatorId: data.creatorId || '',
  creatorName: data.creatorName || 'Creator',
  status: data.status || 'published',
  category: data.category || 'apps',
  html: data.html || '',
  version: Number(data.version || 1),
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
      if (snap.exists()) {
        const normalized = normalize(snap.id, snap.data());
        const mediaSnap = await getDocs(collection(db, PRIMARY_COLLECTION, id, 'media')).catch(() => ({ docs: [] }));
        const media = mediaSnap.docs.map(item => item.data()).filter(item => item.kind === 'screenshot').sort((a, b) => (a.index || 0) - (b.index || 0));
        const iconMedia = mediaSnap.docs.find(item => item.data().kind === 'icon')?.data();
        return {
          ...normalized,
          screenshots: media.map(item => item.dataUrl).filter(Boolean),
          iconUrl: normalized.iconUrl || iconMedia?.dataUrl || '',
        };
      }
    } catch (_) {}
    const compat = await getDoc(doc(db, COMPAT_COLLECTION, id));
    return compat.exists() && compat.data().storeKind === 'nax_app' ? normalize(compat.id, compat.data()) : null;
  },

  async uploadImage({ appId, uri, kind = 'screenshot', index = 0 } = {}) {
    requireUser();
    if (!appId || !uri) throw new Error('Missing image information.');
    const ImageManipulator = await import('expo-image-manipulator');
    const isIcon = kind === 'icon';
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: isIcon ? 256 : 720 } }],
      { compress: isIcon ? 0.72 : 0.58, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (!result.base64) throw new Error('Could not prepare image.');
    // React Native's Firebase Web SDK can fail when it tries to construct Blob
    // objects from ArrayBuffer/ArrayBufferView. Keep media as compact data URLs
    // in dedicated Firestore documents instead of using the Blob upload path.
    return `data:image/jpeg;base64,${result.base64}`;
  },

  async publish(project, input = {}) {
    const uid = requireUser();
    if (!project || project.target !== 'SINGLE_HTML') throw new Error('Only Single HTML apps can be published to Nax Store right now.');
    const html = String(
      project.html ||
      project.files?.['index.html'] ||
      project.files?.['src/index.html'] ||
      ''
    ).trim();
    if (!html) throw new Error('Your app has no index.html to publish.');
    if (sizeOf(html) > MAX_HTML_BYTES) throw new Error('This app is too large for the current Nax Store publisher. Keep the HTML under 850 KB.');

    const id = input.id || doc(publicRef).id;
    const payload = {
      name: String(input.name ?? project.name ?? 'Nax App').trim().slice(0, 80),
      title: String(input.title ?? input.name ?? project.name ?? 'Nax App').trim().slice(0, 100),
      description: String(input.description ?? project.memory?.summary ?? '').trim().slice(0, 500),
      icon: String(input.icon || '🚀').slice(0, 8),
      iconUrl: String(input.iconUrl || '').slice(0, 2000),
      screenshots: [],
      category: String(input.category || project.category || 'apps').toLowerCase().slice(0, 20),
      creatorId: uid,
      creatorName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Creator',
      status: 'published',
      html,
      version: Number(input.version || project.versions?.[project.versions.length - 1]?.version || project.version || 1),
      updatedAt: serverTimestamp(),
      naxStoreVersion: 1,
      ...(input.id ? {} : { createdAt: serverTimestamp() }),
    };

    try {
      const existing = input.id ? await getDoc(doc(publicRef, input.id)) : null;
      if (existing?.exists() && existing.data().creatorId !== uid) throw new Error('You can only update your own Nax app.');
      await setDoc(doc(publicRef, id), payload, { merge: true });
      const media = Array.isArray(input.screenshots) ? input.screenshots.slice(0, 6) : [];
      const mediaBatch = writeBatch(db);
      media.forEach((value, index) => {
        if (!String(value || '').startsWith('data:image/')) return;
        mediaBatch.set(doc(db, PRIMARY_COLLECTION, id, 'media', 'screenshot-' + index), {
          kind: 'screenshot',
          index,
          dataUrl: String(value),
          updatedAt: serverTimestamp(),
        });
      });
      if (input.iconUrl && String(input.iconUrl).startsWith('data:image/')) {
        mediaBatch.set(doc(db, PRIMARY_COLLECTION, id, 'media', 'icon'), {
          kind: 'icon',
          dataUrl: String(input.iconUrl),
          updatedAt: serverTimestamp(),
        });
      }
      await mediaBatch.commit();
      return { id, ...payload, screenshots: media.map((_, index) => 'nax-media://' + id + '/screenshot-' + index), iconUrl: input.iconUrl || '', link: 'nax://app/' + id };
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
