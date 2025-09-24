/**
 * Multi-Factor Authentication Manager
 * Handles 2FA setup, verification, and management for Google Authenticator
 */

import {
    generateBackupCodes,
    generateCurrentToken,
    generateSecret,
    generateTOTPURI,
    getTimeRemaining,
    verifyToken
} from './otplib.js';
import { generateQRCodeURL, generateStyledQRCode } from './qrCodeGenerator.js';

/**
 * MFA Manager Class
 */
export class MFAManager {
  constructor() {
    this.secret = null;
    this.qrCodeURL = null;
    this.backupCodes = [];
  }

  /**
   * Initialize 2FA setup for a user
   * @param {string} accountName - User's account name (email or username)
   * @param {string} serviceName - Service name (e.g., "Cropify Admin")
   * @returns {object} - Setup data including secret, QR code URL, and backup codes
   */
  initialize2FA(accountName, serviceName = 'Cropify Admin') {
    try {
      // Generate new secret
      this.secret = generateSecret();
      
      // Generate TOTP URI
      const totpURI = generateTOTPURI(accountName, serviceName, this.secret);
      
      // Generate QR code URL
      this.qrCodeURL = generateQRCodeURL(totpURI, 200);
      
      // Generate backup codes
      this.backupCodes = generateBackupCodes(10);
      
      return {
        secret: this.secret,
        qrCodeURL: this.qrCodeURL,
        totpURI: totpURI,
        backupCodes: this.backupCodes,
        accountName: accountName,
        serviceName: serviceName
      };
    } catch (error) {
      console.error('Error initializing 2FA:', error);
      throw new Error('Failed to initialize 2FA setup');
    }
  }

  /**
   * Verify a 2FA token
   * @param {string} token - The 6-digit token from authenticator app
   * @param {string} secret - The secret to verify against (optional, uses stored secret if not provided)
   * @returns {Promise<boolean>} - True if token is valid
   */
  async verify2FAToken(token, secret = null) {
    try {
      const secretToUse = secret || this.secret;
      if (!secretToUse) {
        throw new Error('No secret available for verification');
      }
      
      return await verifyToken(token, secretToUse);
    } catch (error) {
      console.error('Error verifying 2FA token:', error);
      return false;
    }
  }

  /**
   * Generate current token for testing
   * @param {string} secret - The secret to use (optional, uses stored secret if not provided)
   * @returns {Promise<string|null>} - Current 6-digit token or null if error
   */
  async getCurrentToken(secret = null) {
    try {
      const secretToUse = secret || this.secret;
      if (!secretToUse) {
        throw new Error('No secret available');
      }
      
      return await generateCurrentToken(secretToUse);
    } catch (error) {
      console.error('Error generating current token:', error);
      return null;
    }
  }

  /**
   * Get time remaining for current token
   * @returns {number} - Seconds remaining in current validity period
   */
  getTimeRemaining() {
    return getTimeRemaining();
  }

  /**
   * Generate styled QR code with custom options
   * @param {string} totpURI - The TOTP URI
   * @param {object} options - QR code styling options
   * @returns {string} - Styled QR code URL
   */
  generateStyledQRCode(totpURI, options = {}) {
    return generateStyledQRCode(totpURI, options);
  }

  /**
   * Validate backup code
   * @param {string} code - The backup code to validate
   * @returns {boolean} - True if backup code is valid
   */
  validateBackupCode(code) {
    try {
      if (!code || code.length !== 8) {
        return false;
      }
      
      // Check if code is numeric
      if (!/^\d{8}$/.test(code)) {
        return false;
      }
      
      // Check if code exists in backup codes
      return this.backupCodes.includes(code);
    } catch (error) {
      console.error('Error validating backup code:', error);
      return false;
    }
  }

  /**
   * Remove used backup code
   * @param {string} code - The backup code to remove
   * @returns {boolean} - True if code was removed successfully
   */
  removeBackupCode(code) {
    try {
      const index = this.backupCodes.indexOf(code);
      if (index > -1) {
        this.backupCodes.splice(index, 1);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing backup code:', error);
      return false;
    }
  }

  /**
   * Get setup instructions for Google Authenticator
   * @returns {object} - Setup instructions
   */
  getSetupInstructions() {
    return {
      title: 'Setup Two-Factor Authentication',
      steps: [
        {
          step: 1,
          title: 'Download Google Authenticator',
          description: 'Download and install Google Authenticator on your mobile device from the App Store or Google Play Store.',
          platforms: ['iOS', 'Android']
        },
        {
          step: 2,
          title: 'Scan QR Code',
          description: 'Open Google Authenticator and tap the "+" button to add a new account. Select "Scan a QR code" and scan the QR code displayed on your screen.',
          action: 'scan'
        },
        {
          step: 3,
          title: 'Manual Setup (Alternative)',
          description: 'If you cannot scan the QR code, you can manually enter the setup key in Google Authenticator.',
          action: 'manual'
        },
        {
          step: 4,
          title: 'Verify Setup',
          description: 'Enter the 6-digit code from Google Authenticator to verify that 2FA is working correctly.',
          action: 'verify'
        },
        {
          step: 5,
          title: 'Save Backup Codes',
          description: 'Save your backup codes in a secure location. These codes can be used to access your account if you lose your device.',
          action: 'backup'
        }
      ]
    };
  }

  /**
   * Get current setup data
   * @returns {object} - Current setup data
   */
  getSetupData() {
    return {
      secret: this.secret,
      qrCodeURL: this.qrCodeURL,
      backupCodes: this.backupCodes,
      timeRemaining: this.getTimeRemaining()
    };
  }

  /**
   * Reset 2FA setup
   */
  reset() {
    this.secret = null;
    this.qrCodeURL = null;
    this.backupCodes = [];
  }
}

// Export a default instance
export const mfaManager = new MFAManager();
