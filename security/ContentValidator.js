// security/ContentValidator.js

import {
  validateURL,
  canUseBotURL,
  canUseMiniAppURL,
} from './URLValidator';

/**
 * ContentValidator
 *
 * Client-side validation and sanitization for user-generated content
 * used by Nax bots, mini apps, portal listings, commands and buttons.
 *
 * IMPORTANT:
 * This is a client-side safety layer.
 * Firebase Security Rules and trusted backend validation must still
 * enforce the actual security boundary.
 */

/* -------------------------------------------------------------------------- */
/* Content limits                                                             */
/* -------------------------------------------------------------------------- */

export const CONTENT_LIMITS = {
  text: {
    min: 0,
    max: 10000,
  },

  shortText: {
    min: 1,
    max: 500,
  },

  name: {
    min: 1,
    max: 80,
  },

  title: {
    min: 1,
    max: 120,
  },

  description: {
    min: 0,
    max: 2000,
  },

  message: {
    min: 0,
    max: 5000,
  },

  welcomeMessage: {
    min: 0,
    max: 2000,
  },

  tag: {
    min: 1,
    max: 30,
  },

  tags: {
    max: 30,
  },

  url: {
    max: 2048,
  },

  html: {
    max: 10000,
  },

  metadata: {
    maxKeys: 50,
    maxValueLength: 1000,
  },
};

/* -------------------------------------------------------------------------- */
/* Dangerous patterns                                                         */
/* -------------------------------------------------------------------------- */

/**
 * These patterns are intentionally focused on executable / dangerous
 * markup rather than ordinary words.
 *
 * Do not use this list as a general profanity or moderation filter.
 */
const DANGEROUS_PATTERNS = [
  /<\s*script\b/i,
  /<\s*\/\s*script\s*>/i,
  /<\s*iframe\b/i,
  /<\s*object\b/i,
  /<\s*embed\b/i,
  /<\s*applet\b/i,
  /<\s*form\b/i,
  /<\s*base\b/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /data\s*:\s*text\/html/i,
  /on[a-z]+\s*=/i,
];

const HTML_TAG_PATTERN = /<\s*\/?\s*[a-z][^>]*>/i;

const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const ZERO_WIDTH_PATTERN =
  /[\u200B-\u200D\uFEFF]/g;

const EXCESSIVE_WHITESPACE_PATTERN =
  /[ \t]{4,}/g;

const EXCESSIVE_NEWLINES_PATTERN =
  /\n{5,}/g;

/* -------------------------------------------------------------------------- */
/* Generic helpers                                                            */
/* -------------------------------------------------------------------------- */

function isObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function toSafeString(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

function createResult(
  valid,
  errors = [],
  warnings = [],
  value = undefined
) {
  const result = {
    valid,
    errors,
    warnings,
  };

  if (value !== undefined) {
    result.value = value;
  }

  return result;
}

function unique(values = []) {
  return [...new Set(values)];
}

/* -------------------------------------------------------------------------- */
/* Text normalization                                                         */
/* -------------------------------------------------------------------------- */

export function normalizeText(
  value = '',
  options = {}
) {
  const {
    trim = true,
    collapseWhitespace = false,
    removeZeroWidth = true,
    removeControlCharacters = true,
    maxLength = CONTENT_LIMITS.text.max,
  } = options;

  let text = toSafeString(value);

  if (removeControlCharacters) {
    text = text.replace(CONTROL_CHARACTER_PATTERN, '');
  }

  if (removeZeroWidth) {
    text = text.replace(ZERO_WIDTH_PATTERN, '');
  }

  if (collapseWhitespace) {
    text = text.replace(EXCESSIVE_WHITESPACE_PATTERN, ' ');
    text = text.replace(EXCESSIVE_NEWLINES_PATTERN, '\n\n');
  }

  if (trim) {
    text = text.trim();
  }

  return text.slice(0, maxLength);
}

/* -------------------------------------------------------------------------- */
/* HTML / markup checks                                                       */
/* -------------------------------------------------------------------------- */

export function containsHTML(value = '') {
  return HTML_TAG_PATTERN.test(
    toSafeString(value)
  );
}

export function containsDangerousMarkup(value = '') {
  const text = toSafeString(value);

  return DANGEROUS_PATTERNS.some((pattern) =>
    pattern.test(text)
  );
}

export function containsControlCharacters(value = '') {
  return CONTROL_CHARACTER_PATTERN.test(
    toSafeString(value)
  );
}

export function validateMarkup(value = '') {
  const errors = [];
  const warnings = [];

  const text = toSafeString(value);

  if (containsDangerousMarkup(text)) {
    errors.push(
      'Content contains potentially executable or dangerous markup.'
    );
  }

  if (containsControlCharacters(text)) {
    warnings.push(
      'Content contains control characters that should be removed.'
    );
  }

  if (containsHTML(text)) {
    warnings.push(
      'HTML-like markup is present and will be treated as plain text.'
    );
  }

  return createResult(
    errors.length === 0,
    errors,
    warnings
  );
}

/* -------------------------------------------------------------------------- */
/* HTML escaping / stripping                                                  */
/* -------------------------------------------------------------------------- */

export function stripHTML(value = '') {
  let text = toSafeString(value);

  text = text.replace(
    /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
    ''
  );

  text = text.replace(
    /<\s*style\b[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi,
    ''
  );

  text = text.replace(
    /<[^>]*>/g,
    ''
  );

  return text;
}

export function escapeHTML(value = '') {
  return toSafeString(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* -------------------------------------------------------------------------- */
/* Safe text                                                                  */
/* -------------------------------------------------------------------------- */

export function sanitizeText(
  value = '',
  options = {}
) {
  const {
    maxLength = CONTENT_LIMITS.text.max,
    stripMarkup = true,
    collapseWhitespace = false,
  } = options;

  let text = normalizeText(value, {
    maxLength,
    collapseWhitespace,
  });

  if (stripMarkup) {
    text = stripHTML(text);
  }

  return normalizeText(text, {
    maxLength,
    collapseWhitespace,
  });
}

/* -------------------------------------------------------------------------- */
/* Generic text validation                                                    */
/* -------------------------------------------------------------------------- */

export function validateText(
  value = '',
  options = {}
) {
  const {
    minLength = CONTENT_LIMITS.text.min,
    maxLength = CONTENT_LIMITS.text.max,
    required = false,
    allowHTML = false,
    fieldName = 'Text',
  } = options;

  const raw = toSafeString(value);
  const normalized = normalizeText(raw, {
    maxLength,
  });

  const errors = [];
  const warnings = [];

  if (required && !normalized) {
    errors.push(`${fieldName} is required.`);
  }

  if (
    normalized.length < minLength &&
    (!required || normalized.length > 0)
  ) {
    errors.push(
      `${fieldName} must be at least ${minLength} characters.`
    );
  }

  if (raw.length > maxLength) {
    errors.push(
      `${fieldName} must not exceed ${maxLength} characters.`
    );
  }

  if (containsControlCharacters(raw)) {
    warnings.push(
      `${fieldName} contains control characters.`
    );
  }

  if (containsDangerousMarkup(raw)) {
    errors.push(
      `${fieldName} contains potentially dangerous markup.`
    );
  }

  if (!allowHTML && containsHTML(raw)) {
    warnings.push(
      `${fieldName} contains HTML-like markup and should be treated as plain text.`
    );
  }

  return createResult(
    errors.length === 0,
    unique(errors),
    unique(warnings),
    normalized
  );
}

/* -------------------------------------------------------------------------- */
/* Specific text fields                                                       */
/* -------------------------------------------------------------------------- */

export function validateName(
  value = '',
  fieldName = 'Name'
) {
  return validateText(value, {
    minLength: CONTENT_LIMITS.name.min,
    maxLength: CONTENT_LIMITS.name.max,
    required: true,
    allowHTML: false,
    fieldName,
  });
}

export function validateTitle(
  value = '',
  fieldName = 'Title'
) {
  return validateText(value, {
    minLength: CONTENT_LIMITS.title.min,
    maxLength: CONTENT_LIMITS.title.max,
    required: true,
    allowHTML: false,
    fieldName,
  });
}

export function validateDescription(
  value = '',
  fieldName = 'Description'
) {
  return validateText(value, {
    minLength: CONTENT_LIMITS.description.min,
    maxLength: CONTENT_LIMITS.description.max,
    required: false,
    allowHTML: false,
    fieldName,
  });
}

export function validateMessage(
  value = '',
  fieldName = 'Message'
) {
  return validateText(value, {
    minLength: CONTENT_LIMITS.message.min,
    maxLength: CONTENT_LIMITS.message.max,
    required: false,
    allowHTML: false,
    fieldName,
  });
}

export function validateWelcomeMessage(
  value = ''
) {
  return validateText(value, {
    minLength: CONTENT_LIMITS.welcomeMessage.min,
    maxLength: CONTENT_LIMITS.welcomeMessage.max,
    required: false,
    allowHTML: false,
    fieldName: 'Welcome message',
  });
}

/* -------------------------------------------------------------------------- */
/* Tags                                                                       */
/* -------------------------------------------------------------------------- */

export function normalizeTag(tag = '') {
  return normalizeText(tag, {
    maxLength: CONTENT_LIMITS.tag.max,
    collapseWhitespace: true,
  })
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/^-+|-+$/g, '');
}

export function normalizeTags(tags = []) {
  if (!Array.isArray(tags)) {
    return [];
  }

  const normalized = tags
    .map(normalizeTag)
    .filter(Boolean);

  return unique(normalized).slice(
    0,
    CONTENT_LIMITS.tags.max
  );
}

export function validateTag(tag = '') {
  const raw = toSafeString(tag);
  const normalized = normalizeTag(raw);
  const errors = [];
  const warnings = [];

  if (!normalized) {
    errors.push('Tag cannot be empty.');
  }

  if (
    raw.length > CONTENT_LIMITS.tag.max
  ) {
    errors.push(
      `Tag must not exceed ${CONTENT_LIMITS.tag.max} characters.`
    );
  }

  if (
    raw !== normalized &&
    raw.length > 0
  ) {
    warnings.push(
      'Tag contains characters that will be normalized.'
    );
  }

  return createResult(
    errors.length === 0,
    errors,
    warnings,
    normalized
  );
}

export function validateTags(tags = []) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(tags)) {
    return createResult(
      false,
      ['Tags must be an array.']
    );
  }

  if (tags.length > CONTENT_LIMITS.tags.max) {
    errors.push(
      `A maximum of ${CONTENT_LIMITS.tags.max} tags is allowed.`
    );
  }

  const normalized = [];

  tags.forEach((tag, index) => {
    const result = validateTag(tag);

    result.errors.forEach((error) => {
      errors.push(`Tag ${index + 1}: ${error}`);
    });

    result.warnings.forEach((warning) => {
      warnings.push(`Tag ${index + 1}: ${warning}`);
    });

    if (result.value) {
      normalized.push(result.value);
    }
  });

  const uniqueTags = unique(normalized);

  if (uniqueTags.length !== normalized.length) {
    warnings.push(
      'Duplicate tags were detected and will be removed.'
    );
  }

  return createResult(
    errors.length === 0,
    unique(errors),
    unique(warnings),
    uniqueTags.slice(0, CONTENT_LIMITS.tags.max)
  );
}

/* -------------------------------------------------------------------------- */
/* URL content                                                                */
/* -------------------------------------------------------------------------- */

export function validateContentURL(
  value = '',
  options = {}
) {
  const {
    fieldName = 'URL',
    type = 'external',
  } = options;

  const url = normalizeText(value, {
    maxLength: CONTENT_LIMITS.url.max,
  });

  const errors = [];

  if (!url) {
    errors.push(`${fieldName} is required.`);

    return createResult(false, errors, [], url);
  }

  if (url.length > CONTENT_LIMITS.url.max) {
    errors.push(
      `${fieldName} must not exceed ${CONTENT_LIMITS.url.max} characters.`
    );
  }

  const result = validateURL(url);

  if (!result.valid) {
    errors.push(
      result.error || `${fieldName} is not allowed.`
    );
  }

  if (type === 'bot' && !canUseBotURL(url)) {
    errors.push(
      `${fieldName} cannot be used by a bot.`
    );
  }

  if (type === 'miniApp' && !canUseMiniAppURL(url)) {
    errors.push(
      `${fieldName} cannot be used by a mini app.`
    );
  }

  return createResult(
    errors.length === 0,
    unique(errors),
    [],
    url
  );
}

/* -------------------------------------------------------------------------- */
/* Repetition / spam-like content checks                                      */
/* -------------------------------------------------------------------------- */

export function hasExcessiveRepeatedCharacters(
  value = '',
  threshold = 8
) {
  const text = toSafeString(value);

  if (!text) {
    return false;
  }

  const pattern = new RegExp(
    `(.)\\1{${threshold - 1},}`,
    'u'
  );

  return pattern.test(text);
}

export function hasExcessiveRepeatedWords(
  value = '',
  threshold = 6
) {
  const words = normalizeText(value)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length < threshold) {
    return false;
  }

  let consecutive = 1;

  for (let index = 1; index < words.length; index += 1) {
    if (words[index] === words[index - 1]) {
      consecutive += 1;

      if (consecutive >= threshold) {
        return true;
      }
    } else {
      consecutive = 1;
    }
  }

  return false;
}

