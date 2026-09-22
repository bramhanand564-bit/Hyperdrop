// ==========================================
// FILE: api/BotAPI.js
// ==========================================
import { db } from '../firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

export const BotAPI = {
  // Fetch & Search Public Bots
  searchBots: async (searchQuery) => {
    try {
      // Assuming bots have an 'isPublic' or similar flag. If not, just fetch all for now.
      const q = query(collection(db, 'bots')); // Add where('isPublic', '==', true) if configured
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return [];
      
      let bots = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        type: 'Bot',           // Force type for PortalCard router
        entryType: 'bot'       // Force entryType for PortalCard router
      }));

      // Filter based on search query
      if (searchQuery && searchQuery.trim() !== '') {
        const lowerQ = searchQuery.toLowerCase();
        bots = bots.filter(bot => 
          bot.name?.toLowerCase().includes(lowerQ) || 
          bot.username?.toLowerCase().includes(lowerQ)
        );
      }
      return bots;
    } catch (error) {
      console.log('Error fetching bots for search:', error);
      return [];
    }
  }
};
