// api/UserAPI.js

import {
  UserFirebase,
} from '../firebase/users';

/**
 * Nax User API
 *
 * Frontend-facing bridge for user profiles,
 * creator profiles and ecosystem account data.
 *
 * UI/screens should eventually use this API instead
 * of accessing Firestore directly.
 */

/**
 * Get user profile.
 */
export async function getUser(userId) {
  if (!userId) {
    throw new Error(
      'User ID is required.'
    );
  }

  return UserFirebase.getUserById(
    userId
  );
}

/**
 * Get user profile.
 */
export async function getUserProfile(
  userId
) {
  if (!userId) {
    throw new Error(
      'User ID is required.'
    );
  }

  return UserFirebase.getUserProfile(
    userId
  );
}

/**
 * Create profile.
 */
export async function createUserProfile(
  profileData
) {
  if (!profileData?.uid) {
    throw new Error(
      'User ID is required.'
    );
  }

  return UserFirebase.createUserProfile(
    profileData
  );
}

/**
 * Create profile from Firebase Auth user.
 */
export async function createProfileFromAuthUser(
  authUser
) {
  if (!authUser?.uid) {
    throw new Error(
      'Authenticated user is required.'
    );
  }

  return UserFirebase.createProfileFromAuthUser(
    authUser
  );
}

/**
 * Update profile.
 */
export async function updateUserProfile(
  userId,
  updates
) {
  if (!userId) {
    throw new Error(
      'User ID is required.'
    );
  }

  return UserFirebase.updateUserProfile(
    userId,
    updates
  );
}

/**
 * Update display name.
 */
export async function updateDisplayName(
  userId,
  displayName
) {
  return UserFirebase.updateDisplayName(
    userId,
    displayName
  );
}

/**
 * Update username.
 */
export async function updateUsername(
  userId,
  username
) {
  return UserFirebase.updateUsername(
    userId,
    username
  );
}

/**
 * Update profile photo.
 */
export async function updatePhotoURL(
  userId,
  photoURL
) {
  return UserFirebase.updatePhotoURL(
    userId,
    photoURL
  );
}

/**
 * Update bio.
 */
export async function updateBio(
  userId,
  bio
) {
  return UserFirebase.updateBio(
    userId,
    bio
  );
}

/**
 * Sync Firebase Auth profile.
 */
export async function syncAuthProfile(
  authUser,
  profileData
) {
  return UserFirebase.syncAuthProfile(
    authUser,
    profileData
  );
}

/**
 * Set creator status.
 */
export async function setCreatorStatus(
  userId,
  isCreator = true
) {
  if (!userId) {
    throw new Error(
      'User ID is required.'
    );
  }

  return UserFirebase.setCreatorStatus(
    userId,
    isCreator
  );
}

/**
 * Update bot count.
 */
export async function updateBotCount(
  userId,
  count
) {
  if (!userId) {
    throw new Error(
      'User ID is required.'
    );
  }

  return UserFirebase.updateBotCount(
    userId,
    count
  );
}

/**
 * Update mini-app count.
 */
export async function updateMiniAppCount(
  userId,
  count
) {
  if (!userId) {
    throw new Error(
      'User ID is required.'
    );
  }

  return UserFirebase.updateMiniAppCount(
    userId,
    count
  );
}

/**
 * Increment bot count.
 */
export async function incrementBotCount(
  userId,
  amount = 1
) {
  if (!userId) {
    throw new Error(
      'User ID is required.'
    );
  }

  return UserFirebase.incrementBotCount(
    userId,
    amount
  );
}

/**
 * Increment mini-app count.
 */
export async function incrementMiniAppCount(
  userId,
  amount = 1
) {
  if (!userId) {
    throw new Error(
      'User ID is required.'
    );
  }

  return UserFirebase.incrementMiniAppCount(
    userId,
    amount
  );
}

/**
 * Get safe public profile.
 */
export function getPublicProfile(
  user
) {
  return UserFirebase.getPublicUserProfile(
    user
  );
}

/**
 * Get display name.
 */
export function getDisplayName(
  user
) {
  return UserFirebase.getUserDisplayName(
    user
  );
}

/**
 * Normalize username.
 */
export function normalizeUsername(
  username
) {
  return UserFirebase.normalizeUsername(
    username
  );
}

/**
 * Validate username.
 */
export function isValidUsername(
  username
) {
  return UserFirebase.isValidUsername(
    username
  );
}

/**
 * Validate profile input before saving.
 *
 * Frontend validation only.
 */
export function validateProfileInput(
  profileData = {}
) {
  const errors = [];

  if (
    profileData.displayName !==
      undefined
  ) {
    const name =
      String(
        profileData.displayName ||
          ''
      ).trim();

    if (name.length > 80) {
      errors.push(
        'Display name cannot exceed 80 characters.'
      );
    }
  }

  if (
    profileData.username !==
      undefined
  ) {
    const username =
      normalizeUsername(
        profileData.username
      );

    if (
      username &&
      !isValidUsername(username)
    ) {
      errors.push(
        'Username must be 3-30 characters and use only letters, numbers, or _.'
      );
    }
  }

  if (
    profileData.bio !==
      undefined
  ) {
    const bio =
      String(
        profileData.bio || ''
      );

    if (bio.length > 500) {
      errors.push(
        'Bio cannot exceed 500 characters.'
      );
    }
  }

  if (
    profileData.firstName !==
      undefined &&
    String(
      profileData.firstName || ''
    ).length > 50
  ) {
    errors.push(
      'First name cannot exceed 50 characters.'
    );
  }

  if (
    profileData.lastName !==
      undefined &&
    String(
      profileData.lastName || ''
    ).length > 50
  ) {
    errors.push(
      'Last name cannot exceed 50 characters.'
    );
  }

  return {
    valid:
      errors.length === 0,

    errors,
  };
}

