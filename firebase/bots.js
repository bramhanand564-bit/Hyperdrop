import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../firebaseConfig';

const BOTS_COLLECTION = 'bots';

/**
 * Nax Bot Data Layer
 *
 * IMPORTANT:
 * This file ONLY handles Firestore operations.
 *
 * UI logic:
 *      screens/
 *
 * Bot API:
 *      api/
 *
 * Bot execution:
 *      bot-runtime/
 *
 * Security:
 *      security/
 *
 * Keep this file focused on Firebase data access.
 */

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

const normalizeUsername = (username = '') => {
  return username.trim().replace(/^@/, '').toLowerCase();
};

const normalizeBotData = (bot = {}) => {
  return {
    id: bot.id || '',
    ownerId: bot.ownerId || '',
    name: bot.name || '',
    username: bot.username || '',
    description: bot.description || '',
    welcomeMessage: bot.welcomeMessage || '',
    avatar: bot.avatar || '',
    category: bot.category || 'utility',
    status: bot.status || 'active',
    visibility: bot.visibility || 'public',
    type: bot.type || 'custom',
    version: bot.version || '1.0.0',
    commands: Array.isArray(bot.commands) ? bot.commands : [],
    buttons: Array.isArray(bot.buttons) ? bot.buttons : [],
    permissions: Array.isArray(bot.permissions) ? bot.permissions : [],
    installs: Number(bot.installs || 0),
    views: Number(bot.views || 0),
    usageCount: Number(bot.usageCount || 0),
    rating: Number(bot.rating || 0),
    ratingCount: Number(bot.ratingCount || 0),
    createdAt: bot.createdAt || null,
    updatedAt: bot.updatedAt || null,
  };
};

/* -------------------------------------------------------
   CREATE
------------------------------------------------------- */

/**
 * Create a new bot.
 *
 * @param {string} ownerId
 * @param {object} botData
 * @returns {Promise<object>}
 */
export const createBot = async (ownerId, botData = {}) => {
  if (!ownerId) {
    throw new Error('ownerId is required.');
  }

  const name = String(botData.name || '').trim();
  const username = normalizeUsername(botData.username);

  if (!name) {
    throw new Error('Bot name is required.');
  }

  if (!username) {
    throw new Error('Bot username is required.');
  }

  const usernameAvailable = await isBotUsernameAvailable(username);

  if (!usernameAvailable) {
    throw new Error(`@${username} is already taken.`);
  }

  const payload = {
    ownerId,

    name,

    username,

    description: String(
      botData.description || ''
    ).trim(),

    welcomeMessage: String(
      botData.welcomeMessage || 'Hello! How can I help you?'
    ).trim(),

    avatar: String(
      botData.avatar || ''
    ).trim(),

    category: botData.category || 'utility',

    status: 'active',

    visibility: botData.visibility || 'public',

    type: botData.type || 'custom',

    version: botData.version || '1.0.0',

    commands: Array.isArray(botData.commands)
      ? botData.commands
      : [],

    buttons: Array.isArray(botData.buttons)
      ? botData.buttons
      : [],

    permissions: Array.isArray(botData.permissions)
      ? botData.permissions
      : [],

    installs: 0,

    views: 0,

    usageCount: 0,

    rating: 0,

    ratingCount: 0,

    createdAt: serverTimestamp(),

    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, BOTS_COLLECTION),
    payload
  );

  return {
    id: ref.id,
    ...payload,
  };
};

/* -------------------------------------------------------
   READ
------------------------------------------------------- */

/**
 * Get a bot by Firebase document ID.
 */
export const getBotById = async (botId) => {
  if (!botId) {
    return null;
  }

  const ref = doc(
    db,
    BOTS_COLLECTION,
    botId
  );

  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeBotData({
    id: snapshot.id,
    ...snapshot.data(),
  });
};

/**
 * Get bot by username.
 *
 * Accepts:
 *   translator_bot
 *
 * or:
 *   @translator_bot
 */
export const getBotByUsername = async (username) => {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    return null;
  }

  const q = query(
    collection(db, BOTS_COLLECTION),
    where('username', '==', normalizedUsername),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const botDoc = snapshot.docs[0];

  return normalizeBotData({
    id: botDoc.id,
    ...botDoc.data(),
  });
};

/**
 * Get all bots owned by a user.
 */
export const getUserBots = async (ownerId) => {
  if (!ownerId) {
    return [];
  }

  const q = query(
    collection(db, BOTS_COLLECTION),
    where('ownerId', '==', ownerId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) =>
    normalizeBotData({
      id: item.id,
      ...item.data(),
    })
  );
};

/**
 * Get public bots.
 *
 * Used later by Portal discovery.
 */
export const getPublicBots = async (maxResults = 50) => {
  const safeLimit = Math.max(
    1,
    Math.min(Number(maxResults) || 50, 100)
  );

  const q = query(
    collection(db, BOTS_COLLECTION),
    where('visibility', '==', 'public'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(safeLimit)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) =>
    normalizeBotData({
      id: item.id,
      ...item.data(),
    })
  );
};

/**
 * Get bots by category.
 */
export const getBotsByCategory = async (
  category,
  maxResults = 50
) => {
  if (!category) {
    return [];
  }

  const safeLimit = Math.max(
    1,
    Math.min(Number(maxResults) || 50, 100)
  );

  const q = query(
    collection(db, BOTS_COLLECTION),
    where('category', '==', category),
    where('visibility', '==', 'public'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(safeLimit)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) =>
    normalizeBotData({
      id: item.id,
      ...item.data(),
    })
  );
};

/* -------------------------------------------------------
   SEARCH
------------------------------------------------------- */

