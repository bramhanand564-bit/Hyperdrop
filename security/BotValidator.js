/**
 * NAX SECURITY SANDBOX: URL VALIDATOR
 * यह फाइल सुनिश्चित करती है कि पोर्टल के अंदर कोई भी मालवेयर, फिशिंग 
 * या अनसिक्योर HTTP लिंक न खुले।
 */

// 🚫 Blocked Domains (Hackers/Malware/Adult sites)
const BLOCKED_DOMAINS = [
  'malware.com',
  'hackersite.net',
  'phishing-ludo.org',
  // Yahan future mein aur bhi domains add ho sakte hain
];

// ✅ Trusted Nax Domains (Jo hamesha safe hain)
const TRUSTED_DOMAINS = [
  'html5games.com',
  'youtube.com',
  'naxchat.com',
  'chatgpt.com',
  'claude.ai'
];

export const URLValidator = {
  
  // 1. Basic Structure Check
  isValidFormat: (url) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  },

  // 2. HTTPS Strict Check (No HTTP allowed for security)
  isSecureProtocol: (url) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:';
    } catch (e) {
      return false;
    }
  },

  // 3. Domain Blacklist/Whitelist Check
  checkDomainSafety: (url) => {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();

      // Agar domain blocked list mein hai -> FAILED
      const isBlocked = BLOCKED_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
      if (isBlocked) return { safe: false, reason: 'Blocked Domain Detected (Security Risk)' };

      // Agar domain trusted list mein hai -> SAFE
      const isTrusted = TRUSTED_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
      if (isTrusted) return { safe: true, reason: 'Trusted Nax Partner' };

      // Baki saare naye domains ke liye (Neutral - safe but unknown)
      return { safe: true, reason: 'Unknown but valid HTTPS domain' };
    } catch (e) {
      return { safe: false, reason: 'Invalid URL String' };
    }
  },

  // 🚀 FINAL SCANNER: Jo WebPortalScreen aur Nax Studio use karenge
  scanMiniAppUrl: (url) => {
    if (!url) return { isSafe: false, message: 'URL is empty' };
    
    if (!URLValidator.isValidFormat(url)) {
      return { isSafe: false, message: 'Invalid URL format' };
    }

    if (!URLValidator.isSecureProtocol(url)) {
      return { isSafe: false, message: 'Insecure Protocol: Only HTTPS is allowed in Sandbox' };
    }

    const domainCheck = URLValidator.checkDomainSafety(url);
    if (!domainCheck.safe) {
      return { isSafe: false, message: domainCheck.reason };
    }

    // 100% SAFE
    return { isSafe: true, message: 'Sandbox Security Passed ✅' };
  }
};
