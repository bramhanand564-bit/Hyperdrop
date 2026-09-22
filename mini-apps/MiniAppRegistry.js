import { db } from '../firebaseConfig';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

const MINI_APPS_COLLECTION = 'mini_apps';

/**
 * MOCK DATA: Fallback apps for testing while Firebase collection is empty
 */
const MOCK_APPS = [
  { id: '1', name: '2048 Game', desc: 'Join the numbers and get to the 2048 tile!', category: 'Games', creator: 'Gabriele Cirulli', icon: 'game-controller', color: '#FF9500', url: 'https://play2048.co/' },
  { id: '2', name: 'Scientific Calculator', desc: 'Advanced fast math calculations.', category: 'Tools', creator: 'Desmos', icon: 'calculator', color: '#34C759', url: 'https://www.desmos.com/scientific' },
  { id: '3', name: 'Web Translator', desc: 'Translate any text to different languages instantly.', category: 'Productivity', creator: 'Web Tools', icon: 'language', color: '#087EFF', url: 'https://translate.google.com/?ui=tob' },
  { id: '4', name: 'Weather Radar', desc: 'Check accurate live weather updates.', category: 'Tools', creator: 'Weather.com', icon: 'partly-sunny', color: '#32ADE6', url: 'https://weather.com/' },
];

/**
 * MiniAppRegistry
 * Handles fetching, searching, and categorizing Mini Apps from Firestore.
 */
export const MiniAppRegistry = {
  
  // 1. Fetch all published mini apps
  getAllApps: async () => {
    try {
      const q = query(collection(db, MINI_APPS_COLLECTION), where('status', '==', 'published'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return MOCK_APPS; // Fallback to mock data
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.log('Error fetching mini apps:', error);
      return MOCK_APPS; // Fallback to mock data on error
    }
  },

  // 2. Get apps by Category (e.g., 'Games', 'Tools')
  getAppsByCategory: async (categoryName) => {
    if (categoryName === 'All') return await MiniAppRegistry.getAllApps();
    
    try {
      const q = query(
        collection(db, MINI_APPS_COLLECTION), 
        where('category', '==', categoryName),
        where('status', '==', 'published')
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return MOCK_APPS.filter(app => app.category === categoryName);
      }
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.log('Error fetching category apps:', error);
      return MOCK_APPS.filter(app => app.category === categoryName);
    }
  },

  // 3. Search apps by name or description
  searchApps: async (searchQuery) => {
    const allApps = await MiniAppRegistry.getAllApps();
    if (!searchQuery) return allApps;
    
    const lowerQuery = searchQuery.toLowerCase();
    return allApps.filter(app => 
      app.name.toLowerCase().includes(lowerQuery) || 
      app.desc.toLowerCase().includes(lowerQuery)
    );
  },

  // 4. Get specific app details by its ID
  getAppById: async (appId) => {
    try {
      const appDoc = await getDoc(doc(db, MINI_APPS_COLLECTION, appId));
      if (appDoc.exists()) {
        return { id: appDoc.id, ...appDoc.data() };
      }
      return MOCK_APPS.find(a => a.id === appId) || null;
    } catch (error) {
      console.log('Error fetching single app:', error);
      return null;
    }
  }
};
