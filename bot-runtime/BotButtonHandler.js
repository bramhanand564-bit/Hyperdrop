// bot-runtime/BotButtonHandler.js

import {
  findButton,
  findCommand,
  RUNTIME_LIMITS,
} from "./BotRuntime";

import {
  validateURL,
  canUseBotURL,
  getSafeURL,
} from "../security/URLValidator";

import {
  sanitizeText,
  validateMessage,
} from "../security/ContentValidator";

const BUTTON_STATUS = {
  SUCCESS: "success",
  NOT_FOUND: "not_found",
  INVALID: "invalid",
  DISABLED: "disabled",
  UNSAFE_URL: "unsafe_url",
  COMMAND_NOT_FOUND: "command_not_found",
  ERROR: "error",
};

const BUTTON_TYPES = {
  TEXT: "text",
  URL: "url",
  COMMAND: "command",
};

const BUTTON_LIMITS = {
  MAX_ID_LENGTH: 100,
  MAX_LABEL_LENGTH: 50,
  MAX_TEXT_LENGTH: 5000,
  MAX_URL_LENGTH: 2048,
  MAX_COMMAND_LENGTH: 32,
};

function safeString(value, maxLength = 5000) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().slice(0, maxLength);
}

function normalizeButtonId(buttonId) {
  return safeString(
    buttonId,
    BUTTON_LIMITS.MAX_ID_LENGTH
  );
}

function normalizeButtonType(type) {
  const normalized = safeString(
    type,
    30
  ).toLowerCase();

  if (
    Object.values(BUTTON_TYPES).includes(
      normalized
    )
  ) {
    return normalized;
  }

  return null;
}

function normalizeButton(button) {
  if (!button || typeof button !== "object") {
    return null;
  }

  const id = normalizeButtonId(
    button.id ||
      button.buttonId ||
      button.name ||
      button.label
  );

  const label = safeString(
    button.label ||
      button.text ||
      button.name ||
      id,
    BUTTON_LIMITS.MAX_LABEL_LENGTH
  );

  const type = normalizeButtonType(
    button.type
  );

  if (!id || !label || !type) {
    return null;
  }

  const normalized = {
    id,
    label,
    type,
    enabled: button.enabled !== false,
  };

  if (type === BUTTON_TYPES.TEXT) {
    normalized.text = safeString(
      button.text ||
        button.value ||
        button.label,
      BUTTON_LIMITS.MAX_TEXT_LENGTH
    );
  }

  if (type === BUTTON_TYPES.COMMAND) {
    normalized.command = safeString(
      button.command ||
        button.value ||
        "",
      BUTTON_LIMITS.MAX_COMMAND_LENGTH
    )
      .replace(/^\/+/, "")
      .trim()
      .toLowerCase();
  }

  if (type === BUTTON_TYPES.URL) {
    normalized.url = safeString(
      button.url ||
        button.value ||
        "",
      BUTTON_LIMITS.MAX_URL_LENGTH
    );
  }

  return normalized;
}

function getBotButtons(bot) {
  if (
    !bot ||
    !Array.isArray(bot.buttons)
  ) {
    return [];
  }

  return bot.buttons
    .slice(0, RUNTIME_LIMITS.MAX_BUTTONS)
    .map(normalizeButton)
    .filter(Boolean);
}

function getEnabledButtons(bot) {
  return getBotButtons(bot).filter(
    (button) => button.enabled !== false
  );
}

function findConfiguredButton(
  bot,
  buttonId
) {
  const id = normalizeButtonId(buttonId);

  if (!id) {
    return null;
  }

  const button =
    findButton(bot, id);

  if (button) {
    return normalizeButton(button);
  }

  return (
    getEnabledButtons(bot).find(
      (item) => item.id === id
    ) || null
  );
}

function buttonExists(
  bot,
  buttonId
) {
  return Boolean(
    findConfiguredButton(
      bot,
      buttonId
    )
  );
}

