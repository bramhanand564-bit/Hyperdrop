// bot-runtime/BotSession.js

const SESSION_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
  CLOSED: "closed",
};

const SESSION_LIMITS = {
  MAX_KEYS: 50,
  MAX_KEY_LENGTH: 100,
  MAX_STRING_LENGTH: 1000,
  MAX_ARRAY_LENGTH: 50,
  MAX_HISTORY: 100,
  MAX_HISTORY_TEXT_LENGTH: 2000,
  DEFAULT_TTL_MS: 30 * 60 * 1000,
  MIN_TTL_MS: 10 * 1000,
  MAX_TTL_MS: 24 * 60 * 60 * 1000,
};

const SESSION_EVENTS = {
  CREATED: "session.created",
  UPDATED: "session.updated",
  MESSAGE: "session.message",
  COMMAND: "session.command",
  BUTTON: "session.button",
  EXPIRED: "session.expired",
  CLOSED: "session.closed",
  RESET: "session.reset",
};

function safeString(value, maxLength = 1000) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function createSessionId(prefix = "session") {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function clampTTL(ttlMs) {
  const value = Number(ttlMs);

  if (!Number.isFinite(value)) {
    return SESSION_LIMITS.DEFAULT_TTL_MS;
  }

  return Math.min(
    Math.max(
      value,
      SESSION_LIMITS.MIN_TTL_MS
    ),
    SESSION_LIMITS.MAX_TTL_MS
  );
}

function sanitizeValue(
  value,
  depth = 0
) {
  if (depth > 3) {
    return null;
  }

  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    return value.slice(
      0,
      SESSION_LIMITS.MAX_STRING_LENGTH
    );
  }

  if (
    typeof value === "number"
  ) {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(
        0,
        SESSION_LIMITS.MAX_ARRAY_LENGTH
      )
      .map((item) =>
        sanitizeValue(
          item,
          depth + 1
        )
      );
  }

  if (
    typeof value === "object"
  ) {
    const output = {};

    Object.keys(value)
      .slice(
        0,
        SESSION_LIMITS.MAX_KEYS
      )
      .forEach((key) => {
        const safeKey = safeString(
          key,
          SESSION_LIMITS.MAX_KEY_LENGTH
        );

        if (!safeKey) {
          return;
        }

        output[safeKey] =
          sanitizeValue(
            value[key],
            depth + 1
          );
      });

    return output;
  }

  return null;
}

function sanitizeSessionData(
  data
) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return {};
  }

  const output = {};

  Object.keys(data)
    .slice(0, SESSION_LIMITS.MAX_KEYS)
    .forEach((key) => {
      const safeKey = safeString(
        key,
        SESSION_LIMITS.MAX_KEY_LENGTH
      );

      if (!safeKey) {
        return;
      }

      output[safeKey] =
        sanitizeValue(
          data[key]
        );
    });

  return output;
}

function createSessionMessageRecord({
  type = "message",
  text = "",
  command = "",
  args = [],
  buttonId = "",
  metadata = {},
} = {}) {
  return {
    id: createSessionId("event"),
    type: safeString(
      type,
      50
    ),
    text: safeString(
      text,
      SESSION_LIMITS.MAX_HISTORY_TEXT_LENGTH
    ),
    command: safeString(
      command,
      100
    ),
    args: Array.isArray(args)
      ? args
          .slice(0, 50)
          .map((item) =>
            safeString(
              item,
              200
            )
          )
          .filter(Boolean)
      : [],
    buttonId: safeString(
      buttonId,
      100
    ),
    metadata:
      sanitizeSessionData(
        metadata
      ),
    timestamp: Date.now(),
  };
}

function clone(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  try {
    return JSON.parse(
      JSON.stringify(value)
    );
  } catch {
    return null;
  }
}

