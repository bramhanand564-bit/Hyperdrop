// bot-runtime/BotMessageHandler.js

import {
  normalizeInput,
  parseCommand,
  findCommand,
  createRuntimeId,
  RUNTIME_LIMITS,
} from "./BotRuntime";

const MESSAGE_TYPES = {
  TEXT: "text",
  COMMAND: "command",
  BUTTON: "button",
  START: "start",
  UNKNOWN: "unknown",
};

const MESSAGE_STATUS = {
  RECEIVED: "received",
  PROCESSED: "processed",
  IGNORED: "ignored",
  ERROR: "error",
};

function safeString(value, maxLength = 5000) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().slice(0, maxLength);
}

function createMessageId() {
  return createRuntimeId("msg");
}

function normalizeUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  return {
    id: safeString(user.id || user.uid, 150),
    username: safeString(user.username, 100),
    displayName: safeString(
      user.displayName || user.name,
      150
    ),
  };
}

function normalizeBot(bot) {
  if (!bot || typeof bot !== "object") {
    return null;
  }

  return {
    id: safeString(bot.id, 150),
    username: safeString(bot.username, 100),
    name: safeString(bot.name, 150),
    enabled: bot.enabled !== false,
  };
}

function createMessageRecord({
  input,
  bot,
  user,
  type,
  status = MESSAGE_STATUS.RECEIVED,
  metadata = {},
} = {}) {
  return {
    id: input?.id || createMessageId(),
    botId: bot?.id || "",
    botUsername: bot?.username || "",
    userId: user?.id || "",
    type,
    status,
    text: safeString(
      input?.text,
      RUNTIME_LIMITS.MAX_INPUT_LENGTH
    ),
    buttonId: safeString(input?.buttonId, 100),
    command: safeString(input?.command, 100),
    args: Array.isArray(input?.args)
      ? input.args.slice(0, 50).map((item) =>
          safeString(item, 200)
        )
      : [],
    timestamp: input?.timestamp || Date.now(),
    metadata:
      metadata && typeof metadata === "object"
        ? metadata
        : {},
  };
}

function classifyMessage(input) {
  if (!input) {
    return MESSAGE_TYPES.UNKNOWN;
  }

  if (input.buttonId) {
    return MESSAGE_TYPES.BUTTON;
  }

  if (input.command) {
    return MESSAGE_TYPES.COMMAND;
  }

  const text = safeString(input.text);

  if (!text) {
    return MESSAGE_TYPES.UNKNOWN;
  }

  if (text === "/start" || text.startsWith("/start ")) {
    return MESSAGE_TYPES.START;
  }

  if (text.startsWith("/")) {
    return MESSAGE_TYPES.COMMAND;
  }

  return MESSAGE_TYPES.TEXT;
}

function parseMessage(message) {
  const input = normalizeInput(message);

  const type = classifyMessage(input);

  if (
    type === MESSAGE_TYPES.COMMAND ||
    type === MESSAGE_TYPES.START
  ) {
    const parsed = parseCommand(input.text);

    if (parsed) {
      return {
        ...input,
        type,
        command: parsed.command,
        args: parsed.args,
        rawCommand: parsed.raw,
      };
    }
  }

  return {
    ...input,
    type,
  };
}

function validateMessageInput(message) {
  if (
    message === null ||
    message === undefined
  ) {
    return {
      valid: false,
      errors: ["Message is required."],
    };
  }

  const input = normalizeInput(message);

  if (
    !input.text &&
    !input.command &&
    !input.buttonId
  ) {
    return {
      valid: false,
      errors: ["Message contains no usable input."],
    };
  }

  if (
    input.text.length >
    RUNTIME_LIMITS.MAX_INPUT_LENGTH
  ) {
    return {
      valid: false,
      errors: ["Message is too long."],
    };
  }

  return {
    valid: true,
    errors: [],
    input,
  };
}

function getCommandFromMessage(bot, message) {
  const parsed = parseMessage(message);

  if (
    parsed.type !== MESSAGE_TYPES.COMMAND &&
    parsed.type !== MESSAGE_TYPES.START
  ) {
    return null;
  }

  if (!parsed.command) {
    return null;
  }

  return findCommand(bot, parsed.command);
}

function isStartMessage(message) {
  const parsed = parseMessage(message);

  return parsed.type === MESSAGE_TYPES.START;
}

