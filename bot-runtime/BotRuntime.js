// bot-runtime/BotRuntime.js

import {
  validateBot,
  normalizeBotConfig,
  normalizeCommandName,
} from "../security/BotValidator";

import { normalizePermissions } from "../security/PermissionManager";

import {
  validateURL,
  canUseBotURL,
  getSafeURL,
} from "../security/URLValidator";

const RUNTIME_STATUS = {
  IDLE: "idle",
  RUNNING: "running",
  STOPPED: "stopped",
  ERROR: "error",
};

const RUNTIME_EVENTS = {
  START: "runtime.start",
  STOP: "runtime.stop",
  MESSAGE: "runtime.message",
  COMMAND: "runtime.command",
  BUTTON: "runtime.button",
  RESPONSE: "runtime.response",
  ERROR: "runtime.error",
};

const RUNTIME_LIMITS = {
  MAX_INPUT_LENGTH: 5000,
  MAX_OUTPUT_LENGTH: 5000,
  MAX_BUTTONS: 100,
  MAX_COMMAND_DEPTH: 3,
  MAX_SESSION_KEYS: 50,
  MAX_SESSION_VALUE_LENGTH: 1000,
};

const RESPONSE_TYPES = {
  TEXT: "text",
  BUTTONS: "buttons",
  LINK: "link",
};

const BUTTON_TYPES = {
  TEXT: "text",
  URL: "url",
  COMMAND: "command",
};

function createRuntimeId(prefix = "runtime") {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function safeString(value, maxLength = RUNTIME_LIMITS.MAX_OUTPUT_LENGTH) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().slice(0, maxLength);
}

function normalizeInput(message) {
  if (typeof message === "string") {
    return {
      id: createRuntimeId("message"),
      text: safeString(message, RUNTIME_LIMITS.MAX_INPUT_LENGTH),
      type: "text",
      timestamp: Date.now(),
    };
  }

  if (!message || typeof message !== "object") {
    return {
      id: createRuntimeId("message"),
      text: "",
      type: "text",
      timestamp: Date.now(),
    };
  }

  return {
    id: safeString(message.id, 100) || createRuntimeId("message"),
    text: safeString(
      message.text || message.message || "",
      RUNTIME_LIMITS.MAX_INPUT_LENGTH
    ),
    type: safeString(message.type, 50) || "text",
    buttonId: safeString(message.buttonId, 100),
    command: safeString(message.command, 100),
    timestamp: Number(message.timestamp) || Date.now(),
    metadata:
      message.metadata && typeof message.metadata === "object"
        ? message.metadata
        : {},
  };
}

function normalizeSession(session) {
  if (!session || typeof session !== "object") {
    return {};
  }

  const output = {};
  const keys = Object.keys(session).slice(
    0,
    RUNTIME_LIMITS.MAX_SESSION_KEYS
  );

  keys.forEach((key) => {
    const safeKey = safeString(key, 100);

    if (!safeKey) {
      return;
    }

    const value = session[key];

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      output[safeKey] = safeString(
        value,
        RUNTIME_LIMITS.MAX_SESSION_VALUE_LENGTH
      );
      return;
    }

    if (value === null) {
      output[safeKey] = null;
    }
  });

  return output;
}

