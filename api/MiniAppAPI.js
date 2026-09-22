// ==========================================
// FILE: api/MiniAppAPI.js
// ==========================================
import { auth, db } from '../firebaseConfig';
import { MiniAppFirebase } from '../firebase/miniApps';
import { doc, setDoc, serverTimestamp, increment, updateDoc } from 'firebase/firestore';

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

    return await MiniAppFirebase.createMiniApp(newAppSchema);
  },

  // 2. GET (For PortalHome)
  getPublicMiniApps: async () => {
    return await MiniAppFirebase.getPublicMiniApps();
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
  installMiniApp: async (app) => {
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

      // If it's an AI declarative app, save the config so it loads instantly later
      if (app.entryType === 'declarative') {
        savedData.appConfig = app;
      }

      await setDoc(installRef, savedData);

      // Step B: Increment global install count for the app (Trending logic)
      const globalAppRef = doc(db, 'mini_apps', app.id);
      await updateDoc(globalAppRef, {
        installs: increment(1)
      }).catch(e => console.log("Silent error updating global install count:", e));

      return true;
    } catch (error) {
      console.log("Install Error:", error);
      throw error;
    }
  }
};