function isCommandMessage(message) {
  const parsed = parseMessage(message);

  return parsed.type === MESSAGE_TYPES.COMMAND ||
    parsed.type === MESSAGE_TYPES.START;
}

function isButtonMessage(message) {
  const parsed = parseMessage(message);

  return parsed.type === MESSAGE_TYPES.BUTTON;
}

function isTextMessage(message) {
  const parsed = parseMessage(message);

  return parsed.type === MESSAGE_TYPES.TEXT;
}

function getMessageText(message) {
  const parsed = parseMessage(message);

  return safeString(parsed.text);
}

function getMessageCommand(message) {
  const parsed = parseMessage(message);

  return safeString(parsed.command, 100);
}

function getMessageArgs(message) {
  const parsed = parseMessage(message);

  return Array.isArray(parsed.args)
    ? parsed.args.slice(0, 50)
    : [];
}

function getMessageButtonId(message) {
  const parsed = parseMessage(message);

  return safeString(parsed.buttonId, 100);
}

function createHandlerResult({
  handled = false,
  type = MESSAGE_TYPES.UNKNOWN,
  status = MESSAGE_STATUS.IGNORED,
  message = null,
  command = null,
  args = [],
  buttonId = null,
  reason = null,
  error = null,
} = {}) {
  return {
    handled,
    type,
    status,
    message,
    command,
    args,
    buttonId,
    reason,
    error,
    timestamp: Date.now(),
  };
}

class BotMessageHandler {
  constructor(config = {}) {
    this.bot = normalizeBot(config.bot);

    this.user = normalizeUser(config.user);

    this.runtime = config.runtime || null;

    this.listeners = new Map();

    this.messageHistory = [];

    this.maxHistory = Math.min(
      Math.max(
        Number(config.maxHistory) || 100,
        1
      ),
      500
    );
  }

  setBot(bot) {
    this.bot = normalizeBot(bot);
  }

  setUser(user) {
    this.user = normalizeUser(user);
  }

  setRuntime(runtime) {
    this.runtime = runtime;
  }

