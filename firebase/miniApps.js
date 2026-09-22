// ==========================================
// FILE: firebase/miniApps.js
// ==========================================
import { db } from '../firebaseConfig'; // 🐛 FIX: Changed './' to '../'
import { 
  collection, doc, setDoc, getDocs, query, where, serverTimestamp 
} from 'firebase/firestore';

export const MiniAppFirebase = {
  // 1. Create a new Mini App in Firestore
  createMiniApp: async (appData) => {
    const appRef = doc(collection(db, 'mini_apps'));
    
    // Merge generated ID and Server Timestamp safely
    const finalData = {
      ...appData,
      id: appRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(appRef, finalData);
    return finalData;
  },

  // 2. Fetch all public/published Mini Apps
  getPublicMiniApps: async () => {
    try {
      const q = query(collection(db, 'mini_apps'), where('status', '==', 'published'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return [];
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.log('Error fetching mini apps from Firestore:', error);
      throw error;
    }
  }
};
