// security/PermissionManager.js

/**
 * Nax Permission Manager
 *
 * Central permission definitions and checks for
 * Bots, Mini-Apps, Portal and future Nax Studio apps.
 *
 * IMPORTANT:
 * This is a client-side permission layer.
 * It must NOT be treated as the final security boundary.
 *
 * Real authorization must also be enforced by:
 * - Firebase Authentication
 * - Firestore Security Rules
 * - Backend / Cloud Functions
 * - WebView restrictions
 */

/**
 * All permissions supported by the Nax ecosystem.
 */
export const PERMISSIONS = {
  /**
   * Basic permissions.
   */
  PROFILE_READ: 'profile.read',

  /**
   * Messaging.
   */
  CHAT_READ: 'chat.read',
  CHAT_SEND: 'chat.send',

  /**
   * Media.
   */
  MEDIA_READ: 'media.read',
  MEDIA_UPLOAD: 'media.upload',

  /**
   * Device capabilities.
   */
  CAMERA: 'device.camera',
  MICROPHONE: 'device.microphone',

  /**
   * Location.
   */
  LOCATION_COARSE: 'location.coarse',
  LOCATION_PRECISE: 'location.precise',

  /**
   * Notifications.
   */
  NOTIFICATIONS: 'notifications',

  /**
   * Storage.
   */
  STORAGE_READ: 'storage.read',
  STORAGE_WRITE: 'storage.write',

  /**
   * Sharing.
   */
  SHARE: 'share',

  /**
   * External navigation.
   */
  EXTERNAL_LINKS: 'external.links',

  /**
   * Bot capabilities.
   */
  BOT_COMMANDS: 'bot.commands',
  BOT_BUTTONS: 'bot.buttons',

  /**
   * Mini-App capabilities.
   */
  MINI_APP_DATA_READ: 'mini_app.data.read',
  MINI_APP_DATA_WRITE: 'mini_app.data.write',

  /**
   * AI.
   */
  AI_TEXT: 'ai.text',

  /**
   * Payments.
   *
   * Reserved for future payment integration.
   */
  PAYMENTS: 'payments',
};

/**
 * Permission risk levels.
 */
export const PERMISSION_RISK = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Metadata for each permission.
 */
