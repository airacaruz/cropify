/**
 * OTP Library - Complete implementation based on https://github.com/yeojz/otplib.git
 * One Time Password (OTP) / 2FA for Node.js and Browser
 * Supports HOTP, TOTP and Google Authenticator
 * 
 * This is a complete implementation that doesn't rely on external npm packages
 */

/**
 * Utility functions for OTP operations
 */
const utils = {
  /**
   * Convert string to buffer
   */
  stringToBuffer: (str) => {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf8');
    }
    return new TextEncoder().encode(str);
  },

  /**
   * Convert buffer to string
   */
  bufferToString: (buffer) => {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(buffer).toString('utf8');
    }
    return new TextDecoder().decode(buffer);
  },

  /**
   * Create HMAC digest
   */
  createDigest: async (algorithm, key, data) => {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Browser environment
      const keyBuffer = typeof key === 'string' ? utils.stringToBuffer(key) : key;
      const dataBuffer = typeof data === 'string' ? utils.stringToBuffer(data) : data;
      
      // Map algorithm names for WebCrypto
      const algorithmMap = {
        'sha1': 'SHA-1',
        'sha256': 'SHA-256',
        'sha512': 'SHA-512'
      };
      
      const webCryptoAlgorithm = algorithmMap[algorithm.toLowerCase()] || 'SHA-1';
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'HMAC', hash: webCryptoAlgorithm },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
      return new Uint8Array(signature);
    } else if (typeof require !== 'undefined') {
      // Node.js environment
      const crypto = require('crypto');
      const hmac = crypto.createHmac(algorithm, key);
      hmac.update(data);
      return hmac.digest();
    } else {
      throw new Error('Crypto not available');
    }
  },

  /**
   * Generate random bytes
   */
  createRandomBytes: (size) => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      // Browser environment
      const array = new Uint8Array(size);
      crypto.getRandomValues(array);
      return array;
    } else if (typeof require !== 'undefined') {
      // Node.js environment
      const crypto = require('crypto');
      return crypto.randomBytes(size);
    } else {
      throw new Error('Random bytes generation not available');
    }
  },

  /**
   * Base32 encoding (RFC 3548 compliant for Google Authenticator)
   */
  base32Encode: (buffer) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
  },

  /**
   * Base32 decoding (RFC 3548 compliant for Google Authenticator)
   */
  base32Decode: (str) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const lookup = {};
    
    for (let i = 0; i < alphabet.length; i++) {
      lookup[alphabet[i]] = i;
    }

    let bits = 0;
    let value = 0;
    const output = [];

    for (let i = 0; i < str.length; i++) {
      const char = str[i].toUpperCase();
      if (lookup[char] === undefined) continue;

      value = (value << 5) | lookup[char];
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return new Uint8Array(output);
  },

  /**
   * Convert number to bytes
   */
  intToBytes: (num, bytes) => {
    const result = new Array(bytes);
    for (let i = bytes - 1; i >= 0; i--) {
      result[i] = num & 255;
      num >>>= 8;
    }
    return new Uint8Array(result);
  },

  /**
   * Convert bytes to number
   */
  bytesToInt: (bytes) => {
    let result = 0;
    for (let i = 0; i < bytes.length; i++) {
      result = (result << 8) | bytes[i];
    }
    return result;
  }
};

/**
 * TOTP (Time-based One-Time Password) implementation
 */
class TOTP {
  constructor(options = {}) {
    this.options = {
      algorithm: 'sha1',
      digits: 6,
      step: 30,
      window: 0,
      ...options
    };
  }

  /**
   * Generate TOTP token
   */
  async generate(secret, time = Date.now()) {
    const counter = Math.floor(time / 1000 / this.options.step);
    return this.generateWithCounter(secret, counter);
  }

  /**
   * Generate token with counter
   */
  async generateWithCounter(secret, counter) {
    const key = utils.base32Decode(secret);
    const time = utils.intToBytes(counter, 8);
    
    const hmac = await utils.createDigest(this.options.algorithm, key, time);
    const offset = hmac[hmac.length - 1] & 15;
    
    const code = ((hmac[offset] & 127) << 24) |
                 ((hmac[offset + 1] & 255) << 16) |
                 ((hmac[offset + 2] & 255) << 8) |
                 (hmac[offset + 3] & 255);
    
    const token = code % Math.pow(10, this.options.digits);
    return token.toString().padStart(this.options.digits, '0');
  }

