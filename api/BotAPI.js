import { db, auth } from '../firebaseConfig';
import {
  collection, addDoc, getDocs, getDoc, doc, query, where,
  updateDoc, deleteDoc, serverTimestamp, increment
} from 'firebase/firestore';

const botsRef = collection(db, 'bots');

const normalizeBot = (id, data) => ({
  id,
  ...data,
  type: 'bot',
  entryType: 'bot',
  isPublic: data?.isPublic ?? data?.visibility === 'public',
});

export const BotAPI = {
  async searchBots(searchQuery = '') {
    try {
      const snapshot = await getDocs(botsRef);
      let bots = snapshot.docs
        .map(d => normalizeBot(d.id, d.data()))
        .filter(bot => bot.isPublic !== false && bot.status !== 'disabled');

      const q = searchQuery.trim().toLowerCase();
      if (q) {
        bots = bots.filter(bot =>
          bot.name?.toLowerCase().includes(q) ||
          bot.username?.toLowerCase().includes(q) ||
          bot.description?.toLowerCase().includes(q)
        );
      }
      return bots;
    } catch (error) {
      console.error('BotAPI.searchBots:', error);
      return [];
    }
  },

  async getBot(botId) {
    if (!botId) return null;
    const snap = await getDoc(doc(db, 'bots', botId));
    return snap.exists() ? normalizeBot(snap.id, snap.data()) : null;
  },

  async getUserBots(userId = auth?.currentUser?.uid) {
    if (!userId) return [];
    const q = query(botsRef, where('developerId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => normalizeBot(d.id, d.data()));
  },

  async isBotUsernameAvailable(username) {
    const normalized = String(username || '').trim().toLowerCase().replace(/^@/, '');
    if (!normalized) return false;
    const q = query(botsRef, where('username', '==', normalized));
    const snap = await getDocs(q);
    return snap.empty;
  },

  async createValidatedBot(userId, botData) {
    if (!userId) throw new Error('Authentication required.');
    const username = String(botData?.username || '').trim().toLowerCase().replace(/^@/, '');
    if (!username) throw new Error('Username is required.');
    if (!(await this.isBotUsernameAvailable(username))) throw new Error('Username already exists.');

    const payload = {
      ...botData,
      username,
      developerId: userId,
      ownerId: userId,
      visibility: botData.visibility || 'private',
      isPublic: botData.visibility === 'public',
      status: 'active',
      enabled: true,
      commands: Array.isArray(botData.commands) ? botData.commands : [],
      buttons: Array.isArray(botData.buttons) ? botData.buttons : [],
      usageCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const created = await addDoc(botsRef, payload);
    return { id: created.id, ...payload };
  },

  async updateValidatedBot(botId, updates) {
    if (!botId) throw new Error('Bot id is required.');
    const ref = doc(db, 'bots', botId);
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
    return this.getBot(botId);
  },

  async deleteBot(botId) {
    if (!botId) throw new Error('Bot id is required.');
    await deleteDoc(doc(db, 'bots', botId));
    return true;
  },

  async recordBotUsage(botId) {
    if (!botId) return false;
    await updateDoc(doc(db, 'bots', botId), {
      usageCount: increment(1),
      weeklyViews: increment(1),
      updatedAt: serverTimestamp(),
    });
    return true;
  },
};

export const getBot = BotAPI.getBot.bind(BotAPI);
export const isBotUsernameAvailable = BotAPI.isBotUsernameAvailable.bind(BotAPI);
export const createValidatedBot = BotAPI.createValidatedBot.bind(BotAPI);
export const updateValidatedBot = BotAPI.updateValidatedBot.bind(BotAPI);
export const deleteBot = BotAPI.deleteBot.bind(BotAPI);
export default BotAPI;