function cloneObject(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function normalizeRuntimeBot(bot) {
  if (!bot || typeof bot !== "object") {
    return null;
  }

  try {
    return normalizeBotConfig(cloneObject(bot));
  } catch {
    return cloneObject(bot);
  }
}

function getBotCommands(bot) {
  if (!bot || !Array.isArray(bot.commands)) {
    return [];
  }

  return bot.commands.filter(
    (command) =>
      command &&
      typeof command === "object" &&
      command.enabled !== false
  );
}

function getBotButtons(bot) {
  if (!bot || !Array.isArray(bot.buttons)) {
    return [];
  }

  return bot.buttons.slice(0, RUNTIME_LIMITS.MAX_BUTTONS);
}

function findCommand(bot, commandName) {
  const normalizedName = normalizeCommandName(commandName);

  if (!normalizedName) {
    return null;
  }

  return (
    getBotCommands(bot).find((command) => {
      const name = normalizeCommandName(command.name);
      return name === normalizedName;
    }) || null
  );
}

function findButton(bot, buttonId) {
  const normalizedId = safeString(buttonId, 100);

  if (!normalizedId) {
    return null;
  }

  return (
    getBotButtons(bot).find((button) => {
      const id = safeString(
        button.id || button.buttonId || button.name || button.label,
        100
      );

      return id === normalizedId;
    }) || null
  );
}

function parseCommand(text) {
  const value = safeString(text, RUNTIME_LIMITS.MAX_INPUT_LENGTH);

  if (!value.startsWith("/")) {
    return null;
  }

  const withoutSlash = value.slice(1).trim();

  if (!withoutSlash) {
    return null;
  }

  const parts = withoutSlash.split(/\s+/);
  const command = normalizeCommandName(parts.shift());

  return {
    command,
    args: parts.slice(0, 50),
    raw: value,
  };
}

function createTextResponse(text, metadata = {}) {
  return {
    type: RESPONSE_TYPES.TEXT,
    text: safeString(text),
    buttons: [],
    link: null,
    metadata,
  };
}

function createButtonsResponse(text, buttons = [], metadata = {}) {
  return {
    type: RESPONSE_TYPES.BUTTONS,
    text: safeString(text),
    buttons: buttons.slice(0, RUNTIME_LIMITS.MAX_BUTTONS),
    link: null,
    metadata,
  };
}

function createLinkResponse(text, url, metadata = {}) {
  return {
    type: RESPONSE_TYPES.LINK,
    text: safeString(text),
    buttons: [],
    link: url,
    metadata,
  };
}

function normalizeButton(button) {
  if (!button || typeof button !== "object") {
    return null;
  }

  const id = safeString(
    button.id || button.buttonId || button.name || button.label,
    100
  );

  const label = safeString(
    button.label || button.text || button.name || id,
    50
  );

  const type = safeString(button.type, 30).toLowerCase();

  if (!id || !label) {
    return null;
  }

  if (!Object.values(BUTTON_TYPES).includes(type)) {
    return null;
  }

  const normalized = {
    id,
    label,
    type,
  };

  if (type === BUTTON_TYPES.COMMAND) {
    const command = normalizeCommandName(
      button.command || button.value || ""
    );

    if (!command) {
      return null;
    }

    normalized.command = command;
  }

  if (type === BUTTON_TYPES.URL) {
    const url = safeString(button.url || button.value || "", 2048);

    const validation = validateURL(url);

    if (!validation.valid || !canUseBotURL(url)) {
      return null;
    }

    normalized.url = getSafeURL(url) || url;
  }

  if (type === BUTTON_TYPES.TEXT) {
    normalized.text = safeString(
      button.text || button.value || button.label,
      RUNTIME_LIMITS.MAX_OUTPUT_LENGTH
    );
  }

  return normalized;
}

function normalizeResponseButtons(buttons) {
  if (!Array.isArray(buttons)) {
    return [];
  }

  const output = [];

  buttons.slice(0, RUNTIME_LIMITS.MAX_BUTTONS).forEach((button) => {
    const normalized = normalizeButton(button);

    if (normalized) {
      output.push(normalized);
    }
  });

  return output;
}

function normalizeCommandResponse(command) {
  if (!command || typeof command !== "object") {
    return createTextResponse("This command is not available.");
  }

  const type = safeString(
    command.responseType || command.type || RESPONSE_TYPES.TEXT,
    30
  ).toLowerCase();

  const responseText = safeString(
    command.response ||
      command.message ||
      command.text ||
      "Command executed successfully."
  );

  if (type === RESPONSE_TYPES.BUTTONS) {
    return createButtonsResponse(
      responseText,
      normalizeResponseButtons(command.buttons)
    );
  }

  if (type === RESPONSE_TYPES.LINK) {
    const url = safeString(command.url || command.link || "", 2048);

    const validation = validateURL(url);

    if (!validation.valid || !canUseBotURL(url)) {
      return createTextResponse(
        "This link is not available for security reasons."
      );
    }

    return createLinkResponse(
      responseText || "Open link",
      getSafeURL(url) || url
    );
  }

  return createTextResponse(responseText);
}

function getWelcomeResponse(bot) {
  const welcome = safeString(
    bot?.welcomeMessage ||
      bot?.welcome ||
      `Welcome to ${safeString(bot?.name || "this bot")}.`
  );

  const buttons = normalizeResponseButtons(bot?.buttons);

  if (buttons.length > 0) {
    return createButtonsResponse(welcome, buttons);
  }

  return createTextResponse(welcome);
}

function getUnknownCommandResponse(bot) {
  const botName = safeString(bot?.name || "this bot");

  return createTextResponse(
    `Sorry, I don't recognize that command. Use /start to see what ${botName} can do.`
  );
}

function getDisabledBotResponse() {
  return createTextResponse(
    "This bot is currently unavailable."
  );
}

function getInvalidBotResponse() {
  return createTextResponse(
    "This bot configuration is invalid or unavailable."
  );
}

function getErrorResponse() {
  return createTextResponse(
    "Something went wrong while processing your request."
  );
}

function buildRuntimeContext({
  bot,
  user = null,
  session = {},
  permissions = [],
  metadata = {},
} = {}) {
  return {
    bot: cloneObject(bot),
    user: cloneObject(user),
    session: normalizeSession(session),
    permissions: normalizePermissions(permissions),
    metadata:
      metadata && typeof metadata === "object"
        ? cloneObject(metadata)
        : {},
  };
}

function validateRuntimeBot(bot) {
  if (!bot || typeof bot !== "object") {
    return {
      valid: false,
      errors: ["Bot configuration is missing."],
      warnings: [],
    };
  }

  try {
    const result = validateBot(bot);

    return {
      valid: Boolean(result?.valid),
      errors: Array.isArray(result?.errors)
        ? result.errors
        : [],
      warnings: Array.isArray(result?.warnings)
        ? result.warnings
        : [],
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        safeString(error?.message || "Bot validation failed.", 500),
      ],
      warnings: [],
    };
  }
}