/**
 * Normalize profile input.
 */
export function normalizeProfileInput(
  profileData = {}
) {
  const normalized = {
    ...profileData,
  };

  if (
    profileData.displayName !==
      undefined
  ) {
    normalized.displayName =
      String(
        profileData.displayName ||
          ''
      ).trim();
  }

  if (
    profileData.username !==
      undefined
  ) {
    normalized.username =
      normalizeUsername(
        profileData.username
      );
  }

  if (
    profileData.email !==
      undefined
  ) {
    normalized.email =
      String(
        profileData.email || ''
      ).trim();
  }

  if (
    profileData.photoURL !==
      undefined
  ) {
    normalized.photoURL =
      String(
        profileData.photoURL || ''
      ).trim();
  }

  if (
    profileData.bio !==
      undefined
  ) {
    normalized.bio =
      String(
        profileData.bio || ''
      ).trim();
  }

  if (
    profileData.firstName !==
      undefined
  ) {
    normalized.firstName =
      String(
        profileData.firstName || ''
      ).trim();
  }

  if (
    profileData.lastName !==
      undefined
  ) {
    normalized.lastName =
      String(
        profileData.lastName || ''
      ).trim();
  }

  return normalized;
}

/**
 * Update profile with validation.
 */
export async function updateValidatedProfile(
  userId,
  profileData = {}
) {
  if (!userId) {
    throw new Error(
      'User ID is required.'
    );
  }

  const normalized =
    normalizeProfileInput(
      profileData
    );

  const validation =
    validateProfileInput(
      normalized
    );

  if (!validation.valid) {
    throw new Error(
      validation.errors.join(' ')
    );
  }

  return updateUserProfile(
    userId,
    normalized
  );
}

/**
 * Build creator profile data for Portal.
 */
export function toCreatorProfile(
  user
) {
  if (!user) {
    return null;
  }

  return {
    id:
      user.id ||
      user.uid ||
      '',

    uid:
      user.uid ||
      user.id ||
      '',

    displayName:
      UserFirebase.getUserDisplayName(
        user
      ),

    username:
      user.username
        ? `@${normalizeUsername(
            user.username
          )}`
        : '',

    photoURL:
      user.photoURL || '',

    bio:
      user.bio || '',

    isCreator:
      Boolean(
        user.isCreator
      ),

    isVerified:
      Boolean(
        user.isVerified
      ),

    botCount:
      Number(
        user.botCount || 0
      ),

    miniAppCount:
      Number(
        user.miniAppCount || 0
      ),
  };
}

/**
 * Build lightweight user data for UI.
 */
export function toUserCard(
  user
) {
  if (!user) {
    return null;
  }

  return {
    id:
      user.id ||
      user.uid ||
      '',

    displayName:
      UserFirebase.getUserDisplayName(
        user
      ),

    username:
      user.username
        ? `@${normalizeUsername(
            user.username
          )}`
        : '',

    photoURL:
      user.photoURL || '',

    isCreator:
      Boolean(
        user.isCreator
      ),

    isVerified:
      Boolean(
        user.isVerified
      ),
  };
}

/**
 * Prepare account settings.
 *
 * Only local/UI-safe values are returned.
 */
export function toAccountSettings(
  user
) {
  if (!user) {
    return null;
  }

  return {
    displayName:
      user.displayName || '',

    username:
      user.username || '',

    bio:
      user.bio || '',

    photoURL:
      user.photoURL || '',

    isCreator:
      Boolean(
        user.isCreator
      ),

    role:
      user.role || 'user',
  };
}

/**
 * Check whether profile is ready for creator tools.
 */
export function isCreatorProfileReady(
  user
) {
  if (!user) {
    return false;
  }

  const displayName =
    UserFirebase.getUserDisplayName(
      user
    );

  const username =
    normalizeUsername(
      user.username
    );

  return (
    Boolean(displayName) &&
    Boolean(username) &&
    isValidUsername(username)
  );
}

/**
 * Get profile completion percentage.
 */
export function getProfileCompletion(
  user
) {
  if (!user) {
    return 0;
  }

  const fields = [
    Boolean(
      user.displayName?.trim()
    ),

    Boolean(
      user.username?.trim()
    ),

    Boolean(
      user.photoURL?.trim()
    ),

    Boolean(
      user.bio?.trim()
    ),
  ];

  const completed =
    fields.filter(Boolean)
      .length;

  return Math.round(
    (completed /
      fields.length) *
      100
  );
}

/**
 * User API object.
 */
export const UserAPI = {
  getUser,
  getUserProfile,

  createUserProfile,
  createProfileFromAuthUser,

  updateUserProfile,
  updateValidatedProfile,

  updateDisplayName,
  updateUsername,
  updatePhotoURL,
  updateBio,

  syncAuthProfile,

  setCreatorStatus,

  updateBotCount,
  updateMiniAppCount,

  incrementBotCount,
  incrementMiniAppCount,

  getPublicProfile,
  getDisplayName,

  normalizeUsername,
  isValidUsername,

  validateProfileInput,
  normalizeProfileInput,

  toCreatorProfile,
  toUserCard,
  toAccountSettings,

  isCreatorProfileReady,
  getProfileCompletion,
};

export default UserAPI;
