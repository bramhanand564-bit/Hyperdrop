// ==========================================
// FILE: api/MiniAppAPI.js
// ==========================================
import { auth, db } from '../firebaseConfig';
import { MiniAppFirebase } from '../firebase/miniApps';
import { doc, setDoc, serverTimestamp, increment, updateDoc, collection, getDocs, getDoc, runTransaction } from 'firebase/firestore';
import EventBus from '../event-bus/EventBus';
import { EventTypes } from '../event-bus/EventTypes';

export const MiniAppAPI = {
  
  // 1. PUBLISH (From Studio)
  publishMiniApp: async (appConfig, name, description, category) => {
    const user = auth.currentUser;
    if (!user || !user.uid) throw new Error("Authentication required.");
    if (!name || !category) throw new Error("App name and category are required.");

    const newAppSchema = {
      ownerId: user.uid,
      creatorId: user.uid,
      name: name,
      description: description || '',
      category: category,
      version: 1,
      status: 'published',
      entryType: 'declarative', // Identifies this as a safe JSON app
      color: appConfig.color || '#AF52DE',
      icon: appConfig.icon || 'apps',
      originalPrompt: appConfig.originalPrompt || '',
      components: appConfig.components || [],
      views: 0,
      installs: 0,
      rating: 0
    };

    const created = await MiniAppFirebase.createMiniApp(newAppSchema);
    EventBus.emit(EventTypes.MINIAPP_CREATED, { appId: created?.id, userId: user.uid });
    return created;
  },

  // 2. GET (For PortalHome)
  getPublicMiniApps: async () => {
    return await MiniAppFirebase.getPublicMiniApps();
  },

  getMiniApp: async (appId) => {
    if (!appId) return null;
    try {
      const snap = await getDoc(doc(db, 'mini_apps', appId));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (error) {
      console.error('MiniAppAPI.getMiniApp:', error);
      return null;
    }
  },

  // 3. SEARCH (For PortalSearch)
  searchMiniApps: async (searchQuery) => {
    const apps = await MiniAppFirebase.getPublicMiniApps();
    if (!searchQuery || searchQuery.trim() === '') return apps;
    
    const lowerQ = searchQuery.toLowerCase();
    return apps.filter(app => 
      app.name?.toLowerCase().includes(lowerQ) || 
      app.description?.toLowerCase().includes(lowerQ) ||
      app.category?.toLowerCase().includes(lowerQ)
    );
  },

  // 🚀 4. NEW: INSTALL APP (For MiniAppInstall)
  installMiniApp: async (app, grantedPermissions = null) => {
    const user = auth.currentUser;
    if (!user || !user.uid) {
      throw new Error("Please login to install apps.");
    }
    if (!app || !app.id) {
      throw new Error("Invalid app data.");
    }

    try {
      // Step A: Save to user's personal installed list
      const installRef = doc(db, 'users', user.uid, 'installed_apps', app.id);
      
      const savedData = {
        appId: app.id,
        name: app.name,
        icon: app.icon || 'apps',
        color: app.color || '#087EFF',
        url: app.url || '', // For Web Apps
        entryType: app.entryType || 'web',
        installedAt: serverTimestamp()
      };

      const requestedPermissions = Array.isArray(app.permissions) ? app.permissions : [];
      savedData.requestedPermissions = requestedPermissions;
      savedData.grantedPermissions = Array.isArray(grantedPermissions) ? grantedPermissions : requestedPermissions;
      savedData.permissionUpdatedAt = serverTimestamp();

      // If it's an AI declarative app, save the config so it loads instantly later
      if (app.entryType === 'declarative') {
        savedData.appConfig = app;
      }

      const created = await runTransaction(db, async (tx) => {
        const [installSnap, globalSnap] = await Promise.all([
          tx.get(installRef),
          tx.get(doc(db, 'mini_apps', app.id)),
        ]);

        if (installSnap.exists()) return false;
        tx.set(installRef, savedData);
        if (globalSnap.exists()) {
          tx.update(doc(db, 'mini_apps', app.id), { installs: increment(1), updatedAt: serverTimestamp() });
        }
        return true;
      });
      
      if (created) {
        EventBus.emit(EventTypes.MINIAPP_INSTALLED, { appId: app.id, userId: user.uid });
      }
      return created;
    } catch (error) {
      console.log("Install Error:", error);
      throw error;
    }
  },
  publishImportedMiniApp: async (app) => {
    const user = auth.currentUser;
    if (!user?.uid) throw new Error('Authentication required.');
    if (!app?.htmlCode) throw new Error('Imported app HTML is missing.');
    if (String(app.htmlCode).length > 900000) throw new Error('Imported app is too large for the public catalog.');

    const newAppSchema = {
      ownerId: user.uid,
      creatorId: user.uid,
      creatorName: user.displayName || user.email?.split('@')[0] || 'Nax Creator',
      name: String(app.name || 'Imported App').trim().slice(0, 80),
      description: String(app.description || 'Imported HTML mini-app').trim().slice(0, 1000),
      category: String(app.category || 'Other').trim().slice(0, 40),
      version: Number(app.version || 1),
      status: 'published',
      entryType: 'html',
      htmlCode: app.htmlCode,
      color: app.color || '#087EFF',
      icon: app.icon || 'code-slash',
      maxPlayers: Math.min(16, Math.max(2, Number(app.maxPlayers || 4))),
      permissions: Array.isArray(app.permissions) ? app.permissions : [],
      apiDomains: Array.isArray(app.apiDomains) ? app.apiDomains.slice(0, 20) : [],
      source: 'imported',
      views: 0,
      installs: 0,
      rating: 0,
    };

    const created = await MiniAppFirebase.createMiniApp(newAppSchema);
    EventBus.emit(EventTypes.MINIAPP_CREATED, { appId: created?.id, userId: user.uid, source: 'imported' });
    return created;
  },

  getInstalledApps: async () => {
    const user = auth.currentUser;
    if (!user?.uid) return [];
    const snap = await getDocs(collection(db, 'users', user.uid, 'installed_apps'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  setFavorite: async (appId, favorite = true) => {
    const user = auth.currentUser;
    if (!user?.uid || !appId) throw new Error('Authentication and app id are required.');
    await setDoc(doc(db, 'users', user.uid, 'installed_apps', appId), { favorite, updatedAt: serverTimestamp() }, { merge: true });
    return favorite;
  },

  updateMiniApp: async (appId, patch) => {
    if (!appId) throw new Error('App id is required.');
    await updateDoc(doc(db, 'mini_apps', appId), { ...patch, updatedAt: serverTimestamp(), version: increment(1) });
    EventBus.emit(EventTypes.MINIAPP_UPDATED, { appId, patch });
    return true;
  },
};
