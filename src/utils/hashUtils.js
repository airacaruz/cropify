/**
 * Hashing utility for sensitive data display
 * Creates consistent hashes for UIDs and phone numbers to protect privacy
 */

/**
 * Simple hash function for display purposes
 * Creates a consistent hash that's not reversible but consistent for the same input
 * @param {string} input - The string to hash
 * @param {number} length - Length of the hash to return (default: 8)
 * @returns {string} - Hashed string
 */
export const hashForDisplay = (input, length = 8) => {
  if (!input) return 'N/A';
  
  try {
    // Create a simple hash using a combination of methods
    let hash = 0;
    const str = String(input);
    
    // Simple hash algorithm
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to positive number and then to base36
    const positiveHash = Math.abs(hash);
    const hashString = positiveHash.toString(36);
    
    // Pad with zeros if needed and truncate to desired length
    const paddedHash = hashString.padStart(length, '0');
    return paddedHash.substring(0, length);
  } catch (error) {
    console.error('Error hashing input:', error);
    return '****';
  }
};

/**
 * Mask UID for display showing last 3 characters
 * @param {string} uid - The user ID
 * @returns {string} - Masked UID with last 3 characters visible
 */
export const hashUID = (uid) => {
  if (!uid) return 'N/A';
  
  const str = String(uid);
  if (str.length <= 3) {
    return '*'.repeat(str.length);
  }
  
  // Show last 3 characters, mask the rest with asterisks
  const visiblePart = str.substring(str.length - 3);
  const hiddenPart = str.substring(0, str.length - 3);
  const maskedPart = '*'.repeat(hiddenPart.length);
  
  return `${maskedPart}${visiblePart}`;
};

/**
 * Mask phone number for display showing last 3 digits
 * @param {string} phone - The phone number
 * @returns {string} - Masked phone number with last 3 digits visible
 */
export const hashPhone = (phone) => {
  if (!phone) return 'N/A';
  
  // Clean phone number (remove non-digits)
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length <= 3) {
    return '*'.repeat(cleanPhone.length);
  }
  
  // Show last 3 digits, mask the rest with asterisks
  const visiblePart = cleanPhone.substring(cleanPhone.length - 3);
  const hiddenPart = cleanPhone.substring(0, cleanPhone.length - 3);
  const maskedPart = '*'.repeat(hiddenPart.length);
  
  return `${maskedPart}${visiblePart}`;
};

/**
 * Create a masked version of sensitive data
 * @param {string} input - The input to mask
 * @param {number} visibleStart - Number of characters to show at start
 * @param {number} visibleEnd - Number of characters to show at end
 * @returns {string} - Masked string
 */
export const maskSensitiveData = (input, visibleStart = 2, visibleEnd = 2) => {
  if (!input) return 'N/A';
  
  const str = String(input);
  if (str.length <= visibleStart + visibleEnd) {
    return '*'.repeat(str.length);
  }
  
  const start = str.substring(0, visibleStart);
  const end = str.substring(str.length - visibleEnd);
  const middle = '*'.repeat(Math.max(4, str.length - visibleStart - visibleEnd));
  
  return `${start}${middle}${end}`;
};