export function hasExcessiveURLs(
  value = '',
  maxURLs = 5
) {
  const text = toSafeString(value);

  const matches =
    text.match(
      /\bhttps?:\/\/[^\s<>"']+/gi
    ) || [];

  return matches.length > maxURLs;
}

export function getContentRiskFlags(
  value = ''
) {
  const text = toSafeString(value);

  return {
    dangerousMarkup: containsDangerousMarkup(text),
    html: containsHTML(text),
    controlCharacters:
      containsControlCharacters(text),
    repeatedCharacters:
      hasExcessiveRepeatedCharacters(text),
    repeatedWords:
      hasExcessiveRepeatedWords(text),
    excessiveURLs:
      hasExcessiveURLs(text),
  };
}

/* -------------------------------------------------------------------------- */
/* Generic content security                                                   */
/* -------------------------------------------------------------------------- */

export function validateContent(
  value = '',
  options = {}
) {
  const result = validateText(value, options);

  const flags = getContentRiskFlags(value);

  const warnings = [...result.warnings];

  if (flags.repeatedCharacters) {
    warnings.push(
      'Content contains excessive repeated characters.'
    );
  }

  if (flags.repeatedWords) {
    warnings.push(
      'Content contains excessive repeated words.'
    );
  }

  if (flags.excessiveURLs) {
    warnings.push(
      'Content contains an unusually high number of URLs.'
    );
  }

  return createResult(
    result.valid,
    result.errors,
    unique(warnings),
    result.value
  );
}

/* -------------------------------------------------------------------------- */
/* Bot content                                                                */
/* -------------------------------------------------------------------------- */

export function normalizeBotContent(bot = {}) {
  if (!isObject(bot)) {
    return {};
  }

  const normalized = {
    ...bot,

    name: sanitizeText(bot.name, {
      maxLength: CONTENT_LIMITS.name.max,
      collapseWhitespace: true,
    }),

    username: normalizeText(bot.username, {
      maxLength: 32,
      collapseWhitespace: true,
    })
      .replace(/^@/, '')
      .toLowerCase(),

    description: sanitizeText(bot.description, {
      maxLength: CONTENT_LIMITS.description.max,
    }),

    welcomeMessage: sanitizeText(bot.welcomeMessage, {
      maxLength:
        CONTENT_LIMITS.welcomeMessage.max,
    }),

    tags: normalizeTags(bot.tags || []),
  };

  if (Array.isArray(bot.commands)) {
    normalized.commands = bot.commands.map(
      (command) => ({
        ...command,
        name: normalizeText(command?.name, {
          maxLength: 32,
          collapseWhitespace: true,
        })
          .replace(/^\/+/, '')
          .toLowerCase(),

        description: sanitizeText(
          command?.description,
          {
            maxLength: 200,
          }
        ),

        response: sanitizeText(
          command?.response,
          {
            maxLength: 5000,
          }
        ),
      })
    );
  }

  if (Array.isArray(bot.buttons)) {
    normalized.buttons = bot.buttons.map(
      (button) => ({
        ...button,

        label: sanitizeText(button?.label, {
          maxLength: 50,
          collapseWhitespace: true,
        }),

        text: sanitizeText(button?.text, {
          maxLength: 1000,
        }),

        command: normalizeText(
          button?.command,
          {
            maxLength: 32,
            collapseWhitespace: true,
          }
        )
          .replace(/^\/+/, '')
          .toLowerCase(),

        url: normalizeText(button?.url, {
          maxLength:
            CONTENT_LIMITS.url.max,
          collapseWhitespace: true,
        }),
      })
    );
  }

  return normalized;
}

export function validateBotContent(bot = {}) {
  const errors = [];
  const warnings = [];

  if (!isObject(bot)) {
    return createResult(
      false,
      ['Bot content must be an object.']
    );
  }

  const nameResult = validateName(
    bot.name,
    'Bot name'
  );

  errors.push(...nameResult.errors);
  warnings.push(...nameResult.warnings);

  const descriptionResult =
    validateDescription(
      bot.description,
      'Bot description'
    );

  errors.push(...descriptionResult.errors);
  warnings.push(...descriptionResult.warnings);

  const welcomeResult =
    validateWelcomeMessage(
      bot.welcomeMessage
    );

  errors.push(...welcomeResult.errors);
  warnings.push(...welcomeResult.warnings);

  const tagResult = validateTags(
    bot.tags || []
  );

  errors.push(...tagResult.errors);
  warnings.push(...tagResult.warnings);

  if (Array.isArray(bot.commands)) {
    bot.commands.forEach(
      (command, index) => {
        const commandDescription =
          validateDescription(
            command?.description,
            `Command ${index + 1} description`
          );

        errors.push(
          ...commandDescription.errors
        );

        warnings.push(
          ...commandDescription.warnings
        );

        const response =
          validateMessage(
            command?.response,
            `Command ${index + 1} response`
          );

        errors.push(...response.errors);
        warnings.push(...response.warnings);

        if (
          Array.isArray(command?.buttons)
        ) {
          command.buttons.forEach(
            (button, buttonIndex) => {
              const buttonResult =
                validateBotButtonContent(
                  button,
                  `Command ${index + 1} button ${buttonIndex + 1}`
                );

              errors.push(
                ...buttonResult.errors
              );

              warnings.push(
                ...buttonResult.warnings
              );
            }
          );
        }
      }
    );
  }

  if (Array.isArray(bot.buttons)) {
    bot.buttons.forEach(
      (button, index) => {
        const result =
          validateBotButtonContent(
            button,
            `Button ${index + 1}`
          );

        errors.push(...result.errors);
        warnings.push(...result.warnings);
      }
    );
  }

  return createResult(
    errors.length === 0,
    unique(errors),
    unique(warnings)
  );
}

export function validateBotButtonContent(
  button = {},
  fieldPrefix = 'Button'
) {
  const errors = [];
  const warnings = [];

  if (!isObject(button)) {
    return createResult(
      false,
      [`${fieldPrefix} must be an object.`]
    );
  }

  const labelResult = validateText(
    button.label,
    {
      minLength:
        CONTENT_LIMITS.shortText.min,
      maxLength:
        CONTENT_LIMITS.shortText.max,
      required: true,
      fieldName: `${fieldPrefix} label`,
    }
  );

  errors.push(...labelResult.errors);
  warnings.push(...labelResult.warnings);

  if (button.type === 'url') {
    const urlResult = validateContentURL(
      button.url,
      {
        fieldName: `${fieldPrefix} URL`,
        type: 'bot',
      }
    );

    errors.push(...urlResult.errors);
    warnings.push(...urlResult.warnings);
  }

  if (button.type === 'text') {
    const textResult = validateMessage(
      button.text,
      `${fieldPrefix} text`
    );

    errors.push(...textResult.errors);
    warnings.push(...textResult.warnings);
  }

  if (button.type === 'command') {
    const commandResult = validateText(
      button.command,
      {
        minLength: 1,
        maxLength: 32,
        required: true,
        fieldName: `${fieldPrefix} command`,
      }
    );

    errors.push(...commandResult.errors);
    warnings.push(...commandResult.warnings);
  }

  return createResult(
    errors.length === 0,
    unique(errors),
    unique(warnings)
  );
}

/* -------------------------------------------------------------------------- */
/* Mini app content                                                           */
/* -------------------------------------------------------------------------- */

export function normalizeMiniAppContent(
  miniApp = {}
) {
  if (!isObject(miniApp)) {
    return {};
  }

  return {
    ...miniApp,

    name: sanitizeText(miniApp.name, {
      maxLength: CONTENT_LIMITS.name.max,
      collapseWhitespace: true,
    }),

    slug: normalizeText(miniApp.slug, {
      maxLength: 100,
      collapseWhitespace: true,
    })
      .toLowerCase()
      .replace(/\s+/g, '-'),

    title: sanitizeText(miniApp.title, {
      maxLength: CONTENT_LIMITS.title.max,
      collapseWhitespace: true,
    }),

    description: sanitizeText(
      miniApp.description,
      {
        maxLength:
          CONTENT_LIMITS.description.max,
      }
    ),

    shortDescription: sanitizeText(
      miniApp.shortDescription,
      {
        maxLength: 500,
      }
    ),

    tags: normalizeTags(
      miniApp.tags || []
    ),

    url: normalizeText(miniApp.url, {
      maxLength: CONTENT_LIMITS.url.max,
      collapseWhitespace: true,
    }),
  };
}

export function validateMiniAppContent(
  miniApp = {}
) {
  const errors = [];
  const warnings = [];

  if (!isObject(miniApp)) {
    return createResult(
      false,
      ['Mini app content must be an object.']
    );
  }

  const nameResult = validateName(
    miniApp.name,
    'Mini app name'
  );

  errors.push(...nameResult.errors);
  warnings.push(...nameResult.warnings);

  if (miniApp.title) {
    const titleResult = validateTitle(
      miniApp.title,
      'Mini app title'
    );

    errors.push(...titleResult.errors);
    warnings.push(...titleResult.warnings);
  }

  const descriptionResult =
    validateDescription(
      miniApp.description,
      'Mini app description'
    );

  errors.push(...descriptionResult.errors);
  warnings.push(...descriptionResult.warnings);

  if (miniApp.shortDescription) {
    const shortDescriptionResult =
      validateText(
        miniApp.shortDescription,
        {
          minLength: 1,
          maxLength: 500,
          required: true,
          fieldName:
            'Mini app short description',
        }
      );

    errors.push(
      ...shortDescriptionResult.errors
    );

    warnings.push(
      ...shortDescriptionResult.warnings
    );
  }

  const tagResult = validateTags(
    miniApp.tags || []
  );

  errors.push(...tagResult.errors);
  warnings.push(...tagResult.warnings);

  if (miniApp.url) {
    const urlResult = validateContentURL(
      miniApp.url,
      {
        fieldName: 'Mini app URL',
        type: 'miniApp',
      }
    );

    errors.push(...urlResult.errors);
    warnings.push(...urlResult.warnings);
  }

  return createResult(
    errors.length === 0,
    unique(errors),
    unique(warnings)
  );
}

/* -------------------------------------------------------------------------- */
/* Metadata validation                                                        */
/* -------------------------------------------------------------------------- */

export function validateMetadata(
  metadata = {}
) {
  const errors = [];
  const warnings = [];

  if (!isObject(metadata)) {
    return createResult(
      false,
      ['Metadata must be an object.']
    );
  }

  const keys = Object.keys(metadata);

  if (
    keys.length >
    CONTENT_LIMITS.metadata.maxKeys
  ) {
    errors.push(
      `Metadata cannot contain more than ${CONTENT_LIMITS.metadata.maxKeys} keys.`
    );
  }

  keys.forEach((key) => {
    if (key.length > 100) {
      errors.push(
        `Metadata key "${key}" is too long.`
      );
    }

    const value = metadata[key];

    if (
      typeof value === 'string' &&
      value.length >
        CONTENT_LIMITS.metadata.maxValueLength
    ) {
      errors.push(
        `Metadata value for "${key}" is too long.`
      );
    }

    if (
      typeof value === 'object' &&
      value !== null
    ) {
      warnings.push(
        `Metadata field "${key}" contains nested data.`
      );
    }

    if (
      typeof value === 'string' &&
      containsDangerousMarkup(value)
    ) {
      errors.push(
        `Metadata field "${key}" contains dangerous markup.`
      );
    }
  });

  return createResult(
    errors.length === 0,
    unique(errors),
    unique(warnings)
  );
}

/* -------------------------------------------------------------------------- */
/* Recursive sanitization                                                     */
/* -------------------------------------------------------------------------- */

export function sanitizeContentValue(
  value,
  options = {}
) {
  const {
    maxStringLength =
      CONTENT_LIMITS.text.max,
    maxDepth = 5,
  } = options;

  function sanitize(
    current,
    depth
  ) {
    if (depth > maxDepth) {
      return null;
    }

    if (typeof current === 'string') {
      return sanitizeText(current, {
        maxLength: maxStringLength,
      });
    }

    if (
      typeof current === 'number' ||
      typeof current === 'boolean'
    ) {
      return current;
    }

    if (current === null) {
      return null;
    }

    if (Array.isArray(current)) {
      return current.map((item) =>
        sanitize(item, depth + 1)
      );
    }

    if (isObject(current)) {
      const output = {};

      Object.keys(current)
        .slice(
          0,
          CONTENT_LIMITS.metadata.maxKeys
        )
        .forEach((key) => {
          const safeKey =
            sanitizeText(key, {
              maxLength: 100,
              collapseWhitespace: true,
            });

          if (!safeKey) {
            return;
          }

          output[safeKey] = sanitize(
            current[key],
            depth + 1
          );
        });

      return output;
    }

    return null;
  }

  return sanitize(value, 0);
}

/* -------------------------------------------------------------------------- */
/* Safe content payload                                                       */
/* -------------------------------------------------------------------------- */

export function sanitizeBotPayload(bot = {}) {
  const normalized =
    normalizeBotContent(bot);

  return sanitizeContentValue(
    normalized,
    {
      maxStringLength:
        CONTENT_LIMITS.text.max,
      maxDepth: 6,
    }
  );
}

export function sanitizeMiniAppPayload(
  miniApp = {}
) {
  const normalized =
    normalizeMiniAppContent(miniApp);

  return sanitizeContentValue(
    normalized,
    {
      maxStringLength:
        CONTENT_LIMITS.text.max,
      maxDepth: 6,
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Combined validation                                                        */
/* -------------------------------------------------------------------------- */

export function validateBotAndContent(
  bot = {}
) {
  const result =
    validateBotContent(bot);

  return {
    ...result,
    sanitized: sanitizeBotPayload(bot),
  };
}

export function validateMiniAppAndContent(
  miniApp = {}
) {
  const result =
    validateMiniAppContent(miniApp);

  return {
    ...result,
    sanitized:
      sanitizeMiniAppPayload(miniApp),
  };
}

/* -------------------------------------------------------------------------- */
/* Security summary                                                           */
/* -------------------------------------------------------------------------- */

export function getContentSecuritySummary(
  value = ''
) {
  const text = toSafeString(value);
  const flags = getContentRiskFlags(text);

  const validation = validateContent(
    text,
    {
      maxLength:
        CONTENT_LIMITS.text.max,
      fieldName: 'Content',
    }
  );

  return {
    valid: validation.valid,

    errors: validation.errors,

    warnings: validation.warnings,

    length: text.length,

    flags,

    sanitized: sanitizeText(text, {
      maxLength:
        CONTENT_LIMITS.text.max,
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export const ContentValidator = {
  limits: CONTENT_LIMITS,

  normalizeText,
  sanitizeText,

  containsHTML,
  containsDangerousMarkup,
  containsControlCharacters,
  validateMarkup,

  stripHTML,
  escapeHTML,

  validateText,
  validateName,
  validateTitle,
  validateDescription,
  validateMessage,
  validateWelcomeMessage,

  normalizeTag,
  normalizeTags,
  validateTag,
  validateTags,

  validateURL: validateContentURL,

  hasExcessiveRepeatedCharacters,
  hasExcessiveRepeatedWords,
  hasExcessiveURLs,
  getContentRiskFlags,

  validateContent,

  normalizeBotContent,
  validateBotContent,
  validateBotButtonContent,

  normalizeMiniAppContent,
  validateMiniAppContent,

  validateMetadata,

  sanitizeContentValue,
  sanitizeBotPayload,
  sanitizeMiniAppPayload,

  validateBotAndContent,
  validateMiniAppAndContent,

  getSecuritySummary:
    getContentSecuritySummary,
};

export default ContentValidator;