function createRuntimeResult({
  handled = false,
  response = null,
  command = null,
  button = null,
  error = null,
  context = null,
  event = RUNTIME_EVENTS.RESPONSE,
} = {}) {
  return {
    handled,
    event,
    response,
    command,
    button,
    error,
    session: context?.session || {},
    timestamp: Date.now(),
  };
}

class BotRuntime {
  constructor(config = {}) {
    this.id = safeString(config.id, 100) || createRuntimeId();

    this.bot = normalizeRuntimeBot(config.bot);

    this.user = cloneObject(config.user || null);

    this.session = normalizeSession(config.session);

    this.permissions = normalizePermissions(
      config.permissions || []
    );

    this.metadata =
      config.metadata && typeof config.metadata === "object"
        ? cloneObject(config.metadata)
        : {};

    this.status = RUNTIME_STATUS.IDLE;

    this.commandDepth = 0;

    this.eventListeners = new Map();

    this.lastResult = null;

    this.error = null;

    this.startedAt = null;
  }

  on(event, listener) {
    if (
      typeof listener !== "function" ||
      !safeString(event, 100)
    ) {
      return () => {};
    }

    const eventName = safeString(event, 100);

    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }

    this.eventListeners.get(eventName).add(listener);

    return () => {
      this.off(eventName, listener);
    };
  }

  off(event, listener) {
    const listeners = this.eventListeners.get(event);

    if (!listeners) {
      return;
    }

    listeners.delete(listener);

    if (listeners.size === 0) {
      this.eventListeners.delete(event);
    }
  }

  emit(event, payload = {}) {
    const listeners = this.eventListeners.get(event);

    if (!listeners) {
      return;
    }

    listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch {
        // Runtime event listeners must never break bot execution.
      }
    });
  }

  setBot(bot) {
    this.bot = normalizeRuntimeBot(bot);
    this.error = null;
  }

  setUser(user) {
    this.user = cloneObject(user || null);
  }

  setSession(session) {
    this.session = normalizeSession(session);
  }

  updateSession(values = {}) {
    if (!values || typeof values !== "object") {
      return this.session;
    }

    this.session = normalizeSession({
      ...this.session,
      ...values,
    });

    return this.session;
  }

  clearSession() {
    this.session = {};
  }

  setPermissions(permissions = []) {
    this.permissions = normalizePermissions(permissions);
  }

  validate() {
    return validateRuntimeBot(this.bot);
  }

  start() {
    const validation = this.validate();

    if (!validation.valid) {
      this.status = RUNTIME_STATUS.ERROR;
      this.error = validation.errors;

      const result = createRuntimeResult({
        handled: false,
        response: getInvalidBotResponse(),
        error: validation.errors,
        context: this.getContext(),
        event: RUNTIME_EVENTS.ERROR,
      });

      this.lastResult = result;

      this.emit(RUNTIME_EVENTS.ERROR, result);

      return result;
    }

    if (this.bot?.enabled === false) {
      this.status = RUNTIME_STATUS.STOPPED;

      return createRuntimeResult({
        handled: false,
        response: getDisabledBotResponse(),
        context: this.getContext(),
      });
    }

    this.status = RUNTIME_STATUS.RUNNING;
    this.startedAt = Date.now();
    this.error = null;

    const result = createRuntimeResult({
      handled: true,
      response: getWelcomeResponse(this.bot),
      context: this.getContext(),
      event: RUNTIME_EVENTS.START,
    });

    this.lastResult = result;

    this.emit(RUNTIME_EVENTS.START, result);

    return result;
  }

  stop() {
    this.status = RUNTIME_STATUS.STOPPED;
    this.commandDepth = 0;

    const result = createRuntimeResult({
      handled: true,
      context: this.getContext(),
      event: RUNTIME_EVENTS.STOP,
    });

    this.lastResult = result;

    this.emit(RUNTIME_EVENTS.STOP, result);

    return result;
  }

  reset() {
    this.session = {};
    this.commandDepth = 0;
    this.lastResult = null;
    this.error = null;
  }

  ensureRunning() {
    if (this.status === RUNTIME_STATUS.RUNNING) {
      return true;
    }

    return false;
  }

  handleMessage(message) {
    if (!this.ensureRunning()) {
      return createRuntimeResult({
        handled: false,
        response: getDisabledBotResponse(),
        context: this.getContext(),
      });
    }

    const input = normalizeInput(message);

    this.emit(RUNTIME_EVENTS.MESSAGE, {
      input,
      runtimeId: this.id,
    });

    if (!input.text && !input.buttonId && !input.command) {
      return createRuntimeResult({
        handled: false,
        response: createTextResponse(
          "Please send a message or choose an option."
        ),
        context: this.getContext(),
      });
    }

    if (input.buttonId) {
      return this.handleButton(input.buttonId);
    }

    if (input.command) {
      return this.handleCommand(input.command, []);
    }

    const parsedCommand = parseCommand(input.text);

    if (parsedCommand) {
      return this.handleCommand(
        parsedCommand.command,
        parsedCommand.args
      );
    }

    return this.handleText(input.text);
  }

  handleText(text) {
    const value = safeString(
      text,
      RUNTIME_LIMITS.MAX_INPUT_LENGTH
    );

    if (!value) {
      return createRuntimeResult({
        handled: false,
        response: createTextResponse(
          "Please enter a message."
        ),
        context: this.getContext(),
      });
    }

    const startCommand = findCommand(this.bot, "start");

    if (
      startCommand &&
      value.toLowerCase() === "start"
    ) {
      return this.executeCommand(startCommand, []);
    }

    return createRuntimeResult({
      handled: false,
      response: createTextResponse(
        "I can only process commands and buttons configured for this bot."
      ),
      context: this.getContext(),
    });
  }

  handleCommand(commandName, args = []) {
    const normalizedCommand = normalizeCommandName(
      commandName
    );

    if (!normalizedCommand) {
      return createRuntimeResult({
        handled: false,
        response: getUnknownCommandResponse(this.bot),
        context: this.getContext(),
      });
    }

    const command = findCommand(
      this.bot,
      normalizedCommand
    );

    this.emit(RUNTIME_EVENTS.COMMAND, {
      command: normalizedCommand,
      args: Array.isArray(args) ? args.slice(0, 50) : [],
      runtimeId: this.id,
    });

    if (!command) {
      const result = createRuntimeResult({
        handled: false,
        response: getUnknownCommandResponse(this.bot),
        command: normalizedCommand,
        context: this.getContext(),
      });

      this.lastResult = result;

      return result;
    }

    return this.executeCommand(
      command,
      Array.isArray(args) ? args.slice(0, 50) : []
    );
  }

  executeCommand(command, args = []) {
    if (!command) {
      return createRuntimeResult({
        handled: false,
        response: getUnknownCommandResponse(this.bot),
        context: this.getContext(),
      });
    }

    if (
      this.commandDepth >=
      RUNTIME_LIMITS.MAX_COMMAND_DEPTH
    ) {
      const result = createRuntimeResult({
        handled: false,
        response: createTextResponse(
          "This command chain is too deep."
        ),
        error: "MAX_COMMAND_DEPTH",
        context: this.getContext(),
      });

      this.lastResult = result;

      return result;
    }

    this.commandDepth += 1;

    try {
      const response = normalizeCommandResponse(command);

      const metadata = {
        command: normalizeCommandName(command.name),
        args: args.slice(0, 50),
        runtimeId: this.id,
      };

      response.metadata = {
        ...response.metadata,
        ...metadata,
      };

      const result = createRuntimeResult({
        handled: true,
        response,
        command: cloneObject(command),
        context: this.getContext(),
      });

      this.lastResult = result;

      this.emit(RUNTIME_EVENTS.RESPONSE, result);

      return result;
    } catch (error) {
      const result = createRuntimeResult({
        handled: false,
        response: getErrorResponse(),
        error: safeString(
          error?.message || "Command execution failed.",
          500
        ),
        command: cloneObject(command),
        context: this.getContext(),
        event: RUNTIME_EVENTS.ERROR,
      });

      this.lastResult = result;

      this.emit(RUNTIME_EVENTS.ERROR, result);

      return result;
    } finally {
      this.commandDepth = Math.max(
        0,
        this.commandDepth - 1
      );
    }
  }

  handleButton(buttonId) {
    const button = findButton(this.bot, buttonId);

    this.emit(RUNTIME_EVENTS.BUTTON, {
      buttonId: safeString(buttonId, 100),
      button: cloneObject(button),
      runtimeId: this.id,
    });

    if (!button) {
      const result = createRuntimeResult({
        handled: false,
        response: createTextResponse(
          "That button is no longer available."
        ),
        button: null,
        context: this.getContext(),
      });

      this.lastResult = result;

      return result;
    }

    if (button.type === BUTTON_TYPES.COMMAND) {
      return this.handleCommand(
        button.command,
        []
      );
    }

    if (button.type === BUTTON_TYPES.URL) {
      const validation = validateURL(button.url);

      if (
        !validation.valid ||
        !canUseBotURL(button.url)
      ) {
        const result = createRuntimeResult({
          handled: false,
          response: createTextResponse(
            "This link cannot be opened."
          ),
          button: cloneObject(button),
          error: "UNSAFE_URL",
          context: this.getContext(),
        });

        this.lastResult = result;

        return result;
      }

      const safeURL = getSafeURL(button.url);

      const result = createRuntimeResult({
        handled: true,
        response: createLinkResponse(
          button.label,
          safeURL || button.url
        ),
        button: cloneObject(button),
        context: this.getContext(),
      });

      this.lastResult = result;

      this.emit(RUNTIME_EVENTS.RESPONSE, result);

      return result;
    }

    const result = createRuntimeResult({
      handled: true,
      response: createTextResponse(
        button.text || button.label
      ),
      button: cloneObject(button),
      context: this.getContext(),
    });

    this.lastResult = result;

    this.emit(RUNTIME_EVENTS.RESPONSE, result);

    return result;
  }

  getContext() {
    return buildRuntimeContext({
      bot: this.bot,
      user: this.user,
      session: this.session,
      permissions: this.permissions,
      metadata: this.metadata,
    });
  }

  getState() {
    return {
      id: this.id,
      status: this.status,
      botId: safeString(this.bot?.id, 100),
      botUsername: safeString(
        this.bot?.username,
        100
      ),
      session: cloneObject(this.session),
      permissions: [...this.permissions],
      startedAt: this.startedAt,
      lastResult: cloneObject(this.lastResult),
      error: cloneObject(this.error),
    };
  }

  isRunning() {
    return this.status === RUNTIME_STATUS.RUNNING;
  }

  isStopped() {
    return this.status === RUNTIME_STATUS.STOPPED;
  }

  getLastResult() {
    return cloneObject(this.lastResult);
  }
}

