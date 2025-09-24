import { authenticator } from 'otplib';

/**
 * Core OTP (One-Time Password) functions using otplib
 * Based on otplib documentation: https://github.com/yeojz/otplib.git
 */

/**
 * Generate a new 2FA secret
 * @returns {string} - Base32 encoded secret
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
 * Generate a TOTP URI for QR code generation
 * @param {string} accountName - The account name (usually email or username)
 * @param {string} serviceName - The service name (e.g., "Cropify Admin")
 * @param {string} secret - The base32 encoded secret
 * @returns {string} - The otpauth URI
 */
export const generateURI = (accountName, serviceName, secret) => {
  try {
    return authenticator.keyuri(accountName, serviceName, secret);
  } catch (error) {
    console.error('Error generating 2FA URI:', error);
    throw new Error('Failed to generate 2FA URI');
  }
};

/**
 * Verify a 2FA token against a secret
 * @param {string} token - The 6-digit token from authenticator app
 * @param {string} secret - The base32 encoded secret
 * @returns {boolean} - True if token is valid
 */
export const verifyToken = (token, secret) => {
  try {
    if (!token || !secret) {
      return false;
    }

    // Clean the token (remove any non-numeric characters)
    const cleanToken = token.replace(/\D/g, '');
    
    if (cleanToken.length !== 6) {
      return false;
    }

    return authenticator.verify({
      token: cleanToken,
      secret: secret
    });
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    return false;
  }
};

/**
 * Generate a current token from a secret (useful for testing)
 * @param {string} secret - The base32 encoded secret
 * @returns {string|null} - The current 6-digit token or null if error
 */
export const generateCurrentToken = (secret) => {
  try {
    if (!secret) return null;
    return authenticator.generate(secret);
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