export const PERMISSION_DEFINITIONS = {
  [PERMISSIONS.PROFILE_READ]: {
    label: 'Profile',
    description:
      'Read basic public profile information.',
    risk: PERMISSION_RISK.LOW,
  },

  [PERMISSIONS.CHAT_READ]: {
    label: 'Read Chat',
    description:
      'Read chat information provided to the app.',
    risk: PERMISSION_RISK.MEDIUM,
  },

  [PERMISSIONS.CHAT_SEND]: {
    label: 'Send Messages',
    description:
      'Send messages through an authorized Nax interface.',
    risk: PERMISSION_RISK.MEDIUM,
  },

  [PERMISSIONS.MEDIA_READ]: {
    label: 'Media Access',
    description:
      'Access media selected by the user.',
    risk: PERMISSION_RISK.MEDIUM,
  },

  [PERMISSIONS.MEDIA_UPLOAD]: {
    label: 'Upload Media',
    description:
      'Upload user-selected media.',
    risk: PERMISSION_RISK.MEDIUM,
  },

  [PERMISSIONS.CAMERA]: {
    label: 'Camera',
    description:
      'Use the device camera after user permission.',
    risk: PERMISSION_RISK.HIGH,
  },

  [PERMISSIONS.MICROPHONE]: {
    label: 'Microphone',
    description:
      'Use the device microphone after user permission.',
    risk: PERMISSION_RISK.HIGH,
  },

  [PERMISSIONS.LOCATION_COARSE]: {
    label: 'Approximate Location',
    description:
      'Access approximate device location.',
    risk: PERMISSION_RISK.HIGH,
  },

  [PERMISSIONS.LOCATION_PRECISE]: {
    label: 'Precise Location',
    description:
      'Access precise device location.',
    risk: PERMISSION_RISK.CRITICAL,
  },

  [PERMISSIONS.NOTIFICATIONS]: {
    label: 'Notifications',
    description:
      'Send notifications through Nax.',
    risk: PERMISSION_RISK.MEDIUM,
  },

  [PERMISSIONS.STORAGE_READ]: {
    label: 'Storage Read',
    description:
      'Read app-scoped stored data.',
    risk: PERMISSION_RISK.MEDIUM,
  },

  [PERMISSIONS.STORAGE_WRITE]: {
    label: 'Storage Write',
    description:
      'Write app-scoped stored data.',
    risk: PERMISSION_RISK.MEDIUM,
  },

  [PERMISSIONS.SHARE]: {
    label: 'Share',
    description:
      'Open the Nax sharing interface.',
    risk: PERMISSION_RISK.LOW,
  },

  [PERMISSIONS.EXTERNAL_LINKS]: {
    label: 'External Links',
    description:
      'Open approved external websites.',
    risk: PERMISSION_RISK.MEDIUM,
  },

  [PERMISSIONS.BOT_COMMANDS]: {
    label: 'Bot Commands',
    description:
      'Use approved bot commands.',
    risk: PERMISSION_RISK.MEDIUM,
  },

  [PERMISSIONS.BOT_BUTTONS]: {
    label: 'Bot Buttons',
    description:
      'Use approved bot buttons and actions.',
    risk: PERMISSION_RISK.MEDIUM,
  },

  [PERMISSIONS.MINI_APP_DATA_READ]: {
    label: 'Mini-App Data',
    description:
      'Read app-scoped data.',
    risk: PERMISSION_RISK.MEDIUM,
  },

  [PERMISSIONS.MINI_APP_DATA_WRITE]: {
    label: 'Mini-App Data Write',
    description:
      'Write app-scoped data.',
    risk: PERMISSION_RISK.MEDIUM,
  },

  [PERMISSIONS.AI_TEXT]: {
    label: 'AI Text',
    description:
      'Use approved Nax AI text capabilities.',
    risk: PERMISSION_RISK.MEDIUM,
  },

  [PERMISSIONS.PAYMENTS]: {
    label: 'Payments',
    description:
      'Request an approved payment flow.',
    risk: PERMISSION_RISK.CRITICAL,
  },
};

/**
 * Permissions that are safe as default capabilities
 * for normal public mini-apps.
 */
export const DEFAULT_PERMISSIONS = [
  PERMISSIONS.PROFILE_READ,
  PERMISSIONS.SHARE,
];

/**
 * Permissions that require explicit user consent.
 */
export const CONSENT_REQUIRED_PERMISSIONS = [
  PERMISSIONS.CHAT_READ,
  PERMISSIONS.CHAT_SEND,

  PERMISSIONS.MEDIA_READ,
  PERMISSIONS.MEDIA_UPLOAD,

  PERMISSIONS.CAMERA,
  PERMISSIONS.MICROPHONE,

  PERMISSIONS.LOCATION_COARSE,
  PERMISSIONS.LOCATION_PRECISE,

  PERMISSIONS.NOTIFICATIONS,

  PERMISSIONS.STORAGE_READ,
  PERMISSIONS.STORAGE_WRITE,

  PERMISSIONS.EXTERNAL_LINKS,

  PERMISSIONS.BOT_COMMANDS,
  PERMISSIONS.BOT_BUTTONS,

  PERMISSIONS.MINI_APP_DATA_READ,
  PERMISSIONS.MINI_APP_DATA_WRITE,

  PERMISSIONS.AI_TEXT,

  PERMISSIONS.PAYMENTS,
];

/**
 * High-risk permissions.
 */
export const HIGH_RISK_PERMISSIONS = [
  PERMISSIONS.CAMERA,
  PERMISSIONS.MICROPHONE,

  PERMISSIONS.LOCATION_COARSE,
  PERMISSIONS.LOCATION_PRECISE,

  PERMISSIONS.PAYMENTS,
];

