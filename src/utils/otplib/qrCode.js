/**
 * QR Code generation utilities for 2FA setup
 */

/**
 * Generate QR code image URL from TOTP URI
 * @param {string} totpURI - The TOTP URI (otpauth://totp/...)
 * @param {number} size - QR code size in pixels (default: 200)
 * @returns {string} - QR code image URL
 */
export const generateQRCodeURL = (totpURI, size = 200) => {
  try {
    if (!totpURI) {
      throw new Error('TOTP URI is required');
    }
    
    const encodedURI = encodeURIComponent(totpURI);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedURI}`;
  } catch (error) {
    console.error('Error generating QR code URL:', error);
    throw new Error('Failed to generate QR code URL');
  }
};

/**
 * Alternative QR code generation using different services
 * @param {string} totpURI - The TOTP URI (otpauth://totp/...)
 * @param {number} size - QR code size in pixels (default: 200)
 * @param {string} service - QR code service ('qrserver', 'google', 'qrcode')
 * @returns {string} - QR code image URL
 */
export const generateQRCodeURLAlternative = (totpURI, size = 200, service = 'qrserver') => {
  try {
    if (!totpURI) {
      throw new Error('TOTP URI is required');
    }
    
    const encodedURI = encodeURIComponent(totpURI);
    
    switch (service) {
      case 'qrserver':
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedURI}`;
      
      case 'google':
        return `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodedURI}`;
      
      case 'qrcode':
        return `https://api.qr-code-generator.com/v1/create?access-token=YOUR_TOKEN&size=${size}x${size}&data=${encodedURI}`;
      
      default:
        return generateQRCodeURL(totpURI, size);
    }
  } catch (error) {
    console.error('Error generating alternative QR code URL:', error);
    throw new Error('Failed to generate QR code URL');
  }
};

/**
 * Validate if a QR code URL is accessible
 * @param {string} qrCodeURL - The QR code image URL
 * @returns {Promise<boolean>} - True if QR code is accessible
 */
export const validateQRCodeURL = async (qrCodeURL) => {
  try {
    if (!qrCodeURL) return false;
    
    const response = await fetch(qrCodeURL, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error validating QR code URL:', error);
    return false;
  }
};