function createSessionData({
  id = null,
  botId = "",
  botUsername = "",
  userId = "",
  ttlMs = SESSION_LIMITS.DEFAULT_TTL_MS,
  data = {},
} = {}) {
  const now = Date.now();
  const safeTTL = clampTTL(
    ttlMs
  );

  return {
    id:
      safeString(id, 150) ||
      createSessionId(),
    botId: safeString(
      botId,
      150
    ),
    botUsername: safeString(
      botUsername,
      100
    ),
    userId: safeString(
      userId,
      150
    ),
    status:
      SESSION_STATUS.ACTIVE,
    data:
      sanitizeSessionData(
        data
      ),
    history: [],
    createdAt: now,
    updatedAt: now,
    expiresAt: now + safeTTL,
    ttlMs: safeTTL,
  };
}

function isSessionExpired(
  session,
  now = Date.now()
) {
  if (!session) {
    return true;
  }

  if (
    session.status ===
    SESSION_STATUS.EXPIRED
  ) {
    return true;
  }

  if (
    session.status ===
    SESSION_STATUS.CLOSED
  ) {
    return true;
  }

  const expiresAt = Number(
    session.expiresAt
  );

  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  return now >= expiresAt;
}

function getSessionRemainingMs(
  session,
  now = Date.now()
) {
  if (!session) {
    return 0;
  }

  const expiresAt = Number(
    session.expiresAt
  );

  if (!Number.isFinite(expiresAt)) {
    return 0;
  }

  return Math.max(
    0,
    expiresAt - now
  );
}

function normalizeSession(session) {
  if (
    !session ||
    typeof session !== "object"
  ) {
    return createSessionData();
  }

  const createdAt =
    Number(session.createdAt) ||
    Date.now();

  const ttlMs =
    clampTTL(
      session.ttlMs
    );

  const expiresAt =
    Number(session.expiresAt) ||
    createdAt + ttlMs;

  return {
    id:
      safeString(
        session.id,
        150
      ) ||
      createSessionId(),
    botId: safeString(
      session.botId,
      150
    ),
    botUsername: safeString(
      session.botUsername,
      100
    ),
    userId: safeString(
      session.userId,
      150
    ),
    status:
      Object.values(
        SESSION_STATUS
      ).includes(session.status)
        ? session.status
        : SESSION_STATUS.ACTIVE,
    data:
      sanitizeSessionData(
        session.data
      ),
    history: Array.isArray(
      session.history
    )
      ? session.history
          .slice(
            -SESSION_LIMITS.MAX_HISTORY
          )
          .map((item) =>
            sanitizeSessionData(
              item
            )
          )
      : [],
    createdAt,
    updatedAt:
      Number(session.updatedAt) ||
      createdAt,
    expiresAt,
    ttlMs,
  };
}

function createSessionSnapshot(
  session
) {
  return clone(
    normalizeSession(
      session
    )
  );
}

class BotSession {
  constructor(config = {}) {
    this.id =
      safeString(
        config.id,
        150
      ) ||
      createSessionId();

    this.botId = safeString(
      config.botId ||
        config.bot?.id,
      150
    );

    this.botUsername =
      safeString(
        config.botUsername ||
          config.bot?.username,
        100
      );

    this.userId = safeString(
      config.userId ||
        config.user?.id ||
        config.user?.uid,
      150
    );

    this.ttlMs = clampTTL(
      config.ttlMs
    );

    this.data =
      sanitizeSessionData(
        config.data
      );

    this.history = [];

    this.createdAt =
      Number(
        config.createdAt
      ) || Date.now();

    this.updatedAt =
      Number(
        config.updatedAt
      ) || this.createdAt;

    this.expiresAt =
      Number(
        config.expiresAt
      ) ||
      this.createdAt +
        this.ttlMs;

    this.status =
      SESSION_STATUS.ACTIVE;

    this.listeners = new Map();

    this.maxHistory = Math.min(
      Math.max(
        Number(
          config.maxHistory
        ) || SESSION_LIMITS.MAX_HISTORY,
        1
      ),
      SESSION_LIMITS.MAX_HISTORY
    );

    if (
      Array.isArray(
        config.history
      )
    ) {
      this.history =
        config.history
          .slice(-this.maxHistory)
          .map((item) =>
            sanitizeSessionData(
              item
            )
          );
    }

    this.touch();
  }

