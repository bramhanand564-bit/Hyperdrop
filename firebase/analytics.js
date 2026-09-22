// firebase/analytics.js

import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebaseConfig';

const ANALYTICS_COLLECTION = 'analytics';

/**
 * Supported analytics event types.
 */
export const ANALYTICS_EVENTS = {
  VIEW: 'view',
  OPEN: 'open',
  USAGE: 'usage',
  INSTALL: 'install',
  UNINSTALL: 'uninstall',
  CREATE: 'create',
  PUBLISH: 'publish',
  SEARCH: 'search',
  SHARE: 'share',
  ERROR: 'error',
};

/**
 * Normalize analytics event.
 */
function normalizeAnalyticsEvent(
  id,
  data = {}
) {
  return {
    id,

    eventType: data.eventType || '',

    userId: data.userId || '',

    targetId: data.targetId || '',
    targetType: data.targetType || '',

    appId: data.appId || '',
    botId: data.botId || '',

    category: data.category || '',

    source: data.source || '',

    metadata:
      data.metadata &&
      typeof data.metadata === 'object'
        ? data.metadata
        : {},

    createdAt: data.createdAt || null,

    ...data,

    id,
  };
}

/**
 * Record a generic analytics event.
 *
 * IMPORTANT:
 * Do not put passwords, tokens, private messages,
 * payment details, or other sensitive information
 * into metadata.
 */
export async function recordEvent({
  eventType,
  userId = '',
  targetId = '',
  targetType = '',
  appId = '',
  botId = '',
  category = '',
  source = '',
  metadata = {},
} = {}) {
  if (!eventType) {
    throw new Error(
      'Analytics event type is required.'
    );
  }

  const safeMetadata =
    metadata &&
    typeof metadata === 'object'
      ? metadata
      : {};

  const payload = {
    eventType,

    userId: userId || '',

    targetId: targetId || '',
    targetType: targetType || '',

    appId: appId || '',
    botId: botId || '',

    category: category || '',
    source: source || '',

    metadata: safeMetadata,

    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(
      db,
      ANALYTICS_COLLECTION
    ),
    payload
  );

  return {
    id: ref.id,
    ...payload,
  };
}

/**
 * Record mini-app view.
 */
export async function recordMiniAppView({
  appId,
  userId = '',
  category = '',
  source = 'portal',
  metadata = {},
} = {}) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  return recordEvent({
    eventType:
      ANALYTICS_EVENTS.VIEW,

    userId,

    targetId: appId,
    targetType: 'mini_app',

    appId,
    category,
    source,
    metadata,
  });
}

/**
 * Record mini-app open.
 */
export async function recordMiniAppOpen({
  appId,
  userId = '',
  category = '',
  source = 'portal',
  metadata = {},
} = {}) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  return recordEvent({
    eventType:
      ANALYTICS_EVENTS.OPEN,

    userId,

    targetId: appId,
    targetType: 'mini_app',

    appId,
    category,
    source,
    metadata,
  });
}

/**
 * Record mini-app usage.
 */
export async function recordMiniAppUsage({
  appId,
  userId = '',
  category = '',
  source = 'mini_app',
  metadata = {},
} = {}) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  return recordEvent({
    eventType:
      ANALYTICS_EVENTS.USAGE,

    userId,

    targetId: appId,
    targetType: 'mini_app',

    appId,
    category,
    source,
    metadata,
  });
}

/**
 * Record mini-app installation.
 */
export async function recordMiniAppInstall({
  appId,
  userId = '',
  category = '',
  source = 'portal',
  metadata = {},
} = {}) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  return recordEvent({
    eventType:
      ANALYTICS_EVENTS.INSTALL,

    userId,

    targetId: appId,
    targetType: 'mini_app',

    appId,
    category,
    source,
    metadata,
  });
}

/**
 * Record mini-app uninstall.
 */
export async function recordMiniAppUninstall({
  appId,
  userId = '',
  category = '',
  source = 'portal',
  metadata = {},
} = {}) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  return recordEvent({
    eventType:
      ANALYTICS_EVENTS.UNINSTALL,

    userId,

    targetId: appId,
    targetType: 'mini_app',

    appId,
    category,
    source,
    metadata,
  });
}

/**
 * Record bot view.
 */
export async function recordBotView({
  botId,
  userId = '',
  category = '',
  source = 'portal',
  metadata = {},
} = {}) {
  if (!botId) {
    throw new Error(
      'Bot ID is required.'
    );
  }

  return recordEvent({
    eventType:
      ANALYTICS_EVENTS.VIEW,

    userId,

    targetId: botId,
    targetType: 'bot',

    botId,
    category,
    source,
    metadata,
  });
}

/**
 * Record bot open.
 */
