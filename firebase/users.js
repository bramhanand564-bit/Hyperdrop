// firebase/users.js

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import {
  updateProfile,
} from 'firebase/auth';

import { db } from '../firebaseConfig';

const USERS_COLLECTION = 'users';

/**
 * Normalize user data before returning it.
 */
function normalizeUserData(id, data = {}) {
  return {
    id,

    uid: data.uid || id,

    displayName: data.displayName || '',
    username: data.username || '',
    email: data.email || '',

    photoURL: data.photoURL || '',
    bio: data.bio || '',

    /**
     * Basic profile information.
     */
    firstName: data.firstName || '',
    lastName: data.lastName || '',

    /**
     * App ecosystem information.
     */
    role: data.role || 'user',

    isCreator: Boolean(data.isCreator),
    isVerified: Boolean(data.isVerified),

    /**
     * Portal / bot / mini-app counters.
     */
    botCount: Number(data.botCount || 0),
    miniAppCount: Number(data.miniAppCount || 0),

    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,

    ...data,

    id,
    uid: data.uid || id,
  };
}

/**
 * Get user profile by UID.
 */
export async function getUserById(uid) {
  if (!uid) {
    throw new Error('User ID is required.');
  }

  const ref = doc(db, USERS_COLLECTION, uid);

  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeUserData(
    snapshot.id,
    snapshot.data()
  );
}

/**
 * Alias for getUserById.
 */
export async function getUserProfile(uid) {
  return getUserById(uid);
}

/**
 * Create or update a user profile.
 *
 * setDoc(..., { merge: true }) prevents existing
 * fields from being accidentally deleted.
 */
export async function createUserProfile({
  uid,
  displayName = '',
  username = '',
  email = '',
  photoURL = '',
  bio = '',
  firstName = '',
  lastName = '',
  role = 'user',
}) {
  if (!uid) {
    throw new Error('User ID is required.');
  }

  const ref = doc(db, USERS_COLLECTION, uid);

  const existing = await getDoc(ref);

  const userData = {
    uid,

    displayName: String(displayName || '').trim(),
    username: String(username || '').trim(),
    email: String(email || '').trim(),

    photoURL: String(photoURL || '').trim(),
    bio: String(bio || '').trim(),

    firstName: String(firstName || '').trim(),
    lastName: String(lastName || '').trim(),

    role: role || 'user',

    updatedAt: serverTimestamp(),
  };

  if (!existing.exists()) {
    userData.createdAt = serverTimestamp();
    userData.isCreator = false;
    userData.isVerified = false;

    userData.botCount = 0;
    userData.miniAppCount = 0;
  }

  await setDoc(ref, userData, {
    merge: true,
  });

  return getUserById(uid);
}

/**
 * Update user profile.
 */
export async function updateUserProfile(
  uid,
  updates = {}
) {
  if (!uid) {
    throw new Error('User ID is required.');
  }

  const cleanUpdates = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  const allowedFields = [
    'displayName',
    'username',
    'email',
    'photoURL',
    'bio',
    'firstName',
    'lastName',
    'role',
    'isCreator',
  ];

  Object.keys(cleanUpdates).forEach((key) => {
    if (
      key !== 'updatedAt' &&
      !allowedFields.includes(key)
    ) {
      delete cleanUpdates[key];
    }
  });

  const ref = doc(db, USERS_COLLECTION, uid);

  await updateDoc(ref, cleanUpdates);

  return getUserById(uid);
}

/**
 * Update display name.
 */
export async function updateDisplayName(
  uid,
  displayName
) {
  if (!uid) {
    throw new Error('User ID is required.');
  }

  const value = String(displayName || '').trim();

  if (!value) {
    throw new Error('Display name is required.');
  }

  return updateUserProfile(uid, {
    displayName: value,
  });
}

/**
 * Update username.
 *
 * Username uniqueness should eventually be enforced
 * using a dedicated usernames collection or Cloud Function.
 */
export async function updateUsername(
  uid,
  username
) {
  if (!uid) {
    throw new Error('User ID is required.');
  }

  const normalizedUsername = String(username || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');

  if (!normalizedUsername) {
    throw new Error('Username is required.');
  }

  if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
    throw new Error(
      'Username must be 3-30 characters and use only letters, numbers, or _.'
    );
  }

  return updateUserProfile(uid, {
    username: normalizedUsername,
  });
}

/**
 * Update profile photo URL.
 */
export async function updatePhotoURL(
  uid,
  photoURL
) {
  if (!uid) {
    throw new Error('User ID is required.');
  }

  return updateUserProfile(uid, {
    photoURL: String(photoURL || '').trim(),
  });
}

/**
 * Update bio.
 */
export async function updateBio(uid, bio) {
  if (!uid) {
    throw new Error('User ID is required.');
  }

  const value = String(bio || '').trim();

  if (value.length > 500) {
    throw new Error(
      'Bio cannot be longer than 500 characters.'
    );
  }

  return updateUserProfile(uid, {
    bio: value,
  });
}

