# OTP Library Utilities

This folder contains organized utilities for One-Time Password (OTP) functionality using the [otplib](https://github.com/yeojz/otplib.git) library.

## Structure

```
src/utils/otplib/
├── index.js          # Main export file - exports all utilities
├── otpCore.js        # Core OTP functions (secret generation, verification, etc.)
├── qrCode.js         # QR code generation utilities
└── README.md         # This documentation file
```

## Files

### `index.js`
Main export file that provides a clean interface to all OTP utilities:
- Re-exports all core OTP functions
- Re-exports QR code utilities
- Re-exports the authenticator for direct access if needed

### `otpCore.js`
Core OTP functionality:
- `generateSecret()` - Generate base32-encoded secrets
- `generateURI()` - Create TOTP URIs for QR codes
- `verifyToken()` - Verify 6-digit tokens
- `generateCurrentToken()` - Generate current token (for testing)
- `getTimeRemaining()` - Get time left in validity period
- `getTimeUsed()` - Get time used in validity period

### `qrCode.js`
QR code generation utilities:
- `generateQRCodeURL()` - Generate QR code image URLs
- `generateQRCodeURLAlternative()` - Alternative QR code services
- `validateQRCodeURL()` - Validate QR code accessibility

## Usage

### Basic Import
```javascript
import { generateSecret, verifyToken, generateQRCodeURL } from '../utils/otplib';
```

### Full Import
```javascript
import * as otpUtils from '../utils/otplib';
```

### Direct Authenticator Access
```javascript
import { authenticator } from '../utils/otplib';
```

## Examples

### Generate Secret and QR Code
```javascript
import { generateSecret, generateURI, generateQRCodeURL } from '../utils/otplib';

const secret = generateSecret();
const uri = generateURI('user@example.com', 'MyApp', secret);
const qrCodeURL = generateQRCodeURL(uri, 200);
```

### Verify Token
```javascript
import { verifyToken } from '../utils/otplib';

const isValid = verifyToken('123456', secret);
```

### Get Time Information
```javascript
import { getTimeRemaining, getTimeUsed } from '../utils/otplib';

const remaining = getTimeRemaining(); // seconds left
const used = getTimeUsed(); // seconds used
```

## Dependencies

- [otplib](https://github.com/yeojz/otplib.git) - Core OTP library
- Firebase Firestore - For data persistence (handled in parent utilities)

## Compatibility

This implementation is compatible with:
- Google Authenticator
- Microsoft Authenticator
- Authy
- Any RFC6238 TOTP-compliant authenticator app

## Security Notes

- Secrets are base32-encoded for Google Authenticator compatibility
- All functions include proper error handling
- Time-based tokens follow TOTP standard (30-second windows)
- QR codes use secure HTTPS endpoints
