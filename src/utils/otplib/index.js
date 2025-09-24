/**
 * OTP Library utilities - Main export file
 * Organized otplib functionality for 2FA implementation
 */

// Core OTP functions
export {
    generateCurrentToken, generateSecret,
    generateURI, getTimeRemaining,
    getTimeUsed, verifyToken
} from './otpCore';

// QR Code utilities
export {
    generateQRCodeURL,
    generateQRCodeURLAlternative,
    validateQRCodeURL
} from './qrCode';

// Re-export authenticator for direct access if needed
export { authenticator } from 'otplib';