/**
 * Permissions that should never be granted to an
 * untrusted arbitrary mini-app.
 */
export const RESTRICTED_PERMISSIONS = [
  PERMISSIONS.LOCATION_PRECISE,
  PERMISSIONS.PAYMENTS,
];

/**
 * Validate a permission name.
 */
export function isValidPermission(
  permission
) {
  return Object.values(
    PERMISSIONS
  ).includes(permission);
}

/**
 * Normalize permission array.
 */
export function normalizePermissions(
  permissions = []
) {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return [
    ...new Set(
      permissions
        .map((permission) =>
          String(permission || '')
            .trim()
        )
        .filter(isValidPermission)
    ),
  ];
}

/**
 * Remove invalid permissions.
 */
export function sanitizePermissions(
  permissions = []
) {
  return normalizePermissions(
    permissions
  );
}

/**
 * Check whether an app requests a permission.
 */
export function hasPermission(
  permissions = [],
  permission
) {
  if (!permission) {
    return false;
  }

  const normalized =
    normalizePermissions(
      permissions
    );

  return normalized.includes(
    permission
  );
}

/**
 * Check whether all requested permissions
 * are present.
 */
export function hasAllPermissions(
  grantedPermissions = [],
  requiredPermissions = []
) {
  const granted =
    normalizePermissions(
      grantedPermissions
    );

  const required =
    normalizePermissions(
      requiredPermissions
    );

  return required.every(
    (permission) =>
      granted.includes(permission)
  );
}

/**
 * Check whether at least one permission
 * from a list exists.
 */
export function hasAnyPermission(
  grantedPermissions = [],
  requestedPermissions = []
) {
  const granted =
    normalizePermissions(
      grantedPermissions
    );

  const requested =
    normalizePermissions(
      requestedPermissions
    );

  return requested.some(
    (permission) =>
      granted.includes(permission)
  );
}

/**
 * Get missing permissions.
 */
export function getMissingPermissions(
  grantedPermissions = [],
  requiredPermissions = []
) {
  const granted =
    normalizePermissions(
      grantedPermissions
    );

  const required =
    normalizePermissions(
      requiredPermissions
    );

  return required.filter(
    (permission) =>
      !granted.includes(permission)
  );
}

/**
 * Get permissions requiring user consent.
 */
export function getConsentRequiredPermissions(
  permissions = []
) {
  const normalized =
    normalizePermissions(
      permissions
    );

  return normalized.filter(
    (permission) =>
      CONSENT_REQUIRED_PERMISSIONS.includes(
        permission
      )
  );
}

/**
 * Get high-risk permissions.
 */
export function getHighRiskPermissions(
  permissions = []
) {
  const normalized =
    normalizePermissions(
      permissions
    );

  return normalized.filter(
    (permission) =>
      HIGH_RISK_PERMISSIONS.includes(
        permission
      )
  );
}

/**
 * Get restricted permissions.
 */
export function getRestrictedPermissions(
  permissions = []
) {
  const normalized =
    normalizePermissions(
      permissions
    );

  return normalized.filter(
    (permission) =>
      RESTRICTED_PERMISSIONS.includes(
        permission
      )
  );
}

/**
 * Check whether a permission is restricted.
 */
export function isRestrictedPermission(
  permission
) {
  return RESTRICTED_PERMISSIONS.includes(
    permission
  );
}

/**
 * Check whether a permission is high-risk.
 */
export function isHighRiskPermission(
  permission
) {
  return HIGH_RISK_PERMISSIONS.includes(
    permission
  );
}

/**
 * Get permission metadata.
 */
export function getPermissionDefinition(
  permission
) {
  if (!isValidPermission(permission)) {
    return null;
  }

  return {
    permission,

    ...PERMISSION_DEFINITIONS[
      permission
    ],
  };
}