function createBotRuntime(config = {}) {
  return new BotRuntime(config);
}

function runBotMessage({
  bot,
  message,
  user = null,
  session = {},
  permissions = [],
  metadata = {},
} = {}) {
  const runtime = createBotRuntime({
    bot,
    user,
    session,
    permissions,
    metadata,
  });

  const startResult = runtime.start();

  if (!runtime.isRunning()) {
    return startResult;
  }

  return runtime.handleMessage(message);
}

const BotRuntimeAPI = {
  RUNTIME_STATUS,
  RUNTIME_EVENTS,
  RUNTIME_LIMITS,
  RESPONSE_TYPES,
  BUTTON_TYPES,
  createRuntimeId,
  normalizeInput,
  normalizeSession,
  normalizeRuntimeBot,
  findCommand,
  findButton,
  parseCommand,
  normalizeButton,
  normalizeResponseButtons,
  normalizeCommandResponse,
  validateRuntimeBot,
  createBotRuntime,
  runBotMessage,
};

export {
  BotRuntime,
  BotRuntimeAPI,
  RUNTIME_STATUS,
  RUNTIME_EVENTS,
  RUNTIME_LIMITS,
  RESPONSE_TYPES,
  BUTTON_TYPES,
  createRuntimeId,
  normalizeInput,
  normalizeSession,
  normalizeRuntimeBot,
  findCommand,
  findButton,
  parseCommand,
  normalizeButton,
  normalizeResponseButtons,
  normalizeCommandResponse,
  validateRuntimeBot,
  createBotRuntime,
  runBotMessage,
};

export default BotRuntime;
