// bot-runtime/BotCommandHandler.js

import {
  normalizeCommandName,
  validateBotCommand,
} from "../security/BotValidator";

import {
  sanitizeText,
  validateMessage,
} from "../security/ContentValidator";

import {
  RUNTIME_LIMITS,
  findCommand,
} from "./BotRuntime";

const COMMAND_STATUS = {
  SUCCESS: "success",
  NOT_FOUND: "not_found",
  DISABLED: "disabled",
  INVALID: "invalid",
  ERROR: "error",
};

const COMMAND_LIMITS = {
  MAX_NAME_LENGTH: 32,
  MAX_DESCRIPTION_LENGTH: 200,
  MAX_ARGUMENTS: 50,
  MAX_ARGUMENT_LENGTH: 200,
  MAX_RESPONSE_LENGTH: 5000,
};

function safeString(value, maxLength = 5000) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().slice(0, maxLength);
}

function normalizeArguments(args) {
  if (!Array.isArray(args)) {
    return [];
  }

  return args
    .slice(0, COMMAND_LIMITS.MAX_ARGUMENTS)
    .map((argument) =>
      safeString(
        argument,
        COMMAND_LIMITS.MAX_ARGUMENT_LENGTH
      )
    )
    .filter(Boolean);
}

function normalizeCommand(command) {
  if (!command || typeof command !== "object") {
    return null;
  }

  const name = normalizeCommandName(
    command.name || ""
  );

  if (!name) {
    return null;
  }

  return {
    ...command,
    name: name.slice(
      0,
      COMMAND_LIMITS.MAX_NAME_LENGTH
    ),
    description: safeString(
      command.description || "",
      COMMAND_LIMITS.MAX_DESCRIPTION_LENGTH
    ),
    response: safeString(
      command.response ||
        command.message ||
        command.text ||
        "",
      COMMAND_LIMITS.MAX_RESPONSE_LENGTH
    ),
    responseType: safeString(
      command.responseType ||
        command.type ||
        "text",
      30
    ).toLowerCase(),
    enabled: command.enabled !== false,
  };
}

function validateCommand(command) {
  if (!command || typeof command !== "object") {
    return {
      valid: false,
      errors: ["Command is required."],
      warnings: [],
    };
  }

  try {
    const result = validateBotCommand(command);

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
        safeString(
          error?.message ||
            "Command validation failed.",
          500
        ),
      ],
      warnings: [],
    };
  }
}

function sanitizeCommand(command) {
  const normalized = normalizeCommand(command);

  if (!normalized) {
    return null;
  }

  return {
    ...normalized,
    description: sanitizeText(
      normalized.description
    ),
    response: sanitizeText(
      normalized.response
    ),
  };
}

function createCommandContext({
  bot = null,
  user = null,
  session = {},
  metadata = {},
} = {}) {
  return {
    bot,
    user,
    session:
      session && typeof session === "object"
        ? { ...session }
        : {},
    metadata:
      metadata && typeof metadata === "object"
        ? { ...metadata }
        : {},
  };
}

function createCommandResult({
  status = COMMAND_STATUS.ERROR,
  handled = false,
  command = null,
  commandName = "",
  args = [],
  response = null,
  error = null,
  context = null,
} = {}) {
  return {
    handled,
    status,
    command,
    commandName,
    args,
    response,
    error,
    session: context?.session || {},
    timestamp: Date.now(),
  };
}

function getCommandResponse(command) {
  if (!command) {
    return null;
  }

  const responseType = safeString(
    command.responseType ||
      command.type ||
      "text",
    30
  ).toLowerCase();

  const rawResponse = safeString(
    command.response ||
      command.message ||
      command.text ||
      ""
  );

  let response = rawResponse;

  try {
    const validation = validateMessage(
      rawResponse
    );

    if (validation?.valid === false) {
      response = safeString(
        rawResponse,
        COMMAND_LIMITS.MAX_RESPONSE_LENGTH
      );
    }
  } catch {
    response = safeString(
      rawResponse,
      COMMAND_LIMITS.MAX_RESPONSE_LENGTH
    );
  }

  response = sanitizeText(response);

  return {
    type: responseType,
    text: response,
    buttons: Array.isArray(command.buttons)
      ? command.buttons.slice(
          0,
          RUNTIME_LIMITS.MAX_BUTTONS
        )
      : [],
    url: safeString(
      command.url || command.link || "",
      2048
    ),
  };
}

function findMatchingCommand(
  bot,
  commandName
) {
  const normalizedName =
    normalizeCommandName(commandName);

  if (!normalizedName) {
    return null;
  }

  return findCommand(
    bot,
    normalizedName
  );
}

function getCommandList(bot) {
  if (!bot || !Array.isArray(bot.commands)) {
    return [];
  }

  return bot.commands
    .map(normalizeCommand)
    .filter(Boolean);
}