  on(event, listener) {
    if (
      !event ||
      typeof listener !== "function"
    ) {
      return () => {};
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(listener);

    return () => {
      this.off(event, listener);
    };
  }

  off(event, listener) {
    const listeners = this.listeners.get(event);

    if (!listeners) {
      return;
    }

    listeners.delete(listener);

    if (listeners.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit(event, payload) {
    const listeners = this.listeners.get(event);

    if (!listeners) {
      return;
    }

    listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch {
        // Listener errors must never break message handling.
      }
    });
  }

  addToHistory(record) {
    this.messageHistory.push(record);

    if (
      this.messageHistory.length >
      this.maxHistory
    ) {
      this.messageHistory =
        this.messageHistory.slice(
          -this.maxHistory
        );
    }
  }

  clearHistory() {
    this.messageHistory = [];
  }

  getHistory() {
    return this.messageHistory.map((item) => ({
      ...item,
      metadata:
        item.metadata &&
        typeof item.metadata === "object"
          ? { ...item.metadata }
          : {},
    }));
  }

  canHandle() {
    if (!this.bot) {
      return {
        valid: false,
        reason: "BOT_MISSING",
      };
    }

    if (this.bot.enabled === false) {
      return {
        valid: false,
        reason: "BOT_DISABLED",
      };
    }

    if (!this.runtime) {
      return {
        valid: false,
        reason: "RUNTIME_MISSING",
      };
    }

    if (
      typeof this.runtime.isRunning ===
      "function" &&
      !this.runtime.isRunning()
    ) {
      return {
        valid: false,
        reason: "RUNTIME_NOT_RUNNING",
      };
    }

    return {
      valid: true,
      reason: null,
    };
  }

  handle(message) {
    const capability = this.canHandle();

    if (!capability.valid) {
      return createHandlerResult({
        handled: false,
        status: MESSAGE_STATUS.IGNORED,
        reason: capability.reason,
      });
    }

    const validation =
      validateMessageInput(message);

    if (!validation.valid) {
      const result = createHandlerResult({
        handled: false,
        status: MESSAGE_STATUS.ERROR,
        reason: "INVALID_MESSAGE",
        error: validation.errors,
      });

      this.emit("error", result);

      return result;
    }

    const parsed = parseMessage(
      validation.input
    );

    const record = createMessageRecord({
      input: parsed,
      bot: this.bot,
      user: this.user,
      type: parsed.type,
      metadata: {
        handlerId: this.bot.id,
      },
    });

    this.addToHistory(record);

    this.emit("message", record);

    try {
      let result;

      if (
        parsed.type === MESSAGE_TYPES.BUTTON
      ) {
        result = this.handleButton(parsed);
      } else if (
        parsed.type === MESSAGE_TYPES.START
      ) {
        result = this.handleStart(parsed);
      } else if (
        parsed.type === MESSAGE_TYPES.COMMAND
      ) {
        result = this.handleCommand(parsed);
      } else if (
        parsed.type === MESSAGE_TYPES.TEXT
      ) {
        result = this.handleText(parsed);
      } else {
        result = createHandlerResult({
          handled: false,
          type: MESSAGE_TYPES.UNKNOWN,
          status: MESSAGE_STATUS.IGNORED,
          message: record,
          reason: "UNKNOWN_MESSAGE_TYPE",
        });
      }

      this.emit("processed", result);

      return result;
    } catch (error) {
      const result = createHandlerResult({
        handled: false,
        type: parsed.type,
        status: MESSAGE_STATUS.ERROR,
        message: record,
        error: [
          safeString(
            error?.message ||
              "Message handling failed.",
            500
          ),
        ],
      });

      this.emit("error", result);

      return result;
    }
  }

  handleStart(message) {
    if (!this.runtime) {
      return createHandlerResult({
        handled: false,
        type: MESSAGE_TYPES.START,
        status: MESSAGE_STATUS.ERROR,
        reason: "RUNTIME_MISSING",
      });
    }

    const result =
      this.runtime.handleCommand(
        "start",
        message.args || []
      );

    return createHandlerResult({
      handled: Boolean(result?.handled),
      type: MESSAGE_TYPES.START,
      status: result?.handled
        ? MESSAGE_STATUS.PROCESSED
        : MESSAGE_STATUS.IGNORED,
      message,
      command: "start",
      args: message.args || [],
      error: result?.error || null,
    });
  }

  handleCommand(message) {
    if (!this.runtime) {
      return createHandlerResult({
        handled: false,
        type: MESSAGE_TYPES.COMMAND,
        status: MESSAGE_STATUS.ERROR,
        reason: "RUNTIME_MISSING",
      });
    }

    const command = safeString(
      message.command,
      100
    );

    if (!command) {
      return createHandlerResult({
        handled: false,
        type: MESSAGE_TYPES.COMMAND,
        status: MESSAGE_STATUS.IGNORED,
        message,
        reason: "COMMAND_MISSING",
      });
    }

    const configuredCommand =
      findCommand(this.runtime.bot, command);

    if (!configuredCommand) {
      return createHandlerResult({
        handled: false,
        type: MESSAGE_TYPES.COMMAND,
        status: MESSAGE_STATUS.IGNORED,
        message,
        command,
        args: message.args || [],
        reason: "COMMAND_NOT_FOUND",
      });
    }

    const result =
      this.runtime.handleCommand(
        command,
        message.args || []
      );

    return createHandlerResult({
      handled: Boolean(result?.handled),
      type: MESSAGE_TYPES.COMMAND,
      status: result?.handled
        ? MESSAGE_STATUS.PROCESSED
        : MESSAGE_STATUS.IGNORED,
      message,
      command,
      args: message.args || [],
      error: result?.error || null,
    });
  }

  handleButton(message) {
    if (!this.runtime) {
      return createHandlerResult({
        handled: false,
        type: MESSAGE_TYPES.BUTTON,
        status: MESSAGE_STATUS.ERROR,
        reason: "RUNTIME_MISSING",
      });
    }

    const buttonId = safeString(
      message.buttonId,
      100
    );

    if (!buttonId) {
      return createHandlerResult({
        handled: false,
        type: MESSAGE_TYPES.BUTTON,
        status: MESSAGE_STATUS.IGNORED,
        message,
        reason: "BUTTON_ID_MISSING",
      });
    }

    const result =
      this.runtime.handleButton(buttonId);

    return createHandlerResult({
      handled: Boolean(result?.handled),
      type: MESSAGE_TYPES.BUTTON,
      status: result?.handled
        ? MESSAGE_STATUS.PROCESSED
        : MESSAGE_STATUS.IGNORED,
      message,
      buttonId,
      error: result?.error || null,
    });
  }

  handleText(message) {
    if (!this.runtime) {
      return createHandlerResult({
        handled: false,
        type: MESSAGE_TYPES.TEXT,
        status: MESSAGE_STATUS.ERROR,
        reason: "RUNTIME_MISSING",
      });
    }

    const text = safeString(
      message.text,
      RUNTIME_LIMITS.MAX_INPUT_LENGTH
    );

    if (!text) {
      return createHandlerResult({
        handled: false,
        type: MESSAGE_TYPES.TEXT,
        status: MESSAGE_STATUS.IGNORED,
        message,
        reason: "TEXT_EMPTY",
      });
    }

    const result =
      this.runtime.handleText(text);

    return createHandlerResult({
      handled: Boolean(result?.handled),
      type: MESSAGE_TYPES.TEXT,
      status: result?.handled
        ? MESSAGE_STATUS.PROCESSED
        : MESSAGE_STATUS.IGNORED,
      message,
      error: result?.error || null,
    });
  }

  process(message) {
    return this.handle(message);
  }

  receive(message) {
    return this.handle(message);
  }

  getLastMessage() {
    if (this.messageHistory.length === 0) {
      return null;
    }

    return {
      ...this.messageHistory[
        this.messageHistory.length - 1
      ],
    };
  }

  getStats() {
    const stats = {
      total: this.messageHistory.length,
      text: 0,
      commands: 0,
      starts: 0,
      buttons: 0,
      unknown: 0,
      processed: 0,
      ignored: 0,
      errors: 0,
    };

    this.messageHistory.forEach((message) => {
      if (message.type === MESSAGE_TYPES.TEXT) {
        stats.text += 1;
      }

      if (
        message.type === MESSAGE_TYPES.COMMAND
      ) {
        stats.commands += 1;
      }

      if (
        message.type === MESSAGE_TYPES.START
      ) {
        stats.starts += 1;
      }

      if (
        message.type === MESSAGE_TYPES.BUTTON
      ) {
        stats.buttons += 1;
      }

      if (
        message.type === MESSAGE_TYPES.UNKNOWN
      ) {
        stats.unknown += 1;
      }

      if (
        message.status === MESSAGE_STATUS.PROCESSED
      ) {
        stats.processed += 1;
      }

      if (
        message.status === MESSAGE_STATUS.IGNORED
      ) {
        stats.ignored += 1;
      }

      if (
        message.status === MESSAGE_STATUS.ERROR
      ) {
        stats.errors += 1;
      }
    });

    return stats;
  }
}

function createBotMessageHandler(config = {}) {
  return new BotMessageHandler(config);
}

function handleBotMessage({
  bot,
  user = null,
  runtime = null,
  message,
} = {}) {
  const handler =
    createBotMessageHandler({
      bot,
      user,
      runtime,
    });

  return handler.handle(message);
}

const BotMessageHandlerAPI = {
  MESSAGE_TYPES,
  MESSAGE_STATUS,
  createMessageId,
  normalizeUser,
  normalizeBot,
  createMessageRecord,
  classifyMessage,
  parseMessage,
  validateMessageInput,
  getCommandFromMessage,
  isStartMessage,
  isCommandMessage,
  isButtonMessage,
  isTextMessage,
  getMessageText,
  getMessageCommand,
  getMessageArgs,
  getMessageButtonId,
  createHandlerResult,
  createBotMessageHandler,
  handleBotMessage,
};

export {
  BotMessageHandler,
  BotMessageHandlerAPI,
  MESSAGE_TYPES,
  MESSAGE_STATUS,
  createMessageId,
  normalizeUser,
  normalizeBot,
  createMessageRecord,
  classifyMessage,
  parseMessage,
  validateMessageInput,
  getCommandFromMessage,
  isStartMessage,
  isCommandMessage,
  isButtonMessage,
  isTextMessage,
  getMessageText,
  getMessageCommand,
  getMessageArgs,
  getMessageButtonId,
  createHandlerResult,
  createBotMessageHandler,
  handleBotMessage,
};

export default BotMessageHandler;
