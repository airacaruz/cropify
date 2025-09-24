import {
    deleteDoc,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Firebase MFA (Multi-Factor Authentication) utility functions
 * Manages the mfa subcollection for each admin user
 */

/**
 * Get MFA data for a specific admin
 * @param {string} adminId - The admin ID
 * @returns {Promise<object|null>} - MFA data object or null if not found
 */
export const getMFAData = async (adminId) => {
  try {
    if (!adminId) return null;
    
    const mfaRef = doc(db, 'admins', adminId, 'mfa', 'totp');
    const mfaSnap = await getDoc(mfaRef);
    
    if (mfaSnap.exists()) {
      return {
        id: mfaSnap.id,
        ...mfaSnap.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting MFA data:', error);
    throw error;
  }
};

/**
 * Save MFA data for a specific admin
 * @param {string} adminId - The admin ID
 * @param {object} mfaData - The MFA data object
 * @returns {Promise<boolean>} - True if successful
 */
export const saveMFAData = async (adminId, mfaData) => {
  try {
    if (!adminId || !mfaData) return false;
    
    const mfaRef = doc(db, 'admins', adminId, 'mfa', 'totp');
    
    const dataToSave = {
      ...mfaData,
      createdAt: mfaData.createdAt || serverTimestamp(),
      lastUpdated: serverTimestamp()
    };
    
    await setDoc(mfaRef, dataToSave, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving MFA data:', error);
    throw error;
  }
};

/**
 * Enable 2FA for a specific admin
 * @param {string} adminId - The admin ID
 * @param {string} secret - The base32 encoded secret
 * @returns {Promise<boolean>} - True if successful
 */
export const enable2FA = async (adminId, secret) => {
  try {
    if (!adminId || !secret) return false;
    
    const mfaData = {
      enabled: true,
      secret: secret,
      createdAt: serverTimestamp(),
      lastVerifiedAt: null
    };
    
    return await saveMFAData(adminId, mfaData);
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    throw error;
  }
};

/**
 * Disable 2FA for a specific admin
 * @param {string} adminId - The admin ID
 * @returns {Promise<boolean>} - True if successful
 */
export const disable2FA = async (adminId) => {
  try {
    if (!adminId) return false;
    
    const mfaRef = doc(db, 'admins', adminId, 'mfa', 'totp');
    await deleteDoc(mfaRef);
    return true;
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    throw error;
  }
};

/**
 * Update last verified timestamp
 * @param {string} adminId - The admin ID
 * @returns {Promise<boolean>} - True if successful
 */
export const updateLastVerified = async (adminId) => {
  try {
    if (!adminId) return false;
    
    const mfaRef = doc(db, 'admins', adminId, 'mfa', 'totp');
    await updateDoc(mfaRef, {
      lastVerifiedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating last verified:', error);
    throw error;
  }
};

/**
 * Check if 2FA is enabled for a specific admin
 * @param {string} adminId - The admin ID
 * @returns {Promise<boolean>} - True if 2FA is enabled
 */
export const is2FAEnabled = async (adminId) => {
  try {
    if (!adminId) return false;
    
    const mfaData = await getMFAData(adminId);
    return mfaData && mfaData.enabled === true;
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return false;
  }
};

/**
 * Get the 2FA secret for a specific admin
 * @param {string} adminId - The admin ID
 * @returns {Promise<string|null>} - The secret or null if not found
 */
export const get2FASecret = async (adminId) => {
  try {
    if (!adminId) return null;
    
    const mfaData = await getMFAData(adminId);
    return mfaData && mfaData.enabled ? mfaData.secret : null;
  } catch (error) {
    console.error('Error getting 2FA secret:', error);
    return null;
  }
};
