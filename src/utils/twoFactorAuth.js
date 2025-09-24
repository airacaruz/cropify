import {
    disable2FA,
    enable2FA,
    is2FAEnabled as firebaseIs2FAEnabled,
    get2FASecret,
    getMFAData,
    saveMFAData,
    updateLastVerified
} from './firebaseMFA';
import {
    generateCurrentToken,
    generateQRCodeURL,
    generateSecret,
    generateURI,
    getTimeRemaining,
    getTimeUsed,
    verifyToken
} from './otplib';

/**
 * Two-Factor Authentication utility functions
 * Based on otplib documentation: https://github.com/yeojz/otplib.git
 */

/**
 * Verify a 2FA token against a stored secret
 * @param {string} token - The 6-digit token from authenticator app
 * @param {string} secret - The base32 encoded secret
 * @returns {boolean} - True if token is valid
 */
export const verify2FAToken = (token, secret) => {
  return verifyToken(token, secret);
};

/**
 * Verify a 2FA token for a specific admin (using Firebase)
 * @param {string} adminId - The admin ID
 * @param {string} token - The 6-digit token from authenticator app
 * @returns {Promise<boolean>} - True if token is valid
 */
export const verify2FATokenForAdmin = async (adminId, token) => {
  try {
    if (!adminId || !token) return false;
    
    const secret = await get2FASecret(adminId);
    if (!secret) return false;
    
    const isValid = verify2FAToken(token, secret);
    
    if (isValid) {
      // Update last verified timestamp
      await updateLastVerified(adminId);
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying 2FA token for admin:', error);
    return false;
  }
};

/**
 * Generate a new 2FA secret
 * @returns {string} - Base32 encoded secret
 */
export const generate2FASecret = () => {
  return generateSecret();
};

/**
 * Generate a TOTP URI for QR code generation
 * @param {string} accountName - The account name (usually email or username)
 * @param {string} serviceName - The service name (e.g., "Cropify Admin")
 * @param {string} secret - The base32 encoded secret
 * @returns {string} - The otpauth URI
 */
export const generate2FAURI = (accountName, serviceName, secret) => {
  return generateURI(accountName, serviceName, secret);
};

/**
 * Generate QR code URL for 2FA setup
 * @param {string} totpURI - The TOTP URI
 * @param {number} size - QR code size (default: 200)
 * @returns {string} - QR code image URL
 */
export const generate2FAQRCodeURL = (totpURI, size = 200) => {
  return generateQRCodeURL(totpURI, size);
};

/**
 * Generate a current token from a secret (useful for testing)
 * @param {string} secret - The base32 encoded secret
 * @returns {string|null} - The current 6-digit token or null if error
 */
export const generateCurrent2FAToken = (secret) => {
  return generateCurrentToken(secret);
};

/**
 * Get time remaining for current token validity period
 * @returns {number} - Seconds remaining in current validity period
 */
export const getTokenTimeRemaining = () => {
  return getTimeRemaining();
};

/**
 * Get time used in current token validity period
 * @returns {number} - Seconds used in current validity period
 */
export const getTokenTimeUsed = () => {
  return getTimeUsed();
};

/**
 * Check if 2FA is enabled for a specific admin (using Firebase)
 * @param {string} adminId - The admin ID
 * @returns {Promise<boolean>} - True if 2FA is enabled
 */
export const is2FAEnabled = async (adminId) => {
  try {
    return await firebaseIs2FAEnabled(adminId);
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return false;
  }
};

/**
 * Get 2FA data for a specific admin (using Firebase)
 * @param {string} adminId - The admin ID
 * @returns {Promise<object|null>} - 2FA data object or null if not found
 */
export const get2FAData = async (adminId) => {
  try {
    return await getMFAData(adminId);
  } catch (error) {
    console.error('Error getting 2FA data:', error);
    return null;
  }
};

/**
 * Save 2FA data for a specific admin (using Firebase)
 * @param {string} adminId - The admin ID
 * @param {object} twoFAData - The 2FA data object
 * @returns {Promise<boolean>} - True if successful
 */
export const save2FAData = async (adminId, twoFAData) => {
  try {
    return await saveMFAData(adminId, twoFAData);
  } catch (error) {
    console.error('Error saving 2FA data:', error);
    return false;
  }
};

/**
 * Remove 2FA data for a specific admin (disable 2FA) (using Firebase)
 * @param {string} adminId - The admin ID
 * @returns {Promise<boolean>} - True if successful
 */
export const remove2FAData = async (adminId) => {
  try {
    return await disable2FA(adminId);
  } catch (error) {
    console.error('Error removing 2FA data:', error);
    return false;
  }
};

/**
 * Enable 2FA for a specific admin (using Firebase)
 * @param {string} adminId - The admin ID
 * @param {string} secret - The base32 encoded secret
 * @returns {Promise<boolean>} - True if successful
 */
export const enable2FAForAdmin = async (adminId, secret) => {
  try {
    return await enable2FA(adminId, secret);
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    return false;
  }
};