  on(event, listener) {
    if (
      !event ||
      typeof listener !==
        "function"
    ) {
      return () => {};
    }

    if (
      !this.listeners.has(event)
    ) {
      this.listeners.set(
        event,
        new Set()
      );
    }

    this.listeners
      .get(event)
      .add(listener);

    return () => {
      this.off(
        event,
        listener
      );
    };
  }

  off(event, listener) {
    const listeners =
      this.listeners.get(
        event
      );

    if (!listeners) {
      return;
    }

    listeners.delete(
      listener
    );

    if (
      listeners.size === 0
    ) {
      this.listeners.delete(
        event
      );
    }
  }

  emit(event, payload = {}) {
    const listeners =
      this.listeners.get(
        event
      );

    if (!listeners) {
      return;
    }

    listeners.forEach(
      (listener) => {
        try {
          listener(
            payload
          );
        } catch {
          // Session listeners must never break the runtime.
        }
      }
    );
  }

  touch() {
    if (
      this.status !==
      SESSION_STATUS.ACTIVE
    ) {
      return false;
    }

    const now = Date.now();

    this.updatedAt = now;

    this.expiresAt =
      now + this.ttlMs;

    return true;
  }

  checkExpiration() {
    if (
      this.status !==
      SESSION_STATUS.ACTIVE
    ) {
      return (
        this.status ===
        SESSION_STATUS.EXPIRED
      );
    }

    if (
      Date.now() >=
      this.expiresAt
    ) {
      this.expire();

      return true;
    }

    return false;
  }

  ensureActive() {
    if (
      this.status !==
      SESSION_STATUS.ACTIVE
    ) {
      return false;
    }

    if (
      this.checkExpiration()
    ) {
      return false;
    }

    return true;
  }

  expire() {
    if (
      this.status ===
      SESSION_STATUS.EXPIRED
    ) {
      return;
    }

    this.status =
      SESSION_STATUS.EXPIRED;

    this.updatedAt =
      Date.now();

    const snapshot =
      this.getSnapshot();

    this.emit(
      SESSION_EVENTS.EXPIRED,
      snapshot
    );
  }

  close() {
    if (
      this.status ===
      SESSION_STATUS.CLOSED
    ) {
      return;
    }

    this.status =
      SESSION_STATUS.CLOSED;

    this.updatedAt =
      Date.now();

    const snapshot =
      this.getSnapshot();

    this.emit(
      SESSION_EVENTS.CLOSED,
      snapshot
    );
  }

  reopen() {
    this.status =
      SESSION_STATUS.ACTIVE;

    this.touch();

    return this.getSnapshot();
  }

  reset() {
    this.data = {};
    this.history = [];

    this.status =
      SESSION_STATUS.ACTIVE;

    this.touch();

    const snapshot =
      this.getSnapshot();

    this.emit(
      SESSION_EVENTS.RESET,
      snapshot
    );

    return snapshot;
  }

  get(key, fallback = null) {
    if (
      !this.ensureActive()
    ) {
      return fallback;
    }

    const safeKey =
      safeString(
        key,
        SESSION_LIMITS.MAX_KEY_LENGTH
      );

    if (!safeKey) {
      return fallback;
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        this.data,
        safeKey
      )
    ) {
      return fallback;
    }