/**
 * Get metadata for multiple permissions.
 */
export function getPermissionDefinitions(
  permissions = []
) {
  return normalizePermissions(
    permissions
  ).map(
    getPermissionDefinition
  );
}

/**
 * Check whether an app's requested permissions
 * are acceptable for normal Portal publication.
 *
 * Restricted permissions are rejected here.
 */
export function validateRequestedPermissions(
  permissions = []
) {
  const normalized =
    normalizePermissions(
      permissions
    );

  const invalid =
    Array.isArray(permissions)
      ? permissions.filter(
          (permission) =>
            !isValidPermission(
              permission
            )
        )
      : [];

  const restricted =
    getRestrictedPermissions(
      normalized
    );

  const highRisk =
    getHighRiskPermissions(
      normalized
    );

  return {
    valid:
      invalid.length === 0 &&
      restricted.length === 0,

    permissions: normalized,

    invalid,
    restricted,
    highRisk,

    consentRequired:
      getConsentRequiredPermissions(
        normalized
      ),
  };
}

/**
 * Build a permission request.
 *
 * This object can later be passed to a
 * Nax permission-consent UI.
 */
export function createPermissionRequest({
  appId = '',
  appName = '',
  permissions = [],
  reason = '',
} = {}) {
  const validation =
    validateRequestedPermissions(
      permissions
    );

  return {
    appId,
    appName,

    permissions:
      validation.permissions,

    consentRequired:
      validation.consentRequired,

    highRisk:
      validation.highRisk,

    restricted:
      validation.restricted,

    valid:
      validation.valid,

    reason:
      String(reason || '').trim(),
  };
}

/**
 * Determine whether a permission request can
 * be displayed to the user.
 */
export function canRequestPermissions(
  permissions = []
) {
  const validation =
    validateRequestedPermissions(
      permissions
    );

  return (
    validation.valid &&
    validation.permissions.length > 0
  );
}

/**
 * Check permission against granted permissions.
 */
export function canUsePermission({
  permission,
  grantedPermissions = [],
  userConsent = false,
} = {}) {
  if (
    !isValidPermission(
      permission
    )
  ) {
    return false;
  }

  /**
   * Restricted permissions cannot be enabled
   * by a simple client-side consent flag.
   */
  if (
    isRestrictedPermission(
      permission
    )
  ) {
    return false;
  }

  if (
    !hasPermission(
      grantedPermissions,
      permission
    )
  ) {
    return false;
  }

  if (
    CONSENT_REQUIRED_PERMISSIONS.includes(
      permission
    )
  ) {
    return Boolean(userConsent);
  }

  return true;
}

/**
 * Check an entire permission set.
 */
export function canUseAllPermissions({
  requiredPermissions = [],
  grantedPermissions = [],
  consentedPermissions = [],
} = {}) {
  const required =
    normalizePermissions(
      requiredPermissions
    );

  const granted =
    normalizePermissions(
      grantedPermissions
    );

  const consented =
    normalizePermissions(
      consentedPermissions
    );

  return required.every(
    (permission) =>
      canUsePermission({
        permission,

        grantedPermissions:
          granted,

        userConsent:
          !CONSENT_REQUIRED_PERMISSIONS.includes(
            permission
          ) ||
          consented.includes(
            permission
          ),
      })
  );
}

/**
 * Calculate a simple permission risk score.
 */
export function getPermissionRiskScore(
  permissions = []
) {
  const normalized =
    normalizePermissions(
      permissions
    );

  let score = 0;

  normalized.forEach(
    (permission) => {
      const definition =
        PERMISSION_DEFINITIONS[
          permission
        ];

      if (!definition) {
        return;
      }

      switch (
        definition.risk
      ) {
        case PERMISSION_RISK.LOW:
          score += 1;
          break;

        case PERMISSION_RISK.MEDIUM:
          score += 3;
          break;

        case PERMISSION_RISK.HIGH:
          score += 7;
          break;

        case PERMISSION_RISK.CRITICAL:
          score += 15;
          break;

        default:
          break;
      }
    }
  );

  return score;
}