/**
 * Basic username search.
 *
 * Firestore does not provide full-text search.
 * This function is intentionally simple for Phase 1.
 *
 * A dedicated search service can be added later.
 */
export const searchBotsByUsername = async (
  username
) => {
  const bot = await getBotByUsername(username);

  return bot ? [bot] : [];
};

/**
 * Search public bots from already-fetched data.
 *
 * This helper can be used by Portal UI without
 * performing a Firebase request for every keystroke.
 */
export const filterBotsLocally = (
  bots = [],
  searchText = ''
) => {
  const search = String(searchText)
    .trim()
    .toLowerCase();

  if (!search) {
    return bots;
  }

  return bots.filter((bot) => {
    const name = String(bot.name || '').toLowerCase();

    const username = String(
      bot.username || ''
    ).toLowerCase();

    const description = String(
      bot.description || ''
    ).toLowerCase();

    return (
      name.includes(search) ||
      username.includes(search) ||
      description.includes(search)
    );
  });
};

/* -------------------------------------------------------
   UPDATE
------------------------------------------------------- */

/**
 * Update bot profile/configuration.
 */
export const updateBot = async (
  botId,
  updates = {}
) => {
  if (!botId) {
    throw new Error('botId is required.');
  }

  const safeUpdates = {};

  const allowedFields = [
    'name',
    'description',
    'welcomeMessage',
    'avatar',
    'category',
    'status',
    'visibility',
    'version',
    'commands',
    'buttons',
    'permissions',
  ];

  allowedFields.forEach((field) => {
    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        field
      )
    ) {
      safeUpdates[field] = updates[field];
    }
  });

  if (
    Object.prototype.hasOwnProperty.call(
      safeUpdates,
      'name'
    )
  ) {
    safeUpdates.name = String(
      safeUpdates.name || ''
    ).trim();

    if (!safeUpdates.name) {
      throw new Error('Bot name cannot be empty.');
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      safeUpdates,
      'commands'
    ) &&
    !Array.isArray(safeUpdates.commands)
  ) {
    throw new Error('commands must be an array.');
  }

  if (
    Object.prototype.hasOwnProperty.call(
      safeUpdates,
      'buttons'
    ) &&
    !Array.isArray(safeUpdates.buttons)
  ) {
    throw new Error('buttons must be an array.');
  }

  if (
    Object.prototype.hasOwnProperty.call(
      safeUpdates,
      'permissions'
    ) &&
    !Array.isArray(safeUpdates.permissions)
  ) {
    throw new Error('permissions must be an array.');
  }

  safeUpdates.updatedAt = serverTimestamp();

  const ref = doc(
    db,
    BOTS_COLLECTION,
    botId
  );

  await updateDoc(
    ref,
    safeUpdates
  );

  return getBotById(botId);
};

/* -------------------------------------------------------
   DELETE
------------------------------------------------------- */

/**
 * Delete a bot.
 *
 * Actual authorization must also be enforced
 * by Firestore Security Rules.
 */
export const deleteBot = async (botId) => {
  if (!botId) {
    throw new Error('botId is required.');
  }

  const ref = doc(
    db,
    BOTS_COLLECTION,
    botId
  );

  await deleteDoc(ref);

  return true;
};

/* -------------------------------------------------------
   USERNAME
------------------------------------------------------- */

/**
 * Check whether a bot username is available.
 */
export const isBotUsernameAvailable = async (
  username
) => {
  const normalizedUsername =
    normalizeUsername(username);

  if (!normalizedUsername) {
    return false;
  }

  const q = query(
    collection(db, BOTS_COLLECTION),
    where(
      'username',
      '==',
      normalizedUsername
    ),
    limit(1)
  );

  const snapshot = await getDocs(q);

  return snapshot.empty;
};

/* -------------------------------------------------------
   STATS
------------------------------------------------------- */

/**
 * Increment bot view count.
 *
 * NOTE:
 * For production, this should eventually move
 * to a trusted backend/Cloud Function to prevent abuse.
 */
export const incrementBotViews = async (
  botId
) => {
  const bot = await getBotById(botId);

  if (!bot) {
    return null;
  }

  const ref = doc(
    db,
    BOTS_COLLECTION,
    botId
  );

  await updateDoc(ref, {
    views: Number(bot.views || 0) + 1,
    updatedAt: serverTimestamp(),
  });

  return true;
};

/**
 * Increment bot usage count.
 */
export const incrementBotUsage = async (
  botId
) => {
  const bot = await getBotById(botId);

  if (!bot) {
    return null;
  }

  const ref = doc(
    db,
    BOTS_COLLECTION,
    botId
  );

  await updateDoc(ref, {
    usageCount:
      Number(bot.usageCount || 0) + 1,

    updatedAt: serverTimestamp(),
  });

  return true;
};

/**
 * Increment installation count.
 */
export const incrementBotInstalls = async (
  botId
) => {
  const bot = await getBotById(botId);

  if (!bot) {
    return null;
  }

  const ref = doc(
    db,
    BOTS_COLLECTION,
    botId
  );

  await updateDoc(ref, {
    installs:
      Number(bot.installs || 0) + 1,

    updatedAt: serverTimestamp(),
  });

  return true;
};

/* -------------------------------------------------------
   EXPORT OBJECT
------------------------------------------------------- */

export const BotFirebase = {
  createBot,

  getBotById,

  getBotByUsername,

  getUserBots,

  getPublicBots,

  getBotsByCategory,

  searchBotsByUsername,

  filterBotsLocally,

  updateBot,

  deleteBot,

  isBotUsernameAvailable,

  incrementBotViews,

  incrementBotUsage,

  incrementBotInstalls,
};

export default BotFirebase;