    return clone(
      this.data[safeKey]
    );
  }

  set(key, value) {
    if (
      !this.ensureActive()
    ) {
      return false;
    }

    const safeKey =
      safeString(
        key,
        SESSION_LIMITS.MAX_KEY_LENGTH
      );

    if (!safeKey) {
      return false;
    }

    const keys =
      Object.keys(
        this.data
      );

    if (
      !keys.includes(
        safeKey
      ) &&
      keys.length >=
        SESSION_LIMITS.MAX_KEYS
    ) {
      return false;
    }

    this.data[safeKey] =
      sanitizeValue(value);

    this.touch();

    this.emit(
      SESSION_EVENTS.UPDATED,
      {
        key: safeKey,
        value:
          clone(
            this.data[safeKey]
          ),
        session:
          this.getSnapshot(),
      }
    );

    return true;
  }

  setMany(values = {}) {
    if (
      !this.ensureActive()
    ) {
      return false;
    }

    if (
      !values ||
      typeof values !==
        "object" ||
      Array.isArray(values)
    ) {
      return false;
    }

    const sanitized =
      sanitizeSessionData(
        values
      );

    Object.keys(sanitized)
      .slice(
        0,
        SESSION_LIMITS.MAX_KEYS
      )
      .forEach((key) => {
        const existing =
          Object.prototype.hasOwnProperty.call(
            this.data,
            key
          );

        if (
          !existing &&
          Object.keys(
            this.data
          ).length >=
            SESSION_LIMITS.MAX_KEYS
        ) {
          return;
        }

        this.data[key] =
          sanitized[key];
      });

    this.touch();

    this.emit(
      SESSION_EVENTS.UPDATED,
      {
        session:
          this.getSnapshot(),
      }
    );

    return true;
  }

  has(key) {
    if (
      !this.ensureActive()
    ) {
      return false;
    }

    const safeKey =
      safeString(
        key,
        SESSION_LIMITS.MAX_KEY_LENGTH
      );

    return Object.prototype.hasOwnProperty.call(
      this.data,
      safeKey
    );
  }

  delete(key) {
    if (
      !this.ensureActive()
    ) {
      return false;
    }

    const safeKey =
      safeString(
        key,
        SESSION_LIMITS.MAX_KEY_LENGTH
      );

    if (
      !this.has(
        safeKey
      )
    ) {
      return false;
    }

    delete this.data[
      safeKey
    ];

    this.touch();

    this.emit(
      SESSION_EVENTS.UPDATED,
      {
        deleted: safeKey,
        session:
          this.getSnapshot(),
      }
    );

    return true;
  }

  clearData() {
    if (
      !this.ensureActive()
    ) {
      return false;
    }

    this.data = {};

    this.touch();

    this.emit(
      SESSION_EVENTS.UPDATED,
      {
        session:
          this.getSnapshot(),
      }
    );

    return true;
  }

  pushHistory(event) {
    if (
      !this.ensureActive()
    ) {
      return false;
    }

    const record =
      event &&
      typeof event === "object"
        ? sanitizeSessionData(
            event
          )
        : createSessionMessageRecord(
            {
              type: "message",
              text: event,
            }
          );

    this.history.push(
      record
    );

    if (
      this.history.length >
      this.maxHistory
    ) {
      this.history =
        this.history.slice(
          -this.maxHistory
        );
    }

    this.touch();

    return true;
  }

  recordMessage({
    type = "message",
    text = "",
    command = "",
    args = [],
    buttonId = "",
    metadata = {},
  } = {}) {
    if (
      !this.ensureActive()
    ) {
      return false;
    }

    const record =
      createSessionMessageRecord({
        type,
        text,
        command,
        args,
        buttonId,
        metadata,
      });

    this.pushHistory(
      record
    );

    const eventName =
      type === "command"
        ? SESSION_EVENTS.COMMAND
        : type === "button"
        ? SESSION_EVENTS.BUTTON
        : SESSION_EVENTS.MESSAGE;

    this.emit(
      eventName,
      record
    );

    return record;
  }

  getHistory(limit = null) {
    const requested =
      Number(limit);

    if (
      !Number.isFinite(
        requested
      ) ||
      requested <= 0
    ) {
      return clone(
        this.history
      );
    }

    return clone(
      this.history.slice(
        -Math.min(
          requested,
          this.maxHistory
        )
      )
    );
  }

  clearHistory() {
    if (
      !this.ensureActive()
    ) {
      return false;
    }

    this.history = [];

    this.touch();

    return true;
  }

  getRemainingMs() {
    if (
      this.status !==
      SESSION_STATUS.ACTIVE
    ) {
      return 0;
    }

    return Math.max(
      0,
      this.expiresAt -
        Date.now()
    );
  }

  getRemainingSeconds() {
    return Math.ceil(
      this.getRemainingMs() /
        1000
    );
  }

  isActive() {
    return this.ensureActive();
  }

  isExpired() {
    this.checkExpiration();

    return (
      this.status ===
      SESSION_STATUS.EXPIRED
    );
  }

  isClosed() {
    return (
      this.status ===
      SESSION_STATUS.CLOSED
    );
  }

  getSnapshot() {
    return createSessionSnapshot({
      id: this.id,
      botId: this.botId,
      botUsername:
        this.botUsername,
      userId: this.userId,
      status: this.status,
      data: this.data,
      history: this.history,
      createdAt:
        this.createdAt,
      updatedAt:
        this.updatedAt,
      expiresAt:
        this.expiresAt,
      ttlMs: this.ttlMs,
    });
  }

  toJSON() {
    return this.getSnapshot();
  }
}

