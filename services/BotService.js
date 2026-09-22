/**
 * NAX BOT SERVICE
 * Single source of truth for Bot Database operations.
 * Handles fetching, filtering (Public/Active), and Atomic Counters.
 */

import { db } from '../firebaseConfig'; 
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';

class BotService {
  
  constructor() {
    this.botsCollection = collection(db, 'bots');
  }

  /**
   * 🚀 GET PUBLIC BOTS (For Portal Home)
   * सिर्फ वही बॉट्स लाएगा जो Public हैं और Active हैं। 
   * Private बॉट्स पोर्टल पर कभी लीक नहीं होंगे।
   */
  async getDiscoverableBots() {
    try {
      const q = query(
        this.botsCollection, 
        where('isPublic', '==', true),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      const bots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return bots;
    } catch (error) {
      console.error("Error fetching public bots:", error);
      return [];
    }
  }

  /**
   * 🔒 GET USER'S PRIVATE BOTS
   * सिर्फ उसी यूज़र के बॉट्स लाएगा (चाहे वो प्राइवेट हों या पब्लिक)। Nax Studio के लिए।
   */
  async getUserBots(userId) {
    if (!userId) return [];
    try {
      const q = query(
        this.botsCollection, 
        where('developerId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching user bots:", error);
      return [];
    }
  }

  /**
   * 📊 ATOMIC COUNTER: INCREMENT VIEWS / USAGE
   * Race-conditions से बचने के लिए Firestore का 'increment()' इस्तेमाल किया है।
   * 1000 लोग भी एक साथ क्लिक करेंगे, तो भी क्रैश या डेटा लॉस नहीं होगा।
   */
  async recordBotUsage(botId) {
    if (!botId) return;
    try {
      const botRef = doc(db, 'bots', botId);
      // 🔥 Atomic Increment Engine
      await updateDoc(botRef, {
        usageCount: increment(1),
        weeklyViews: increment(1)
      });
      console.log(`Bot ${botId} usage recorded securely.`);
    } catch (error) {
      console.error("Error recording bot usage:", error);
    }
  }
}

// Singleton Pattern export ताकि पूरी ऐप में एक ही इंस्टेंस रहे
export default new BotService();