/**
 * Update Firebase Auth display name/photo.
 *
 * Firestore profile and Firebase Auth profile are
 * separate systems, so this helper keeps both in sync.
 */
export async function syncAuthProfile(
  authUser,
  {
    displayName,
    photoURL,
  } = {}
) {
  if (!authUser) {
    throw new Error('Authenticated user is required.');
  }

  const profileUpdates = {};

  if (typeof displayName === 'string') {
    profileUpdates.displayName =
      displayName.trim();
  }

  if (typeof photoURL === 'string') {
    profileUpdates.photoURL =
      photoURL.trim();
  }

  if (Object.keys(profileUpdates).length === 0) {
    return authUser;
  }

  await updateProfile(
    authUser,
    profileUpdates
  );

  return authUser;
}

/**
 * Create Firestore profile from Firebase Auth user.
 *
 * Useful immediately after signup/login.
 */
export async function createProfileFromAuthUser(
  authUser
) {
  if (!authUser?.uid) {
    throw new Error(
      'Valid Firebase Auth user is required.'
    );
  }

  return createUserProfile({
    uid: authUser.uid,

    displayName:
      authUser.displayName || '',

    email:
      authUser.email || '',

    photoURL:
      authUser.photoURL || '',
  });
}

/**
 * Mark user as a creator.
 */
export async function setCreatorStatus(
  uid,
  isCreator = true
) {
  if (!uid) {
    throw new Error('User ID is required.');
  }

  return updateUserProfile(uid, {
    isCreator: Boolean(isCreator),
  });
}

/**
 * Update bot count.
 *
 * This should eventually be controlled by trusted
 * backend logic rather than arbitrary client writes.
 */
export async function updateBotCount(
  uid,
  botCount
) {
  if (!uid) {
    throw new Error('User ID is required.');
  }

  const value = Math.max(
    0,
    Number(botCount || 0)
  );

  return updateUserProfile(uid, {
    botCount: value,
  });
}

/**
 * Update mini-app count.
 */
export async function updateMiniAppCount(
  uid,
  miniAppCount
) {
  if (!uid) {
    throw new Error('User ID is required.');
  }

  const value = Math.max(
    0,
    Number(miniAppCount || 0)
  );

  return updateUserProfile(uid, {
    miniAppCount: value,
  });
}

/**
 * Increment bot count.
 *
 * Kept separate so runtime/API layers can migrate
 * to trusted atomic operations later.
 */
export async function incrementBotCount(
  uid,
  amount = 1
) {
  const user = await getUserById(uid);

  if (!user) {
    throw new Error('User profile not found.');
  }

  return updateBotCount(
    uid,
    user.botCount + Number(amount || 0)
  );
}

/**
 * Increment mini-app count.
 */
export async function incrementMiniAppCount(
  uid,
  amount = 1
) {
  const user = await getUserById(uid);

  if (!user) {
    throw new Error('User profile not found.');
  }

  return updateMiniAppCount(
    uid,
    user.miniAppCount + Number(amount || 0)
  );
}

/**
 * Get a safe public profile.
 *
 * Do not expose private account information through
 * public profile UI.
 */
export function getPublicUserProfile(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    uid: user.uid,

    displayName: user.displayName || '',
    username: user.username || '',

    photoURL: user.photoURL || '',
    bio: user.bio || '',

    isCreator: Boolean(user.isCreator),
    isVerified: Boolean(user.isVerified),

    botCount: Number(user.botCount || 0),
    miniAppCount: Number(user.miniAppCount || 0),
  };
}

/**
 * Check whether a username has the correct format.
 */
export function isValidUsername(username) {
  const normalized = String(username || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');

  return /^[a-z0-9_]{3,30}$/.test(
    normalized
  );
}

/**
 * Normalize username for display/storage.
 */
export function normalizeUsername(username) {
  return String(username || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
}

/**
 * Build a display name from available fields.
 */
export function getUserDisplayName(user) {
  if (!user) {
    return 'User';
  }

  if (user.displayName?.trim()) {
    return user.displayName.trim();
  }

  const fullName = [
    user.firstName,
    user.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (fullName) {
    return fullName;
  }

  if (user.username?.trim()) {
    return `@${normalizeUsername(
      user.username
    )}`;
  }

  return 'User';
}

/**
 * Firebase Users API.
 */
export const UserFirebase = {
  getUserById,
  getUserProfile,

  createUserProfile,
  updateUserProfile,

  updateDisplayName,
  updateUsername,
  updatePhotoURL,
  updateBio,

  syncAuthProfile,
  createProfileFromAuthUser,

  setCreatorStatus,

  updateBotCount,
  updateMiniAppCount,

  incrementBotCount,
  incrementMiniAppCount,

  getPublicUserProfile,

  isValidUsername,
  normalizeUsername,
  getUserDisplayName,
};

export default UserFirebase;