function createBotSession(
  config = {}
) {
  return new BotSession(
    config
  );
}

function restoreBotSession(
  snapshot
) {
  if (
    !snapshot ||
    typeof snapshot !==
      "object"
  ) {
    return createBotSession();
  }

  return new BotSession({
    id: snapshot.id,
    botId: snapshot.botId,
    botUsername:
      snapshot.botUsername,
    userId: snapshot.userId,
    ttlMs: snapshot.ttlMs,
    data: snapshot.data,
    history: snapshot.history,
    createdAt:
      snapshot.createdAt,
    updatedAt:
      snapshot.updatedAt,
    expiresAt:
      snapshot.expiresAt,
  });
}

function createSessionForBot({
  bot,
  user = null,
  ttlMs = SESSION_LIMITS.DEFAULT_TTL_MS,
  data = {},
} = {}) {
  return createBotSession({
    botId: bot?.id || "",
    botUsername:
      bot?.username || "",
    userId:
      user?.id ||
      user?.uid ||
      "",
    ttlMs,
    data,
  });
}

function isValidSession(
  session
) {
  if (!session) {
    return false;
  }

  if (
    session instanceof BotSession
  ) {
    return session.isActive();
  }

  const normalized =
    normalizeSession(
      session
    );

  return (
    normalized.status ===
      SESSION_STATUS.ACTIVE &&
    !isSessionExpired(
      normalized
    )
  );
}

function getSessionSnapshot(
  session
) {
  if (
    session instanceof BotSession
  ) {
    return session.getSnapshot();
  }

  return createSessionSnapshot(
    session
  );
}

const BotSessionAPI = {
  SESSION_STATUS,
  SESSION_LIMITS,
  SESSION_EVENTS,
  createSessionId,
  sanitizeValue,
  sanitizeSessionData,
  createSessionMessageRecord,
  createSessionData,
  isSessionExpired,
  getSessionRemainingMs,
  normalizeSession,
  createSessionSnapshot,
  createBotSession,
  restoreBotSession,
  createSessionForBot,
  isValidSession,
  getSessionSnapshot,
};

export {
  BotSession,
  BotSessionAPI,
  SESSION_STATUS,
  SESSION_LIMITS,
  SESSION_EVENTS,
  createSessionId,
  sanitizeValue,
  sanitizeSessionData,
  createSessionMessageRecord,
  createSessionData,
  isSessionExpired,
  getSessionRemainingMs,
  normalizeSession,
  createSessionSnapshot,
  createBotSession,
  restoreBotSession,
  createSessionForBot,
  isValidSession,
  getSessionSnapshot,
};

export default BotSession;
