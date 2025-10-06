/**
 * Firebase MFA Integration
 * Handles MFA data storage and retrieval in Firebase Firestore
 */

import {
    getServerTimestamp,
    mfaOperations,
    withErrorHandling
} from './database';
import { decryptSecret, encryptSecret, isEncrypted } from './encryption';

/**
 * Firebase MFA utility functions
 * Manages the mfa subcollection for each admin user
 */

/**
 * Get MFA data for a specific admin from Firebase
 * @param {string} adminId - The admin ID
 * @returns {Promise<object|null>} - MFA data object or null if not found
 */
export const getMFAData = async (adminId) => {
  return withErrorHandling(async () => {
    if (!adminId) return null;
    return await mfaOperations.getMFAData(adminId);
  }, 'Get MFA data');
};

/**
 * Save MFA data for a specific admin to Firebase
 * @param {string} adminId - The admin ID
 * @param {object} mfaData - The MFA data object
 * @returns {Promise<boolean>} - True if successful
 */
export const saveMFAData = async (adminId, mfaData) => {
  return withErrorHandling(async () => {
    if (!adminId || !mfaData) return false;
    
    // Encrypt the secret before saving
    const dataToSave = {
      ...mfaData,
      secret: mfaData.secret ? encryptSecret(mfaData.secret) : mfaData.secret,
      createdAt: mfaData.createdAt || getServerTimestamp()
    };
    
    return await mfaOperations.setMFAData(adminId, dataToSave);
  }, 'Save MFA data');
};

/**
 * Enable 2FA for a specific admin in Firebase
 * @param {string} adminId - The admin ID
 * @param {string} secret - The base32 encoded secret
 * @param {string[]} backupCodes - Array of backup codes
 * @param {string} accountName - The account name
 * @param {string} serviceName - The service name
 * @returns {Promise<boolean>} - True if successful
 */
export const enable2FA = async (adminId, secret, backupCodes = '', accountName = '', serviceName = 'Cropify Admin') => {
  return withErrorHandling(async () => {
    if (!adminId || !secret) return false;
    
    const mfaData = {
      enabled: true,
      secret: secret,
      backupCodes: backupCodes, // string
      accountName: accountName,
      serviceName: serviceName,
      createdAt: getServerTimestamp(),
      lastVerifiedAt: getServerTimestamp(),
      setupCompleted: false
    };
    
    return await saveMFAData(adminId, mfaData);
  }, 'Enable 2FA');
};

/**
 * Complete 2FA setup (mark as completed after verification)
 * @param {string} adminId - The admin ID
 * @returns {Promise<boolean>} - True if successful
 */
export const complete2FASetup = async (adminId) => {
  return withErrorHandling(async () => {
    if (!adminId) return false;
    
    const updateData = {
      setupCompleted: true,
      lastVerifiedAt: getServerTimestamp()
    };
    
    return await mfaOperations.updateMFAData(adminId, updateData);
  }, 'Complete 2FA setup');
};

/**
 * Disable 2FA for a specific admin in Firebase (deletes MFA data completely)
 * @param {string} adminId - The admin ID
 * @returns {Promise<boolean>} - True if successful
 */
export const disable2FA = async (adminId) => {
  return withErrorHandling(async () => {
    if (!adminId) return false;
    
    // Delete MFA data completely - admin will need to set up again
    return await mfaOperations.deleteMFAData(adminId);
  }, 'Disable 2FA');
};

/**
 * Update last verified timestamp in Firebase
 * @param {string} adminId - The admin ID
 * @returns {Promise<boolean>} - True if successful
 */
export const updateLastVerified = async (adminId) => {
  return withErrorHandling(async () => {
    if (!adminId) return false;
    
    const updateData = {
      lastVerifiedAt: getServerTimestamp()
    };
    
    return await mfaOperations.updateMFAData(adminId, updateData);
  }, 'Update last verified timestamp');
};

/**
 * Check if 2FA is enabled for a specific admin in Firebase
 * @param {string} adminId - The admin ID
 * @returns {Promise<boolean>} - True if 2FA is enabled
 */
export const is2FAEnabled = async (adminId) => {
  return withErrorHandling(async () => {
    if (!adminId) return false;
    
    const mfaData = await getMFAData(adminId);
    return mfaData && mfaData.enabled === true && mfaData.setupCompleted === true;
  }, 'Check 2FA status');
};


/**
 * Get the 2FA secret for a specific admin from Firebase
 * @param {string} adminId - The admin ID
 * @returns {Promise<string|null>} - The decrypted secret or null if not found
 */
export const get2FASecret = async (adminId) => {
  return withErrorHandling(async () => {
    if (!adminId) return null;
    
    const mfaData = await getMFAData(adminId);
    if (!mfaData || !mfaData.enabled || !mfaData.secret) return null;
    
    // Decrypt the secret if it's encrypted
    const secret = isEncrypted(mfaData.secret) ? decryptSecret(mfaData.secret) : mfaData.secret;
    return secret;
  }, 'Get 2FA secret');
};

/**
 * Get backup codes for a specific admin from Firebase
 * @param {string} adminId - The admin ID
 * @returns {Promise<string[]|null>} - Array of backup codes or null if not found
 */
export const getBackupCodes = async (adminId) => {
  return withErrorHandling(async () => {
    if (!adminId) return null;
    
    const mfaData = await getMFAData(adminId);
    return mfaData && mfaData.enabled ? mfaData.backupCodes || [] : null;
  }, 'Get backup codes');
};

/**
 * Update backup codes for a specific admin in Firebase
 * @param {string} adminId - The admin ID
 * @param {string[]} backupCodes - New array of backup codes
 * @returns {Promise<boolean>} - True if successful
 */
export const updateBackupCodes = async (adminId, backupCodes) => {
  return withErrorHandling(async () => {
    if (!adminId || !Array.isArray(backupCodes)) return false;
    
    const updateData = {
      backupCodes: backupCodes
    };
    
    return await mfaOperations.updateMFAData(adminId, updateData);
  }, 'Update backup codes');
};

/**
 * Verify and remove a backup code from Firebase
 * @param {string} adminId - The admin ID
 * @param {string} backupCode - The backup code to verify and remove
 * @returns {Promise<boolean>} - True if backup code was valid and removed
 */
export const verifyAndRemoveBackupCode = async (adminId, backupCode) => {
  return withErrorHandling(async () => {
    if (!adminId || !backupCode) return false;
    
    const mfaData = await getMFAData(adminId);
    if (!mfaData || !mfaData.backupCodes) return false;
    
    const codeIndex = mfaData.backupCodes.indexOf(backupCode);
    if (codeIndex === -1) return false;
    
    // Remove the used backup code
    const updatedBackupCodes = [...mfaData.backupCodes];
    updatedBackupCodes.splice(codeIndex, 1);
    
    // Update Firebase with the new backup codes
    await updateBackupCodes(adminId, updatedBackupCodes);
    
    return true;
  }, 'Verify and remove backup code');
};