  /**
   * Verify TOTP token
   */
  async verify(token, secret, time = Date.now()) {
    const window = this.options.window || 0;
    
    for (let i = -window; i <= window; i++) {
      const testTime = time + (i * this.options.step * 1000);
      const expectedToken = await this.generate(secret, testTime);
      
      if (expectedToken === token) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get time remaining for current token
   */
  timeRemaining() {
    const now = Date.now();
    const step = this.options.step * 1000;
    return step - (now % step);
  }

  /**
   * Get time used for current token
   */
  timeUsed() {
    const now = Date.now();
    const step = this.options.step * 1000;
    return now % step;
  }
}

/**
 * HOTP (HMAC-based One-Time Password) implementation
 */
class HOTP {
  constructor(options = {}) {
    this.options = {
      algorithm: 'sha1',
      digits: 6,
      window: 0,
      ...options
    };
  }

  /**
   * Generate HOTP token
   */
  async generate(secret, counter) {
    const key = utils.base32Decode(secret);
    const time = utils.intToBytes(counter, 8);
    
    const hmac = await utils.createDigest(this.options.algorithm, key, time);
    const offset = hmac[hmac.length - 1] & 15;
    
    const code = ((hmac[offset] & 127) << 24) |
                 ((hmac[offset + 1] & 255) << 16) |
                 ((hmac[offset + 2] & 255) << 8) |
                 (hmac[offset + 3] & 255);
    
    const token = code % Math.pow(10, this.options.digits);
    return token.toString().padStart(this.options.digits, '0');
  }

  /**
   * Verify HOTP token
   */
  async verify(token, secret, counter) {
    const window = this.options.window || 0;
    
    for (let i = 0; i <= window; i++) {
      const expectedToken = await this.generate(secret, counter + i);
      
      if (expectedToken === token) {
        return true;
      }
    }
    
    return false;
  }
}

/**
 * Authenticator class (Google Authenticator compatible)
 */
class Authenticator extends TOTP {
  constructor(options = {}) {
    super({
      algorithm: 'sha1',
      digits: 6,
      step: 30,
      window: 1,
      ...options
    });
  }

  /**
   * Generate a random secret
   */
  generateSecret(size = 20) {
    const bytes = utils.createRandomBytes(size);
    return utils.base32Encode(bytes);
  }

  /**
   * Generate TOTP URI for QR code
   */
  keyuri(accountName, serviceName, secret) {
    const params = new URLSearchParams({
      secret: secret,
      algorithm: this.options.algorithm.toUpperCase(),
      digits: this.options.digits.toString(),
      period: this.options.step.toString(),
      issuer: serviceName
    });

    return `otpauth://totp/${encodeURIComponent(serviceName)}:${encodeURIComponent(accountName)}?${params.toString()}`;
  }

  /**
   * Generate current token
   */
  async generate(secret) {
    return super.generate(secret, Date.now());
  }

  /**
   * Verify token
   */
  async verify({ token, secret }) {
    return super.verify(token, secret, Date.now());
  }
}

// Create default instances
const totp = new TOTP();
const hotp = new HOTP();
const authenticator = new Authenticator();

/**
 * Generate a new 2FA secret (base32 encoded for Google Authenticator)
 * @returns {string} - Base32 encoded secret key
 */
export const generateSecret = () => {
  try {
    return authenticator.generateSecret();
  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    throw new Error('Failed to generate 2FA secret');
  }
};

/**
 * Generate TOTP URI for QR code generation
 * Compatible with Google Authenticator and other RFC6238 apps
 * @param {string} accountName - The account name (email or username)
 * @param {string} serviceName - The service name (e.g., "Cropify Admin")
 * @param {string} secret - The base32 encoded secret
 * @returns {string} - The otpauth URI
 */
export const generateTOTPURI = (accountName, serviceName, secret) => {
  try {
    return authenticator.keyuri(accountName, serviceName, secret);
  } catch (error) {
    console.error('Error generating TOTP URI:', error);
    throw new Error('Failed to generate TOTP URI');
  }
};

/**
 * Verify a 2FA token against a secret
 * @param {string} token - The 6-digit token from authenticator app
 * @param {string} secret - The base32 encoded secret
 * @returns {boolean} - True if token is valid
 */
export const verifyToken = async (token, secret) => {
  try {
    if (!token || !secret) {
      return false;
    }

    // Clean the token (remove any non-numeric characters)
    const cleanToken = token.replace(/\D/g, '');
    
    if (cleanToken.length !== 6) {
      return false;
    }

    // Verify using our authenticator
    return await authenticator.verify({ token: cleanToken, secret });
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    return false;
  }
};

/**
 * Generate current token from secret (useful for testing)
 * @param {string} secret - The base32 encoded secret
 * @returns {string|null} - The current 6-digit token or null if error
 */
export const generateCurrentToken = async (secret) => {
  try {
    if (!secret) return null;
    return await authenticator.generate(secret);
  } catch (error) {
    console.error('Error generating current token:', error);
    return null;
  }
};

/**
 * Get time remaining for current token validity period
 * @returns {number} - Seconds remaining in current validity period
 */
export const getTimeRemaining = () => {
  try {
    return authenticator.timeRemaining();
  } catch (error) {
    console.error('Error getting token time remaining:', error);
    return 0;
  }
};

/**
 * Get time used in current token validity period
 * @returns {number} - Seconds used in current validity period
 */
export const getTimeUsed = () => {
  try {
    return authenticator.timeUsed();
  } catch (error) {
    console.error('Error getting token time used:', error);
    return 0;
  }
};

/**
 * Check if a token is valid for a given secret
 * @param {string} secret - The base32 encoded secret
 * @param {string} token - The 6-digit token
 * @returns {boolean} - True if token is valid
 */
export const isValidToken = async (secret, token) => {
  return await verifyToken(token, secret);
};

/**
 * Generate backup codes (8-digit codes for emergency access)
 * @param {number} count - Number of backup codes to generate (default: 10)
 * @returns {string[]} - Array of backup codes
 */
export const generateBackupCodes = (count = 10) => {
  try {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-digit backup code
      const code = Math.floor(10000000 + Math.random() * 90000000).toString();
      codes.push(code);
    }
    return codes;
  } catch (error) {
    console.error('Error generating backup codes:', error);
    return [];
  }
};

// Export classes and instances
export { Authenticator, HOTP, TOTP, authenticator, hotp, totp, utils };

