/**
 * QR Code Generator for 2FA Setup
 * Generates QR codes compatible with Google Authenticator and other TOTP apps
 */

/**
 * Generate QR code image URL from TOTP URI
 * @param {string} totpURI - The TOTP URI (otpauth://totp/...)
 * @param {number} size - QR code size in pixels (default: 200)
 * @param {string} service - QR code service provider
 * @returns {string} - QR code image URL
 */
export const generateQRCodeURL = (totpURI, size = 200, service = 'qrserver') => {
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
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedURI}`;
    }
  } catch (error) {
    console.error('Error generating QR code URL:', error);
    throw new Error('Failed to generate QR code URL');
  }
};

/**
 * Generate QR code with error correction and styling options
 * @param {string} totpURI - The TOTP URI
 * @param {object} options - QR code options
 * @returns {string} - QR code image URL
 */
export const generateStyledQRCode = (totpURI, options = {}) => {
  try {
    const {
      size = 200,
      margin = 4,
      errorCorrectionLevel = 'M',
      service = 'qrserver'
    } = options;
    
    if (!totpURI) {
      throw new Error('TOTP URI is required');
    }
    
    const encodedURI = encodeURIComponent(totpURI);
    
    if (service === 'qrserver') {
      return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedURI}&margin=${margin}&ecc=${errorCorrectionLevel}`;
    }
    
    return generateQRCodeURL(totpURI, size, service);
  } catch (error) {
    console.error('Error generating styled QR code:', error);
    throw new Error('Failed to generate styled QR code');
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

/**
 * Generate QR code data URL (base64 encoded image)
 * @param {string} totpURI - The TOTP URI
 * @param {number} size - QR code size (default: 200)
 * @returns {Promise<string>} - Data URL of the QR code
 */
export const generateQRCodeDataURL = async (totpURI, size = 200) => {
  try {
    if (!totpURI) {
      throw new Error('TOTP URI is required');
    }
    
    const qrCodeURL = generateQRCodeURL(totpURI, size);
    const response = await fetch(qrCodeURL);
    
    if (!response.ok) {
      throw new Error('Failed to fetch QR code');
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error generating QR code data URL:', error);
    throw new Error('Failed to generate QR code data URL');
  }
};

/**
 * Download QR code as image file
 * @param {string} totpURI - The TOTP URI
 * @param {string} filename - Filename for download (default: '2fa-qr-code.png')
 * @param {number} size - QR code size (default: 200)
 */
export const downloadQRCode = async (totpURI, filename = '2fa-qr-code.png', size = 200) => {
  try {
    const dataURL = await generateQRCodeDataURL(totpURI, size);
    
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading QR code:', error);
    throw new Error('Failed to download QR code');
  }
};
