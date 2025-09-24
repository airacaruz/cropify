/**
 * Authentication Module - Main Export File
 * Complete 2FA/MFA solution for Google Authenticator integration
 * Based on https://github.com/yeojz/otplib.git
 */

// Core OTP functionality
export {
    authenticator, generateBackupCodes, generateCurrentToken, generateSecret,
    generateTOTPURI, getTimeRemaining,
    getTimeUsed,
    isValidToken, verifyToken
} from './otplib';

// QR Code generation
export {
    downloadQRCode, generateQRCodeDataURL, generateQRCodeURL,
    generateStyledQRCode,
    validateQRCodeURL
} from './qrCodeGenerator';

// MFA Manager
export {
    MFAManager,
    mfaManager
} from './mfaManager';

// Firebase integration
export {
    complete2FASetup,
    disable2FA, enable2FA, get2FASecret,
    getBackupCodes, getMFAData, is2FAEnabled, saveMFAData, updateBackupCodes, updateLastVerified, verifyAndRemoveBackupCode
} from './firebaseMFA';

// Database utilities
export {
    collectionOperations, commitBatch, createBatch, createCollectionRef, createDocRef, disableDatabaseConnection, documentOperations, enableDatabaseConnection, getDatabase, getServerTimestamp, initializeDatabase, isDatabaseConnected, mfaOperations, testDatabaseConnection, withErrorHandling
} from './database';

// Database testing utilities
export {
    quickHealthCheck, runAllDatabaseTests, testConnection,
    testDocumentOperations, testErrorHandling, testMFAOperations
} from './databaseTest';

/**
 * Complete 2FA setup function
 * @param {string} adminId - The admin ID
 * @param {string} accountName - The account name (email or username)
 * @param {string} serviceName - The service name (default: "Cropify Admin")
 * @returns {Promise<object>} - Complete setup data
 */
export const setupComplete2FA = async (adminId, accountName, serviceName = 'Cropify Admin') => {
  try {
    const { mfaManager } = await import('./mfaManager');
    const { enable2FA } = await import('./firebaseMFA');
    
    // Initialize 2FA setup
    const setupData = mfaManager.initialize2FA(accountName, serviceName);
    
    // Save to Firebase
    await enable2FA(adminId, setupData.secret, setupData.backupCodes, accountName, serviceName);
    
    return {
      success: true,
      ...setupData
    };
  } catch (error) {
    console.error('Error setting up complete 2FA:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verify 2FA token for admin
 * @param {string} adminId - The admin ID
 * @param {string} token - The 6-digit token
 * @returns {Promise<boolean>} - True if token is valid
 */
export const verifyAdmin2FA = async (adminId, token) => {
  try {
    const { get2FASecret, updateLastVerified } = await import('./firebaseMFA');
    const { verifyToken } = await import('./otplib');
    
    const secret = await get2FASecret(adminId);
    if (!secret) return false;
    
    const isValid = verifyToken(token, secret);
    
    if (isValid) {
      await updateLastVerified(adminId);
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying admin 2FA:', error);
    return false;
  }
};

/**
 * Complete 2FA setup after verification
 * @param {string} adminId - The admin ID
 * @param {string} token - The verification token
 * @returns {Promise<boolean>} - True if setup completed successfully
 */
export const completeAdmin2FASetup = async (adminId, token) => {
  try {
    const { get2FASecret, complete2FASetup } = await import('./firebaseMFA');
    const { verifyToken } = await import('./otplib');
    
    const secret = await get2FASecret(adminId);
    if (!secret) return false;
    
    const isValid = verifyToken(token, secret);
    
    if (isValid) {
      await complete2FASetup(adminId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error completing admin 2FA setup:', error);
    return false;
  }
};

/**
 * Disable 2FA for admin
 * @param {string} adminId - The admin ID
 * @returns {Promise<boolean>} - True if disabled successfully
 */
export const disableAdmin2FA = async (adminId) => {
  try {
    const { disable2FA } = await import('./firebaseMFA');
    return await disable2FA(adminId);
  } catch (error) {
    console.error('Error disabling admin 2FA:', error);
    return false;
  }
};

/**
 * Check if admin has 2FA enabled
 * @param {string} adminId - The admin ID
 * @returns {Promise<boolean>} - True if 2FA is enabled
 */
export const isAdmin2FAEnabled = async (adminId) => {
  try {
    const { is2FAEnabled } = await import('./firebaseMFA');
    return await is2FAEnabled(adminId);
  } catch (error) {
    console.error('Error checking admin 2FA status:', error);
    return false;
  }
};