export async function recordBotOpen({
  botId,
  userId = '',
  category = '',
  source = 'portal',
  metadata = {},
} = {}) {
  if (!botId) {
    throw new Error(
      'Bot ID is required.'
    );
  }

  return recordEvent({
    eventType:
      ANALYTICS_EVENTS.OPEN,

    userId,

    targetId: botId,
    targetType: 'bot',

    botId,
    category,
    source,
    metadata,
  });
}

/**
 * Record bot usage.
 */
export async function recordBotUsage({
  botId,
  userId = '',
  category = '',
  source = 'bot',
  metadata = {},
} = {}) {
  if (!botId) {
    throw new Error(
      'Bot ID is required.'
    );
  }

  return recordEvent({
    eventType:
      ANALYTICS_EVENTS.USAGE,

    userId,

    targetId: botId,
    targetType: 'bot',

    botId,
    category,
    source,
    metadata,
  });
}

/**
 * Record bot creation.
 */
export async function recordBotCreation({
  botId,
  userId = '',
  category = '',
  metadata = {},
} = {}) {
  if (!botId) {
    throw new Error(
      'Bot ID is required.'
    );
  }

  return recordEvent({
    eventType:
      ANALYTICS_EVENTS.CREATE,

    userId,

    targetId: botId,
    targetType: 'bot',

    botId,
    category,
    source: 'bot_create',
    metadata,
  });
}

/**
 * Record mini-app creation.
 */
export async function recordMiniAppCreation({
  appId,
  userId = '',
  category = '',
  metadata = {},
} = {}) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  return recordEvent({
    eventType:
      ANALYTICS_EVENTS.CREATE,

    userId,

    targetId: appId,
    targetType: 'mini_app',

    appId,
    category,
    source: 'mini_app_create',
    metadata,
  });
}

/**
 * Record mini-app publishing.
 */
export async function recordMiniAppPublish({
  appId,
  userId = '',
  category = '',
  metadata = {},
} = {}) {
  if (!appId) {
    throw new Error(
      'Mini-app ID is required.'
    );
  }

  return recordEvent({
    eventType:
      ANALYTICS_EVENTS.PUBLISH,

    userId,

    targetId: appId,
    targetType: 'mini_app',

    appId,
    category,
    source: 'publisher',
    metadata,
  });
}

/**
 * Record a Portal search.
 */
export async function recordPortalSearch({
  userId = '',
  searchText = '',
  category = '',
  resultCount = 0,
  metadata = {},
} = {}) {
  return recordEvent({
    eventType:
      ANALYTICS_EVENTS.SEARCH,

    userId,

    targetType: 'portal',

    category,

    source: 'portal_search',

    metadata: {
      ...metadata,

      /**
       * Keep search analytics lightweight.
       * Do not store sensitive/private queries.
       */
      searchText: String(
        searchText || ''
      ).slice(0, 100),

      resultCount:
        Number(resultCount || 0),
    },
  });
}

/**
 * Record a share.
 */
export async function recordShare({
  targetId,
  targetType,
  userId = '',
  source = 'app',
  metadata = {},
} = {}) {
  if (!targetId) {
    throw new Error(
      'Share target ID is required.'
    );
  }

  return recordEvent({
    eventType:
      ANALYTICS_EVENTS.SHARE,

    userId,

    targetId,
    targetType,

    appId:
      targetType === 'mini_app'
        ? targetId
        : '',

    botId:
      targetType === 'bot'
        ? targetId
        : '',

    source,
    metadata,
  });
}

/**
 * Record an error event.
 */
export async function recordAnalyticsError({
  targetId = '',
  targetType = '',
  userId = '',
  source = '',
  errorCode = '',
  metadata = {},
} = {}) {
  return recordEvent({
    eventType:
      ANALYTICS_EVENTS.ERROR,

    userId,

    targetId,
    targetType,

    appId:
      targetType === 'mini_app'
        ? targetId
        : '',

    botId:
      targetType === 'bot'
        ? targetId
        : '',

    source,

    metadata: {
      ...metadata,
      errorCode:
        String(errorCode || '')
          .slice(0, 100),
    },
  });
}

/**
 * Get analytics events for a target.
 *
 * This is mainly for creator/admin dashboards.
 * Firestore Security Rules should restrict access.
 */
export async function getTargetAnalytics({
  targetId,
  eventType,
  limitCount = 100,
} = {}) {
  if (!targetId) {
    return [];
  }

  const analyticsRef = collection(
    db,
    ANALYTICS_COLLECTION
  );

  const constraints = [
    where(
      'targetId',
      '==',
      targetId
    ),
  ];

  if (eventType) {
    constraints.push(
      where(
        'eventType',
        '==',
        eventType
      )
    );
  }

  constraints.push(
    orderBy(
      'createdAt',
      'desc'
    )
  );

  constraints.push(
    limit(limitCount)
  );

  const q = query(
    analyticsRef,
    ...constraints
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) =>
    normalizeAnalyticsEvent(
      item.id,
      item.data()
    )
  );
}

