# Authentication Module

Complete Two-Factor Authentication (2FA) solution for Google Authenticator integration, based on the [otplib repository](https://github.com/yeojz/otplib.git).

## Features

- ✅ **Google Authenticator Compatible** - Full RFC6238 TOTP standard support
- ✅ **QR Code Generation** - Multiple QR code service providers
- ✅ **Firebase Integration** - Secure storage in Firestore
- ✅ **Backup Codes** - Emergency access codes
- ✅ **Time-based Tokens** - 30-second validity windows
- ✅ **Setup Instructions** - Step-by-step guidance
- ✅ **Error Handling** - Comprehensive error management

## Structure

```
src/Authentication/
├── index.js              # Main export file
├── otplib.js             # Core OTP functionality
├── qrCodeGenerator.js    # QR code generation utilities
├── mfaManager.js         # MFA management class
├── firebaseMFA.js        # Firebase integration
└── README.md             # This documentation
```

## Quick Start

### Basic Setup

```javascript
import { setupComplete2FA, verifyAdmin2FA } from '../Authentication';

// Setup 2FA for an admin
const setupData = await setupComplete2FA(
  'admin123', 
  'admin@example.com', 
  'Cropify Admin'
);

console.log('QR Code URL:', setupData.qrCodeURL);
console.log('Secret:', setupData.secret);
console.log('Backup Codes:', setupData.backupCodes);
```

### Verify Token

```javascript
// Verify a 6-digit token
const isValid = await verifyAdmin2FA('admin123', '123456');
console.log('Token valid:', isValid);
```

## API Reference

### Core Functions

#### `setupComplete2FA(adminId, accountName, serviceName)`
Complete 2FA setup for an admin user.

**Parameters:**
- `adminId` (string) - The admin ID
- `accountName` (string) - Account name (email or username)
- `serviceName` (string) - Service name (default: "Cropify Admin")

**Returns:** Promise<object>
```javascript
{
  success: true,
  secret: "base32-encoded-secret",
  qrCodeURL: "https://api.qrserver.com/...",
  totpURI: "otpauth://totp/...",
  backupCodes: ["12345678", "87654321", ...],
  accountName: "admin@example.com",
  serviceName: "Cropify Admin"
}
```

#### `verifyAdmin2FA(adminId, token)`
Verify a 2FA token for an admin.

**Parameters:**
- `adminId` (string) - The admin ID
- `token` (string) - 6-digit token from authenticator app

**Returns:** Promise<boolean>

#### `completeAdmin2FASetup(adminId, token)`
Complete 2FA setup after verification.

**Parameters:**
- `adminId` (string) - The admin ID
- `token` (string) - Verification token

**Returns:** Promise<boolean>

#### `disableAdmin2FA(adminId)`
Disable 2FA for an admin.

**Parameters:**
- `adminId` (string) - The admin ID

**Returns:** Promise<boolean>

#### `isAdmin2FAEnabled(adminId)`
Check if 2FA is enabled for an admin.

**Parameters:**
- `adminId` (string) - The admin ID

**Returns:** Promise<boolean>

### MFA Manager

```javascript
import { mfaManager } from '../Authentication';

// Initialize 2FA setup
const setupData = mfaManager.initialize2FA('user@example.com', 'MyApp');

// Verify token
const isValid = mfaManager.verify2FAToken('123456');

// Get current token (for testing)
const currentToken = mfaManager.getCurrentToken();

// Get setup instructions
const instructions = mfaManager.getSetupInstructions();
```

### QR Code Generation

```javascript
import { generateQRCodeURL, generateStyledQRCode } from '../Authentication';

// Basic QR code
const qrURL = generateQRCodeURL(totpURI, 200);

// Styled QR code
const styledQR = generateStyledQRCode(totpURI, {
  size: 300,
  margin: 8,
  errorCorrectionLevel: 'H'
});
```

## Firebase Database Structure

```
admins (collection)
└── {adminId} (document)
    └── mfa (subcollection)
         └── totp (document)
              ├── enabled: true
              ├── secret: "base32-encoded-secret"
              ├── backupCodes: ["12345678", "87654321", ...]
              ├── accountName: "admin@example.com"
              ├── serviceName: "Cropify Admin"
              ├── setupCompleted: true
              ├── createdAt: timestamp
              ├── lastVerifiedAt: timestamp
              └── lastUpdated: timestamp
```

## Google Authenticator Setup

1. **Download App**: Install Google Authenticator from App Store or Google Play
2. **Scan QR Code**: Use the generated QR code URL to display a scannable QR code
3. **Manual Setup**: If QR code fails, use the secret key for manual entry
4. **Verify**: Enter the 6-digit code to complete setup
5. **Backup Codes**: Save the generated backup codes securely

## Security Features

- **Base32 Encoding**: Compatible with Google Authenticator
- **Time-based Tokens**: 30-second validity windows
- **Backup Codes**: 8-digit emergency access codes
- **Firebase Security**: Secure server-side storage
- **Error Handling**: Comprehensive validation and error management

## Compatible Apps

- ✅ Google Authenticator
- ✅ Microsoft Authenticator
- ✅ Authy
- ✅ Any RFC6238 TOTP-compliant app

## Error Handling

All functions include comprehensive error handling:

```javascript
try {
  const result = await setupComplete2FA('admin123', 'admin@example.com');
  if (result.success) {
    // Setup successful
    console.log('QR Code:', result.qrCodeURL);
  } else {
    // Setup failed
    console.error('Error:', result.error);
  }
} catch (error) {
  console.error('Setup failed:', error);
}
```

## Testing

```javascript
import { mfaManager } from '../Authentication';

// Test current token generation
const currentToken = mfaManager.getCurrentToken();
console.log('Current token:', currentToken);

// Test token verification
const isValid = mfaManager.verify2FAToken(currentToken);
console.log('Token valid:', isValid);
```

## Dependencies

- [otplib](https://github.com/yeojz/otplib.git) - Core OTP library
- Firebase Firestore - Data persistence
- React - UI components (if using React components)

## License

Based on the MIT-licensed [otplib](https://github.com/yeojz/otplib.git) project.
