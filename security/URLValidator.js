// security/URLValidator.js

/**
 * Nax URL Validator
 *
 * Validates URLs before Nax opens external websites,
 * WebViews, mini-apps or bot buttons.
 *
 * IMPORTANT:
 * This is a client-side validation layer.
 * It is NOT a replacement for backend security.
 */

/**
 * Allowed URL protocols.
 */
export const ALLOWED_PROTOCOLS = [
  'https:',
];

/**
 * Development protocols.
 *
 * Keep these disabled in production.
 */
export const DEVELOPMENT_PROTOCOLS = [
  'http:',
];

/**
 * Blocked protocols.
 */
export const BLOCKED_PROTOCOLS = [
  'javascript:',
  'data:',
  'file:',
  'blob:',
  'vbscript:',
  'about:',
  'intent:',
];

/**
 * Domains that should never be opened
 * by an untrusted mini-app.
 */
export const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
];

/**
 * Common dangerous URL patterns.
 */
const DANGEROUS_PATTERNS = [
  /^javascript:/i,
  /^data:/i,
  /^vbscript:/i,
  /^file:/i,
  /^blob:/i,
  /^about:/i,
  /^intent:/i,
];

/**
 * Normalize a URL string.
 */
export function normalizeURL(
  value = ''
) {
  return String(value || '').trim();
}

/**
 * Check whether a string looks like a URL.
 */