/**
 * Get analytics for a mini-app.
 */
export async function getMiniAppAnalytics(
  appId,
  options = {}
) {
  return getTargetAnalytics({
    targetId: appId,
    ...options,
  });
}

/**
 * Get analytics for a bot.
 */
export async function getBotAnalytics(
  botId,
  options = {}
) {
  return getTargetAnalytics({
    targetId: botId,
    ...options,
  });
}

/**
 * Get analytics events for a user.
 */
export async function getUserAnalytics(
  userId,
  limitCount = 100
) {
  if (!userId) {
    return [];
  }

  const analyticsRef = collection(
    db,
    ANALYTICS_COLLECTION
  );

  const q = query(
    analyticsRef,
    where(
      'userId',
      '==',
      userId
    ),
    orderBy(
      'createdAt',
      'desc'
    ),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) =>
    normalizeAnalyticsEvent(
      item.id,
      item.data()
    )
  );
}

/**
 * Convert raw events into simple counters.
 */
export function summarizeAnalytics(
  events = []
) {
  const summary = {
    total: 0,

    views: 0,
    opens: 0,
    usage: 0,
    installs: 0,
    uninstalls: 0,

    creates: 0,
    publishes: 0,
    searches: 0,
    shares: 0,
    errors: 0,
  };

  if (!Array.isArray(events)) {
    return summary;
  }

  events.forEach((event) => {
    summary.total += 1;

    switch (event.eventType) {
      case ANALYTICS_EVENTS.VIEW:
        summary.views += 1;
        break;

      case ANALYTICS_EVENTS.OPEN:
        summary.opens += 1;
        break;

      case ANALYTICS_EVENTS.USAGE:
        summary.usage += 1;
        break;

      case ANALYTICS_EVENTS.INSTALL:
        summary.installs += 1;
        break;

      case ANALYTICS_EVENTS.UNINSTALL:
        summary.uninstalls += 1;
        break;

      case ANALYTICS_EVENTS.CREATE:
        summary.creates += 1;
        break;

      case ANALYTICS_EVENTS.PUBLISH:
        summary.publishes += 1;
        break;

      case ANALYTICS_EVENTS.SEARCH:
        summary.searches += 1;
        break;

      case ANALYTICS_EVENTS.SHARE:
        summary.shares += 1;
        break;

      case ANALYTICS_EVENTS.ERROR:
        summary.errors += 1;
        break;

      default:
        break;
    }
  });

  return summary;
}

/**
 * Get event count by type.
 */
export function countEventsByType(
  events = []
) {
  const counts = {};

  if (!Array.isArray(events)) {
    return counts;
  }

  events.forEach((event) => {
    const type =
      event.eventType || 'unknown';

    counts[type] =
      (counts[type] || 0) + 1;
  });

  return counts;
}

/**
 * Get usage count for a specific target.
 */
export function countTargetUsage(
  events = [],
  targetId
) {
  if (!targetId) {
    return 0;
  }

  return events.filter(
    (event) =>
      event.targetId === targetId &&
      event.eventType ===
        ANALYTICS_EVENTS.USAGE
  ).length;
}

/**
 * Filter analytics events locally.
 */
export function filterAnalytics(
  events = [],
  {
    eventType,
    targetId,
    targetType,
    userId,
    source,
  } = {}
) {
  return events.filter((event) => {
    if (
      eventType &&
      event.eventType !== eventType
    ) {
      return false;
    }

    if (
      targetId &&
      event.targetId !== targetId
    ) {
      return false;
    }

    if (
      targetType &&
      event.targetType !== targetType
    ) {
      return false;
    }

    if (
      userId &&
      event.userId !== userId
    ) {
      return false;
    }

    if (
      source &&
      event.source !== source
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Analytics Firebase API.
 */
export const AnalyticsFirebase = {
  ANALYTICS_EVENTS,

  recordEvent,

  recordMiniAppView,
  recordMiniAppOpen,
  recordMiniAppUsage,
  recordMiniAppInstall,
  recordMiniAppUninstall,

  recordBotView,
  recordBotOpen,
  recordBotUsage,
  recordBotCreation,

  recordMiniAppCreation,
  recordMiniAppPublish,

  recordPortalSearch,
  recordShare,
  recordAnalyticsError,

  getTargetAnalytics,
  getMiniAppAnalytics,
  getBotAnalytics,
  getUserAnalytics,

  summarizeAnalytics,
  countEventsByType,
  countTargetUsage,

  filterAnalytics,
};

export default AnalyticsFirebase;