function isButtonEnabled(
  bot,
  buttonId
) {
  const button =
    findConfiguredButton(
      bot,
      buttonId
    );

  return Boolean(
    button &&
      button.enabled !== false
  );
}

function validateButton(button) {
  const normalized =
    normalizeButton(button);

  if (!normalized) {
    return {
      valid: false,
      errors: ["Invalid button configuration."],
      warnings: [],
    };
  }

  const errors = [];
  const warnings = [];

  if (
    normalized.id.length === 0
  ) {
    errors.push(
      "Button ID is required."
    );
  }

  if (
    normalized.label.length === 0
  ) {
    errors.push(
      "Button label is required."
    );
  }

  if (
    normalized.type ===
    BUTTON_TYPES.COMMAND
  ) {
    if (!normalized.command) {
      errors.push(
        "Command button requires a command."
      );
    }
  }

  if (
    normalized.type ===
    BUTTON_TYPES.URL
  ) {
    if (!normalized.url) {
      errors.push(
        "URL button requires a URL."
      );
    } else {
      const urlResult =
        validateURL(
          normalized.url
        );

      if (!urlResult.valid) {
        errors.push(
          "Button URL is invalid."
        );
      }

      if (
        !canUseBotURL(
          normalized.url
        )
      ) {
        errors.push(
          "Button URL is not allowed."
        );
      }
    }
  }

  if (
    normalized.type ===
    BUTTON_TYPES.TEXT &&
    !normalized.text
  ) {
    errors.push(
      "Text button requires text."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function sanitizeButton(button) {
  const normalized =
    normalizeButton(button);

  if (!normalized) {
    return null;
  }

  const output = {
    ...normalized,
    label: sanitizeText(
      normalized.label
    ),
  };

  if (
    normalized.type ===
    BUTTON_TYPES.TEXT
  ) {
    output.text = sanitizeText(
      normalized.text
    );
  }

  if (
    normalized.type ===
    BUTTON_TYPES.COMMAND
  ) {
    output.command = safeString(
      normalized.command,
      BUTTON_LIMITS.MAX_COMMAND_LENGTH
    )
      .replace(/^\/+/, "")
      .toLowerCase();
  }

  if (
    normalized.type ===
    BUTTON_TYPES.URL
  ) {
    const validation =
      validateURL(
        normalized.url
      );

    if (
      !validation.valid ||
      !canUseBotURL(
        normalized.url
      )
    ) {
      return null;
    }

    output.url =
      getSafeURL(
        normalized.url
      ) || normalized.url;
  }

  return output;
}

function createButtonContext({
  bot = null,
  user = null,
  session = {},
  metadata = {},
} = {}) {
  return {
    bot,
    user,
    session:
      session &&
      typeof session === "object"
        ? { ...session }
        : {},
    metadata:
      metadata &&
      typeof metadata === "object"
        ? { ...metadata }
        : {},
  };
}

function createButtonResult({
  status = BUTTON_STATUS.ERROR,
  handled = false,
  button = null,
  buttonId = "",
  action = null,
  response = null,
  error = null,
  context = null,
} = {}) {
  return {
    handled,
    status,
    button,
    buttonId,
    action,
    response,
    error,
    session:
      context?.session || {},
    timestamp: Date.now(),
  };
}

function createTextAction(
  text
) {
  return {
    type: "text",
    text: safeString(
      text,
      BUTTON_LIMITS.MAX_TEXT_LENGTH
    ),
  };
}

function createURLAction(
  url,
  label = "Open link"
) {
  const validation =
    validateURL(url);

  if (
    !validation.valid ||
    !canUseBotURL(url)
  ) {
    return null;
  }

  const safeURL =
    getSafeURL(url) || url;

  return {
    type: "url",
    url: safeURL,
    label: safeString(
      label,
      BUTTON_LIMITS.MAX_LABEL_LENGTH
    ),
  };
}

function createCommandAction(
  command,
  args = []
) {
  const normalizedCommand =
    safeString(
      command,
      BUTTON_LIMITS.MAX_COMMAND_LENGTH
    )
      .replace(/^\/+/, "")
      .toLowerCase();

  if (!normalizedCommand) {
    return null;
  }

  return {
    type: "command",
    command: normalizedCommand,
    args: Array.isArray(args)
      ? args
          .slice(0, 50)
          .map((item) =>
            safeString(item, 200)
          )
          .filter(Boolean)
      : [],
  };
}

function validateTextAction(text) {
  const value = safeString(
    text,
    BUTTON_LIMITS.MAX_TEXT_LENGTH
  );

  if (!value) {
    return {
      valid: false,
      errors: ["Text is empty."],
    };
  }

  try {
    const result =
      validateMessage(value);

    if (result?.valid === false) {
      return {
        valid: false,
        errors:
          Array.isArray(result.errors)
            ? result.errors
            : ["Invalid text."],
      };
    }
  } catch {
    // Continue with sanitized text.
  }

  return {
    valid: true,
    errors: [],
  };
}

class BotButtonHandler {
  constructor(config = {}) {
    this.bot =
      config.bot || null;

    this.runtime =
      config.runtime || null;

    this.user =
      config.user || null;

    this.session =
      config.session &&
      typeof config.session === "object"
        ? { ...config.session }
        : {};

    this.metadata =
      config.metadata &&
      typeof config.metadata === "object"
        ? { ...config.metadata }
        : {};

    this.history = [];

    this.maxHistory = Math.min(
      Math.max(
        Number(config.maxHistory) || 100,
        1
      ),
      500
    );

    this.listeners = new Map();
  }

  setBot(bot) {
    this.bot = bot;
  }

  setRuntime(runtime) {
    this.runtime = runtime;
  }

  setUser(user) {
    this.user = user;
  }

  setSession(session) {
    this.session =
      session &&
      typeof session === "object"
        ? { ...session }
        : {};
  }

  updateSession(values = {}) {
    if (
      !values ||
      typeof values !== "object"
    ) {
      return this.session;
    }

    this.session = {
      ...this.session,
      ...values,
    };

    return this.session;
  }

  on(event, listener) {
    if (
      !event ||
      typeof listener !== "function"
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
      this.listeners.get(event);

    if (!listeners) {
      return;
    }

    listeners.delete(listener);

    if (listeners.size === 0) {
      this.listeners.delete(
        event
      );
    }
  }

  emit(event, payload) {
    const listeners =
      this.listeners.get(event);

    if (!listeners) {
      return;
    }

    listeners.forEach(
      (listener) => {
        try {
          listener(payload);
        } catch {
          // Listener errors must never break button handling.
        }
      }
    );
  }

  addHistory(record) {
    this.history.push(record);

    if (
      this.history.length >
      this.maxHistory
    ) {
      this.history =
        this.history.slice(
          -this.maxHistory
        );
    }
  }

  getHistory() {
    return this.history.map(
      (item) => ({
        ...item,
        args: Array.isArray(
          item.args
        )
          ? [...item.args]
          : [],
      })
    );
  }

  clearHistory() {
    this.history = [];
  }

  canHandle() {
    if (!this.bot) {
      return {
        valid: false,
        reason: "BOT_MISSING",
      };
    }

    if (
      this.bot.enabled === false
    ) {
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
        reason:
          "RUNTIME_NOT_RUNNING",
      };
    }

    return {
      valid: true,
      reason: null,
    };
  }

  handle(buttonId) {
    const capability =
      this.canHandle();

    const normalizedId =
      normalizeButtonId(
        buttonId
      );

    if (!capability.valid) {
      return createButtonResult({
        status: BUTTON_STATUS.ERROR,
        handled: false,
        buttonId: normalizedId,
        error: capability.reason,
        context:
          this.getContext(),
      });
    }

    if (!normalizedId) {
      const result =
        createButtonResult({
          status:
            BUTTON_STATUS.INVALID,
          handled: false,
          buttonId: "",
          error:
            "BUTTON_ID_MISSING",
          context:
            this.getContext(),
        });

      this.emit(
        "error",
        result
      );

      return result;
    }

    const configuredButton =
      findConfiguredButton(
        this.bot,
        normalizedId
      );

    if (!configuredButton) {
      const result =
        createButtonResult({
          status:
            BUTTON_STATUS.NOT_FOUND,
          handled: false,
          buttonId: normalizedId,
          error:
            "BUTTON_NOT_FOUND",
          context:
            this.getContext(),
        });

      this.addHistory({
        buttonId: normalizedId,
        status:
          result.status,
        timestamp: Date.now(),
      });

      this.emit(
        "notFound",
        result
      );

      return result;
    }

    if (
      configuredButton.enabled ===
      false
    ) {
      const result =
        createButtonResult({
          status:
            BUTTON_STATUS.DISABLED,
          handled: false,
          button:
            configuredButton,
          buttonId: normalizedId,
          error:
            "BUTTON_DISABLED",
          context:
            this.getContext(),
        });

      this.addHistory({
        buttonId: normalizedId,
        status:
          result.status,
        timestamp: Date.now(),
      });

      this.emit(
        "disabled",
        result
      );

      return result;
    }

    const validation =
      validateButton(
        configuredButton
      );

    if (!validation.valid) {
      const result =
        createButtonResult({
          status:
            BUTTON_STATUS.INVALID,
          handled: false,
          button:
            configuredButton,
          buttonId: normalizedId,
          error:
            validation.errors,
          context:
            this.getContext(),
        });

      this.addHistory({
        buttonId: normalizedId,
        status:
          result.status,
        timestamp: Date.now(),
      });

      this.emit(
        "invalid",
        result
      );

      return result;
    }

    try {
      const sanitized =
        sanitizeButton(
          configuredButton
        );

      if (!sanitized) {
        const result =
          createButtonResult({
            status:
              BUTTON_STATUS.INVALID,
            handled: false,
            button:
              configuredButton,
            buttonId:
              normalizedId,
            error:
              "BUTTON_SANITIZATION_FAILED",
            context:
              this.getContext(),
          });

        this.addHistory({
          buttonId: normalizedId,
          status:
            result.status,
          timestamp: Date.now(),
        });

        return result;
      }

      return this.executeButton(
        sanitized
      );
    } catch (error) {
      const result =
        createButtonResult({
          status:
            BUTTON_STATUS.ERROR,
          handled: false,
          button:
            configuredButton,
          buttonId: normalizedId,
          error: [
            safeString(
              error?.message ||
                "Button execution failed.",
              500
            ),
          ],
          context:
            this.getContext(),
        });

      this.addHistory({
        buttonId: normalizedId,
        status:
          result.status,
        timestamp: Date.now(),
      });

      this.emit(
        "error",
        result
      );

      return result;
    }
  }

  executeButton(button) {
    const normalized =
      sanitizeButton(button);

    if (!normalized) {
      return createButtonResult({
        status:
          BUTTON_STATUS.INVALID,
        handled: false,
        error:
          "INVALID_BUTTON",
        context:
          this.getContext(),
      });
    }

    if (
      normalized.type ===
      BUTTON_TYPES.TEXT
    ) {
      return this.executeTextButton(
        normalized
      );
    }

    if (
      normalized.type ===
      BUTTON_TYPES.URL
    ) {
      return this.executeURLButton(
        normalized
      );
    }

    if (
      normalized.type ===
      BUTTON_TYPES.COMMAND
    ) {
      return this.executeCommandButton(
        normalized
      );
    }

    return createButtonResult({
      status:
        BUTTON_STATUS.INVALID,
      handled: false,
      button: normalized,
      buttonId: normalized.id,
      error:
        "UNKNOWN_BUTTON_TYPE",
      context:
        this.getContext(),
    });
  }

  executeTextButton(button) {
    const text =
      sanitizeText(
        button.text ||
          button.label
      );

    const textValidation =
      validateTextAction(
        text
      );

    if (!textValidation.valid) {
      return createButtonResult({
        status:
          BUTTON_STATUS.INVALID,
        handled: false,
        button,
        buttonId: button.id,
        error:
          textValidation.errors,
        context:
          this.getContext(),
      });
    }

    const action =
      createTextAction(text);

    const result =
      createButtonResult({
        status:
          BUTTON_STATUS.SUCCESS,
        handled: true,
        button,
        buttonId: button.id,
        action,
        response: {
          type: "text",
          text,
        },
        context:
          this.getContext(),
      });

    this.addHistory({
      buttonId: button.id,
      type: button.type,
      status: result.status,
      timestamp: Date.now(),
    });

    this.emit(
      "executed",
      result
    );

    return result;
  }

  executeURLButton(button) {
    const validation =
      validateURL(
        button.url
      );

    if (
      !validation.valid ||
      !canUseBotURL(
        button.url
      )
    ) {
      const result =
        createButtonResult({
          status:
            BUTTON_STATUS.UNSAFE_URL,
          handled: false,
          button,
          buttonId: button.id,
          error:
            "UNSAFE_URL",
          context:
            this.getContext(),
        });

      this.addHistory({
        buttonId: button.id,
        type: button.type,
        status:
          result.status,
        timestamp: Date.now(),
      });

      this.emit(
        "securityError",
        result
      );

      return result;
    }

    const action =
      createURLAction(
        button.url,
        button.label
      );

    if (!action) {
      return createButtonResult({
        status:
          BUTTON_STATUS.UNSAFE_URL,
        handled: false,
        button,
        buttonId: button.id,
        error:
          "URL_ACTION_REJECTED",
        context:
          this.getContext(),
      });
    }

    const result =
      createButtonResult({
        status:
          BUTTON_STATUS.SUCCESS,
        handled: true,
        button,
        buttonId: button.id,
        action,
        response: {
          type: "link",
          url: action.url,
          label: action.label,
        },
        context:
          this.getContext(),
      });

    this.addHistory({
      buttonId: button.id,
      type: button.type,
      status: result.status,
      timestamp: Date.now(),
    });

    this.emit(
      "executed",
      result
    );

    return result;
  }

  executeCommandButton(button) {
    const commandName =
      safeString(
        button.command,
        BUTTON_LIMITS.MAX_COMMAND_LENGTH
      )
        .replace(/^\/+/, "")
        .toLowerCase();

    if (!commandName) {
      return createButtonResult({
        status:
          BUTTON_STATUS.INVALID,
        handled: false,
        button,
        buttonId: button.id,
        error:
          "COMMAND_MISSING",
        context:
          this.getContext(),
      });
    }

    const command =
      findCommand(
        this.bot,
        commandName
      );

    if (!command) {
      const result =
        createButtonResult({
          status:
            BUTTON_STATUS.COMMAND_NOT_FOUND,
          handled: false,
          button,
          buttonId: button.id,
          error:
            "COMMAND_NOT_FOUND",
          context:
            this.getContext(),
        });

      this.addHistory({
        buttonId: button.id,
        type: button.type,
        command: commandName,
        status:
          result.status,
        timestamp: Date.now(),
      });

      this.emit(
        "commandNotFound",
        result
      );

      return result;
    }

    if (
      command.enabled === false
    ) {
      return createButtonResult({
        status:
          BUTTON_STATUS.DISABLED,
        handled: false,
        button,
        buttonId: button.id,
        error:
          "COMMAND_DISABLED",
        context:
          this.getContext(),
      });
    }

    if (
      !this.runtime ||
      typeof this.runtime
        .handleCommand !==
        "function"
    ) {
      return createButtonResult({
        status:
          BUTTON_STATUS.ERROR,
        handled: false,
        button,
        buttonId: button.id,
        error:
          "RUNTIME_COMMAND_HANDLER_MISSING",
        context:
          this.getContext(),
      });
    }

    const runtimeResult =
      this.runtime.handleCommand(
        commandName,
        []
      );

    const result =
      createButtonResult({
        status: runtimeResult?.handled
          ? BUTTON_STATUS.SUCCESS
          : BUTTON_STATUS.ERROR,
        handled: Boolean(
          runtimeResult?.handled
        ),
        button,
        buttonId: button.id,
        action:
          createCommandAction(
            commandName,
            []
          ),
        response:
          runtimeResult?.response ||
          null,
        error:
          runtimeResult?.error ||
          null,
        context:
          this.getContext(),
      });

    this.addHistory({
      buttonId: button.id,
      type: button.type,
      command: commandName,
      status: result.status,
      timestamp: Date.now(),
    });

    this.emit(
      "executed",
      result
    );

    return result;
  }

  getButton(buttonId) {
    return findConfiguredButton(
      this.bot,
      buttonId
    );
  }

  getButtons() {
    return getBotButtons(
      this.bot
    );
  }

  getEnabledButtons() {
    return getEnabledButtons(
      this.bot
    );
  }

  hasButton(buttonId) {
    return buttonExists(
      this.bot,
      buttonId
    );
  }

  isEnabled(buttonId) {
    return isButtonEnabled(
      this.bot,
      buttonId
    );
  }

  getContext() {
    return createButtonContext({
      bot: this.bot,
      user: this.user,
      session: this.session,
      metadata: this.metadata,
    });
  }

  getStats() {
    const stats = {
      total: this.history.length,
      success: 0,
      notFound: 0,
      invalid: 0,
      disabled: 0,
      unsafeURL: 0,
      commandNotFound: 0,
      errors: 0,
    };

    this.history.forEach(
      (record) => {
        switch (record.status) {
          case BUTTON_STATUS.SUCCESS:
            stats.success += 1;
            break;

          case BUTTON_STATUS.NOT_FOUND:
            stats.notFound += 1;
            break;

          case BUTTON_STATUS.INVALID:
            stats.invalid += 1;
            break;

          case BUTTON_STATUS.DISABLED:
            stats.disabled += 1;
            break;

          case BUTTON_STATUS.UNSAFE_URL:
            stats.unsafeURL += 1;
            break;

          case BUTTON_STATUS.COMMAND_NOT_FOUND:
            stats.commandNotFound += 1;
            break;

          case BUTTON_STATUS.ERROR:
            stats.errors += 1;
            break;

          default:
            break;
        }
      }
    );

    return stats;
  }
}

function createBotButtonHandler(
  config = {}
) {
  return new BotButtonHandler(
    config
  );
}

function handleBotButton({
  bot,
  runtime,
  user = null,
  session = {},
  buttonId,
} = {}) {
  const handler =
    createBotButtonHandler({
      bot,
      runtime,
      user,
      session,
    });

  return handler.handle(
    buttonId
  );
}

const BotButtonHandlerAPI = {
  BUTTON_STATUS,
  BUTTON_TYPES,
  BUTTON_LIMITS,
  normalizeButtonId,
  normalizeButtonType,
  normalizeButton,
  getBotButtons,
  getEnabledButtons,
  findConfiguredButton,
  buttonExists,
  isButtonEnabled,
  validateButton,
  sanitizeButton,
  createButtonContext,
  createButtonResult,
  createTextAction,
  createURLAction,
  createCommandAction,
  validateTextAction,
  createBotButtonHandler,
  handleBotButton,
};

export {
  BotButtonHandler,
  BotButtonHandlerAPI,
  BUTTON_STATUS,
  BUTTON_TYPES,
  BUTTON_LIMITS,
  normalizeButtonId,
  normalizeButtonType,
  normalizeButton,
  getBotButtons,
  getEnabledButtons,
  findConfiguredButton,
  buttonExists,
  isButtonEnabled,
  validateButton,
  sanitizeButton,
  createButtonContext,
  createButtonResult,
  createTextAction,
  createURLAction,
  createCommandAction,
  validateTextAction,
  createBotButtonHandler,
  handleBotButton,
};

export default BotButtonHandler;