function getEnabledCommands(bot) {
  return getCommandList(bot).filter(
    (command) => command.enabled !== false
  );
}

function getCommandNames(bot) {
  return getEnabledCommands(bot).map(
    (command) => command.name
  );
}

function commandExists(bot, commandName) {
  return Boolean(
    findMatchingCommand(
      bot,
      commandName
    )
  );
}

function isCommandEnabled(bot, commandName) {
  const command =
    findMatchingCommand(
      bot,
      commandName
    );

  return Boolean(
    command &&
      command.enabled !== false
  );
}

function createHelpResponse(bot) {
  const commands = getEnabledCommands(bot);

  if (commands.length === 0) {
    return {
      type: "text",
      text: "No commands are currently available.",
      commands: [],
    };
  }

  const lines = commands
    .slice(0, 100)
    .map((command) => {
      const description =
        command.description ||
        "No description available.";

      return `/${command.name} — ${description}`;
    });

  return {
    type: "text",
    text: lines.join("\n"),
    commands: commands.map((command) => ({
      name: command.name,
      description: command.description,
    })),
  };
}

class BotCommandHandler {
  constructor(config = {}) {
    this.bot = config.bot || null;
    this.runtime = config.runtime || null;
    this.user = config.user || null;
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

    this.commandHistory = [];

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

    if (!this.listeners.has(event)) {
      this.listeners.set(
        event,
        new Set()
      );
    }

    this.listeners
      .get(event)
      .add(listener);

    return () => {
      this.off(event, listener);
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
      this.listeners.delete(event);
    }
  }