/**
 * Get a human-readable risk level.
 */
export function getOverallRiskLevel(
  permissions = []
) {
  const normalized =
    normalizePermissions(
      permissions
    );

  if (
    normalized.some(
      isRestrictedPermission
    )
  ) {
    return PERMISSION_RISK.CRITICAL;
  }

  if (
    normalized.some(
      (permission) =>
        PERMISSION_DEFINITIONS[
          permission
        ]?.risk ===
        PERMISSION_RISK.HIGH
    )
  ) {
    return PERMISSION_RISK.HIGH;
  }

  if (
    normalized.some(
      (permission) =>
        PERMISSION_DEFINITIONS[
          permission
        ]?.risk ===
        PERMISSION_RISK.MEDIUM
    )
  ) {
    return PERMISSION_RISK.MEDIUM;
  }

  return PERMISSION_RISK.LOW;
}

/**
 * Build a permission summary for Portal UI.
 */
export function getPermissionSummary(
  permissions = []
) {
  const normalized =
    normalizePermissions(
      permissions
    );

  return {
    count:
      normalized.length,

    permissions:
      normalized,

    definitions:
      getPermissionDefinitions(
        normalized
      ),

    consentRequired:
      getConsentRequiredPermissions(
        normalized
      ),

    highRisk:
      getHighRiskPermissions(
        normalized
      ),

    restricted:
      getRestrictedPermissions(
        normalized
      ),

    riskScore:
      getPermissionRiskScore(
        normalized
      ),

    riskLevel:
      getOverallRiskLevel(
        normalized
      ),
  };
}

/**
 * Remove permissions that a public mini-app
 * should not request.
 */
export function getSafePublicPermissions(
  permissions = []
) {
  const normalized =
    normalizePermissions(
      permissions
    );

  return normalized.filter(
    (permission) =>
      !RESTRICTED_PERMISSIONS.includes(
        permission
      )
  );
}

/**
 * Create a default permission set.
 */
export function createDefaultPermissions() {
  return [
    ...DEFAULT_PERMISSIONS,
  ];
}

/**
 * Merge permission sets.
 */
export function mergePermissions(
  ...permissionSets
) {
  return normalizePermissions(
    permissionSets.flat()
  );
}

/**
 * Remove permissions from a set.
 */
export function removePermissions(
  permissions = [],
  permissionsToRemove = []
) {
  const current =
    normalizePermissions(
      permissions
    );

  const remove =
    normalizePermissions(
      permissionsToRemove
    );

  return current.filter(
    (permission) =>
      !remove.includes(permission)
  );
}

/**
 * Permission manager object.
 */
export const PermissionManager = {
  PERMISSIONS,

  PERMISSION_RISK,

  PERMISSION_DEFINITIONS,

  DEFAULT_PERMISSIONS,

  CONSENT_REQUIRED_PERMISSIONS,

  HIGH_RISK_PERMISSIONS,

  RESTRICTED_PERMISSIONS,

  isValidPermission,
  normalizePermissions,
  sanitizePermissions,

  hasPermission,
  hasAllPermissions,
  hasAnyPermission,

  getMissingPermissions,

  getConsentRequiredPermissions,
  getHighRiskPermissions,
  getRestrictedPermissions,

  isRestrictedPermission,
  isHighRiskPermission,

  getPermissionDefinition,
  getPermissionDefinitions,

  validateRequestedPermissions,

  createPermissionRequest,
  canRequestPermissions,

  canUsePermission,
  canUseAllPermissions,

  getPermissionRiskScore,
  getOverallRiskLevel,
  getPermissionSummary,

  getSafePublicPermissions,

  createDefaultPermissions,
  mergePermissions,
  removePermissions,
};

export default PermissionManager;
