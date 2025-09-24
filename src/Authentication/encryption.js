/**
 * Simple Encryption Utility for 2FA Secrets
 * Encrypts secrets before storing in Firebase to prevent other admins from seeing them
 */

/**
 * Simple encryption key - in production, this should be stored securely
 * For now, using a base64 encoded key that's consistent across sessions
 */
const ENCRYPTION_KEY = btoa('Cropify2FA2024SecretKey!@#');

/**
 * Simple XOR encryption/decryption
 * @param {string} text - Text to encrypt/decrypt
 * @param {string} key - Encryption key
 * @returns {string} - Encrypted/decrypted text
 */
function xorEncrypt(text, key) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

/**
 * Encrypt a 2FA secret before storing in Firebase
 * @param {string} secret - The plain text secret
 * @returns {string} - The encrypted secret
 */
export const encryptSecret = (secret) => {
  try {
    if (!secret) return secret;
    
    // Convert to base64 for safe storage
    const encrypted = xorEncrypt(secret, ENCRYPTION_KEY);
    return btoa(encrypted);
  } catch (error) {
    console.error('Error encrypting secret:', error);
    return secret; // Return original if encryption fails
  }
};

/**
 * Decrypt a 2FA secret after retrieving from Firebase
 * @param {string} encryptedSecret - The encrypted secret from Firebase
 * @returns {string} - The decrypted secret
 */
export const decryptSecret = (encryptedSecret) => {
  try {
    if (!encryptedSecret) return encryptedSecret;
    
    // Decode from base64 and decrypt
    const decoded = atob(encryptedSecret);
    return xorEncrypt(decoded, ENCRYPTION_KEY);
  } catch (error) {
    console.error('Error decrypting secret:', error);
    return encryptedSecret; // Return original if decryption fails
  }
};

/**
 * Check if a string appears to be encrypted (base64 format)
 * @param {string} str - String to check
 * @returns {boolean} - True if appears to be encrypted
 */
export const isEncrypted = (str) => {
  try {
    // Check if it's valid base64 and doesn't look like a plain secret
    if (!str || typeof str !== 'string') return false;
    
    // Base64 regex
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    
    // If it's base64 and longer than typical plain secrets, it's likely encrypted
    return base64Regex.test(str) && str.length > 20;
  } catch (error) {
    return false;
  }
};