  emit(event, payload) {
    const listeners =
      this.listeners.get(event);

    if (!listeners) {
      return;
    }

    listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch {
        // Listener errors must not break command execution.
      }
    });
  }

  addHistory(record) {
    this.commandHistory.push(record);

    if (
      this.commandHistory.length >
      this.maxHistory
    ) {
      this.commandHistory =
        this.commandHistory.slice(
          -this.maxHistory
        );
    }
  }

  getHistory() {
    return this.commandHistory.map(
      (item) => ({
        ...item,
        args: Array.isArray(item.args)
          ? [...item.args]
          : [],
      })
    );
  }

  clearHistory() {
    this.commandHistory = [];
  }

  canExecute() {
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

  execute(commandName, args = []) {
    const capability =
      this.canExecute();

    if (!capability.valid) {
      return createCommandResult({
        status: COMMAND_STATUS.ERROR,
        handled: false,
        commandName: safeString(
          commandName,
          100
        ),
        error: capability.reason,
        context: this.getContext(),
      });
    }

    const normalizedName =
      normalizeCommandName(
        commandName
      );

    const normalizedArgs =
      normalizeArguments(args);

    if (!normalizedName) {
      return createCommandResult({
        status: COMMAND_STATUS.INVALID,
        handled: false,
        commandName: "",
        args: normalizedArgs,
        error: "COMMAND_NAME_MISSING",
        context: this.getContext(),
      });
    }

    const command =
      findMatchingCommand(
        this.bot,
        normalizedName
      );

    if (!command) {
      const result =
        createCommandResult({
          status: COMMAND_STATUS.NOT_FOUND,
          handled: false,
          commandName: normalizedName,
          args: normalizedArgs,
          error: "COMMAND_NOT_FOUND",
          context: this.getContext(),
        });

      this.addHistory({
        commandName: normalizedName,
        args: normalizedArgs,
        status: result.status,
        timestamp: Date.now(),
      });

      this.emit("notFound", result);

      return result;
    }

    if (command.enabled === false) {
      const result =
        createCommandResult({
          status: COMMAND_STATUS.DISABLED,
          handled: false,
          command: normalizeCommand(
            command
          ),
          commandName: normalizedName,
          args: normalizedArgs,
          error: "COMMAND_DISABLED",
          context: this.getContext(),
        });

      this.addHistory({
        commandName: normalizedName,
        args: normalizedArgs,
        status: result.status,
        timestamp: Date.now(),
      });

      this.emit("disabled", result);

      return result;
    }

    const validation =
      validateCommand(command);

    if (!validation.valid) {
      const result =
        createCommandResult({
          status: COMMAND_STATUS.INVALID,
          handled: false,
          command: normalizeCommand(
            command
          ),
          commandName: normalizedName,
          args: normalizedArgs,
          error: validation.errors,
          context: this.getContext(),
        });

      this.addHistory({
        commandName: normalizedName,
        args: normalizedArgs,
        status: result.status,
        timestamp: Date.now(),
      });

      this.emit("invalid", result);

      return result;
    }

    try {
      const sanitized =
        sanitizeCommand(command);

      const response =
        getCommandResponse(
          sanitized
        );

      const result =
        createCommandResult({
          status: COMMAND_STATUS.SUCCESS,
          handled: true,
          command: sanitized,
          commandName: normalizedName,
          args: normalizedArgs,
          response,
          context: this.getContext(),
        });

      this.addHistory({
        commandName: normalizedName,
        args: normalizedArgs,
        status: result.status,
        timestamp: Date.now(),
      });

      this.emit("executed", result);

      return result;
    } catch (error) {
      const result =
        createCommandResult({
          status: COMMAND_STATUS.ERROR,
          handled: false,
          command: normalizeCommand(
            command
          ),
          commandName: normalizedName,
          args: normalizedArgs,
          error: [
            safeString(
              error?.message ||
                "Command execution failed.",
              500
            ),
          ],
          context: this.getContext(),
        });

      this.addHistory({
        commandName: normalizedName,
        args: normalizedArgs,
        status: result.status,
        timestamp: Date.now(),
      });

      this.emit("error", result);

      return result;
    }
  }

  executeFromMessage(message) {
    if (
      !message ||
      typeof message !== "object"
    ) {
      return this.execute("", []);
    }

    return this.execute(
      message.command ||
        message.text ||
        "",
      message.args || []
    );
  }

  executeStart(args = []) {
    return this.execute(
      "start",
      args
    );
  }

  executeHelp() {
    const capability =
      this.canExecute();

    if (!capability.valid) {
      return createCommandResult({
        status: COMMAND_STATUS.ERROR,
        handled: false,
        commandName: "help",
        error: capability.reason,
        context: this.getContext(),
      });
    }

    const response =
      createHelpResponse(this.bot);

    const result =
      createCommandResult({
        status: COMMAND_STATUS.SUCCESS,
        handled: true,
        commandName: "help",
        args: [],
        response,
        context: this.getContext(),
      });

    this.addHistory({
      commandName: "help",
      args: [],
      status: result.status,
      timestamp: Date.now(),
    });

    this.emit("executed", result);

    return result;
  }

  getCommand(commandName) {
    return findMatchingCommand(
      this.bot,
      commandName
    );
  }

  getCommands() {
    return getCommandList(this.bot);
  }

  getEnabledCommands() {
    return getEnabledCommands(
      this.bot
    );
  }

  getCommandNames() {
    return getCommandNames(
      this.bot
    );
  }

  hasCommand(commandName) {
    return commandExists(
      this.bot,
      commandName
    );
  }

  isEnabled(commandName) {
    return isCommandEnabled(
      this.bot,
      commandName
    );
  }

  getContext() {
    return createCommandContext({
      bot: this.bot,
      user: this.user,
      session: this.session,
      metadata: this.metadata,
    });
  }

  getStats() {
    const stats = {
      total: this.commandHistory.length,
      success: 0,
      notFound: 0,
      disabled: 0,
      invalid: 0,
      errors: 0,
    };

    this.commandHistory.forEach(
      (record) => {
        switch (record.status) {
          case COMMAND_STATUS.SUCCESS:
            stats.success += 1;
            break;

          case COMMAND_STATUS.NOT_FOUND:
            stats.notFound += 1;
            break;

          case COMMAND_STATUS.DISABLED:
            stats.disabled += 1;
            break;

          case COMMAND_STATUS.INVALID:
            stats.invalid += 1;
            break;

          case COMMAND_STATUS.ERROR:
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

function createBotCommandHandler(
  config = {}
) {
  return new BotCommandHandler(
    config
  );
}

function executeBotCommand({
  bot,
  runtime,
  user = null,
  session = {},
  command,
  args = [],
} = {}) {
  const handler =
    createBotCommandHandler({
      bot,
      runtime,
      user,
      session,
    });

  return handler.execute(
    command,
    args
  );
}

const BotCommandHandlerAPI = {
  COMMAND_STATUS,
  COMMAND_LIMITS,
  normalizeArguments,
  normalizeCommand,
  validateCommand,
  sanitizeCommand,
  createCommandContext,
  createCommandResult,
  getCommandResponse,
  findMatchingCommand,
  getCommandList,
  getEnabledCommands,
  getCommandNames,
  commandExists,
  isCommandEnabled,
  createHelpResponse,
  createBotCommandHandler,
  executeBotCommand,
};

export {
  BotCommandHandler,
  BotCommandHandlerAPI,
  COMMAND_STATUS,
  COMMAND_LIMITS,
  normalizeArguments,
  normalizeCommand,
  validateCommand,
  sanitizeCommand,
  createCommandContext,
  createCommandResult,
  getCommandResponse,
  findMatchingCommand,
  getCommandList,
  getEnabledCommands,
  getCommandNames,
  commandExists,
  isCommandEnabled,
  createHelpResponse,
  createBotCommandHandler,
  executeBotCommand,
};

export default BotCommandHandler;