export function looksLikeURL(
  value = ''
) {
  const url =
    normalizeURL(value);

  if (!url) {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely parse a URL.
 */
export function parseURL(
  value = ''
) {
  const url =
    normalizeURL(value);

  if (!url) {
    return null;
  }

  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/**
 * Get protocol from URL.
 */
export function getURLProtocol(
  value = ''
) {
  const parsed =
    parseURL(value);

  return parsed
    ? parsed.protocol.toLowerCase()
    : '';
}

/**
 * Get hostname from URL.
 */
export function getURLHostname(
  value = ''
) {
  const parsed =
    parseURL(value);

  return parsed
    ? parsed.hostname.toLowerCase()
    : '';
}

/**
 * Check for dangerous protocol/pattern.
 */
export function hasDangerousPattern(
  value = ''
) {
  const url =
    normalizeURL(value);

  return DANGEROUS_PATTERNS.some(
    (pattern) =>
      pattern.test(url)
  );
}

/**
 * Check whether hostname is blocked.
 */
export function isBlockedDomain(
  value = ''
) {
  const hostname =
    getURLHostname(value);

  if (!hostname) {
    return false;
  }

  return BLOCKED_DOMAINS.some(
    (blocked) =>
      hostname === blocked ||
      hostname.endsWith(
        `.${blocked}`
      )
  );
}

/**
 * Check whether URL uses an allowed protocol.
 */
export function isAllowedProtocol(
  value = '',
  {
    allowHttp = false,
  } = {}
) {
  const protocol =
    getURLProtocol(value);

  if (!protocol) {
    return false;
  }

  if (
    ALLOWED_PROTOCOLS.includes(
      protocol
    )
  ) {
    return true;
  }

  if (
    allowHttp &&
    DEVELOPMENT_PROTOCOLS.includes(
      protocol
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Check whether hostname is a valid public hostname.
 */
export function isValidHostname(
  value = ''
) {
  const hostname =
    getURLHostname(value);

  if (!hostname) {
    return false;
  }

  if (
    isBlockedDomain(value)
  ) {
    return false;
  }

  /**
   * Reject obvious malformed hostnames.
   */
  if (
    hostname.length > 253
  ) {
    return false;
  }

  if (
    hostname.includes('..')
  ) {
    return false;
  }

  return true;
}

/**
 * Basic URL validation.
 */
export function validateURL(
  value = '',
  {
    allowHttp = false,
    requireHostname = true,
  } = {}
) {
  const url =
    normalizeURL(value);

  const errors = [];

  if (!url) {
    errors.push(
      'URL is required.'
    );

    return {
      valid: false,
      url,
      errors,
    };
  }

  if (
    hasDangerousPattern(url)
  ) {
    errors.push(
      'This URL uses a blocked protocol.'
    );
  }

  const parsed =
    parseURL(url);

  if (!parsed) {
    errors.push(
      'Invalid URL format.'
    );

    return {
      valid: false,
      url,
      errors,
    };
  }

  if (
    !isAllowedProtocol(
      url,
      {
        allowHttp,
      }
    )
  ) {
    errors.push(
      'Only HTTPS URLs are allowed.'
    );
  }

  if (
    requireHostname &&
    !isValidHostname(url)
  ) {
    errors.push(
      'Invalid or blocked hostname.'
    );
  }

  return {
    valid:
      errors.length === 0,

    url,

    protocol:
      parsed.protocol,

    hostname:
      parsed.hostname,

    pathname:
      parsed.pathname,

    errors,
  };
}

/**
 * Strict production URL validation.
 */
export function validateProductionURL(
  value = ''
) {
  return validateURL(
    value,
    {
      allowHttp: false,
      requireHostname: true,
    }
  );
}

/**
 * Development URL validation.
 *
 * HTTP is allowed only when explicitly requested.
 */
export function validateDevelopmentURL(
  value = ''
) {
  return validateURL(
    value,
    {
      allowHttp: true,
      requireHostname: true,
    }
  );
}

/**
 * Check whether a URL can be opened externally.
 */
export function canOpenExternalURL(
  value = ''
) {
  const result =
    validateProductionURL(
      value
    );

  return result.valid;
}

/**
 * Check whether a URL can be opened inside
 * a Nax WebView.
 */
export function canOpenInWebView(
  value = ''
) {
  const result =
    validateProductionURL(
      value
    );

  return result.valid;
}

/**
 * Check whether a URL can be used by a bot button.
 */
export function canUseBotURL(
  value = ''
) {
  return canOpenExternalURL(
    value
  );
}

/**
 * Check whether a URL can be used by a mini-app.
 */
export function canUseMiniAppURL(
  value = ''
) {
  return canOpenInWebView(
    value
  );
}

/**
 * Sanitize URL.
 *
 * Returns empty string if unsafe.
 */
export function sanitizeURL(
  value = ''
) {
  const result =
    validateProductionURL(
      value
    );

  if (!result.valid) {
    return '';
  }

  return result.url;
}

/**
 * Get safe URL or fallback.
 */
export function getSafeURL(
  value = '',
  fallback = ''
) {
  const safe =
    sanitizeURL(value);

  return safe || fallback;
}

/**
 * Check whether a URL is HTTPS.
 */
export function isHTTPS(
  value = ''
) {
  return (
    getURLProtocol(value) ===
    'https:'
  );
}

/**
 * Check whether URL points to an IP address.
 *
 * IP-hosted mini-apps can be handled more
 * restrictively by future backend policy.
 */
export function isIPAddress(
  value = ''
) {
  const hostname =
    getURLHostname(value);

  if (!hostname) {
    return false;
  }

  /**
   * IPv4.
   */
  const ipv4 =
    /^(?:\d{1,3}\.){3}\d{1,3}$/;

  /**
   * Basic IPv6 detection.
   */
  const ipv6 =
    hostname.includes(':');

  return (
    ipv4.test(hostname) ||
    ipv6
  );
}

/**
 * Check whether URL points to a private/local
 * network address.
 *
 * This helps prevent accidental access to local
 * development/internal services.
 */
export function isPrivateNetworkURL(
  value = ''
) {
  const hostname =
    getURLHostname(value);

  if (!hostname) {
    return false;
  }

  if (
    hostname ===
      'localhost' ||
    hostname ===
      '127.0.0.1' ||
    hostname ===
      '0.0.0.0' ||
    hostname ===
      '::1'
  ) {
    return true;
  }

  /**
   * IPv4 private ranges.
   */
  const privateIPv4 =
    /^(10\.)|^(192\.168\.)|^(172\.(1[6-9]|2\d|3[0-1])\.)/;

  if (
    privateIPv4.test(hostname)
  ) {
    return true;
  }

  return false;
}

/**
 * Validate URL for a public mini-app.
 */
export function validateMiniAppURL(
  value = ''
) {
  const result =
    validateProductionURL(
      value
    );

  if (
    isPrivateNetworkURL(value)
  ) {
    result.valid = false;

    result.errors.push(
      'Private or local network URLs are not allowed.'
    );
  }

  return {
    ...result,
    valid:
      result.valid &&
      !isPrivateNetworkURL(value),
  };
}

/**
 * Validate multiple URLs.
 */
export function validateURLs(
  urls = [],
  options = {}
) {
  if (!Array.isArray(urls)) {
    return {
      valid: false,
      results: [],
      errors: [
        'URLs must be an array.',
      ],
    };
  }

  const results =
    urls.map((url) =>
      validateURL(
        url,
        options
      )
    );

  const errors =
    results.flatMap(
      (result) =>
        result.errors
    );

  return {
    valid:
      results.every(
        (result) =>
          result.valid
      ),

    results,

    errors,
  };
}

/**
 * Validate bot button URL.
 */
export function validateBotButtonURL(
  url
) {
  return validateProductionURL(
    url
  );
}

/**
 * Validate external link.
 */
export function validateExternalLink(
  url
) {
  return validateProductionURL(
    url
  );
}

/**
 * Build a safe external link object.
 */
export function createSafeExternalLink({
  url,
  label = '',
  title = '',
} = {}) {
  const validation =
    validateExternalLink(
      url
    );

  if (!validation.valid) {
    return null;
  }

  return {
    url:
      validation.url,

    label:
      String(label || '').trim(),

    title:
      String(title || '').trim(),
  };
}

/**
 * Check redirect safety.
 *
 * Redirect URLs should be validated before every
 * navigation rather than trusting a previous result.
 */
export function validateRedirectURL(
  url
) {
  return validateProductionURL(
    url
  );
}

/**
 * Validate a list of allowed domains.
 */
export function normalizeAllowedDomains(
  domains = []
) {
  if (!Array.isArray(domains)) {
    return [];
  }

  return [
    ...new Set(
      domains
        .map((domain) =>
          String(domain || '')
            .trim()
            .toLowerCase()
            .replace(
              /^https?:\/\//,
              ''
            )
            .replace(
              /\/.*$/,
              ''
            )
        )
        .filter(Boolean)
    ),
  ];
}

/**
 * Check whether a URL belongs to one of the
 * explicitly allowed domains.
 *
 * Subdomains are accepted.
 */
export function isAllowedDomain(
  url,
  allowedDomains = []
) {
  const hostname =
    getURLHostname(url);

  if (!hostname) {
    return false;
  }

  const domains =
    normalizeAllowedDomains(
      allowedDomains
    );

  return domains.some(
    (domain) =>
      hostname === domain ||
      hostname.endsWith(
        `.${domain}`
      )
  );
}

/**
 * Validate URL against an allowlist.
 *
 * Useful for mini-apps that should only connect
 * to their declared service domains.
 */
export function validateURLWithAllowlist(
  url,
  allowedDomains = []
) {
  const validation =
    validateProductionURL(
      url
    );

  if (!validation.valid) {
    return validation;
  }

  if (
    !isAllowedDomain(
      url,
      allowedDomains
    )
  ) {
    return {
      ...validation,

      valid: false,

      errors: [
        ...validation.errors,
        'This domain is not in the mini-app allowlist.',
      ],
    };
  }

  return validation;
}

/**
 * Get URL security information.
 */
export function getURLSecurityInfo(
  url
) {
  const validation =
    validateProductionURL(
      url
    );

  return {
    ...validation,

    isHTTPS:
      isHTTPS(url),

    isIPAddress:
      isIPAddress(url),

    isPrivateNetwork:
      isPrivateNetworkURL(
        url
      ),

    isBlockedDomain:
      isBlockedDomain(url),

    canOpenExternally:
      validation.valid,

    canOpenInWebView:
      validation.valid,
  };
}

/**
 * URL validator object.
 */
export const URLValidator = {
  ALLOWED_PROTOCOLS,
  DEVELOPMENT_PROTOCOLS,
  BLOCKED_PROTOCOLS,
  BLOCKED_DOMAINS,

  normalizeURL,
  looksLikeURL,
  parseURL,

  getURLProtocol,
  getURLHostname,

  hasDangerousPattern,
  isBlockedDomain,
  isAllowedProtocol,
  isValidHostname,

  validateURL,
  validateProductionURL,
  validateDevelopmentURL,

  canOpenExternalURL,
  canOpenInWebView,

  canUseBotURL,
  canUseMiniAppURL,

  sanitizeURL,
  getSafeURL,

  isHTTPS,
  isIPAddress,
  isPrivateNetworkURL,

  validateMiniAppURL,
  validateURLs,

  validateBotButtonURL,
  validateExternalLink,

  createSafeExternalLink,
  validateRedirectURL,

  normalizeAllowedDomains,
  isAllowedDomain,
  validateURLWithAllowlist,

  getURLSecurityInfo,
};

export default URLValidator;
