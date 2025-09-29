# Security Headers Implementation

This document outlines the security headers implemented for the Cropify application to enhance security and protect against common web vulnerabilities.

## Implemented Security Headers

### 1. Content-Security-Policy (CSP)
**Purpose**: Prevents Cross-Site Scripting (XSS) attacks by controlling which resources can be loaded and executed.

**Configuration**:
```
default-src 'self'; 
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com https://apis.google.com https://accounts.google.com https://www.googleapis.com; 
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
font-src 'self' https://fonts.gstatic.com; 
img-src 'self' data: https:; 
connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; 
frame-src 'none'; 
object-src 'none'; 
base-uri 'self'; 
form-action 'self';
```

**What it allows**:
- Scripts from same origin, Google services, and Firebase
- Styles from same origin, inline styles, and Google Fonts
- Images from same origin, data URLs, and HTTPS sources
- Connections to Firebase and Google APIs
- Blocks all frames and objects
- Restricts base URI and form actions to same origin

### 2. X-Frame-Options
**Purpose**: Prevents clickjacking attacks by controlling whether the page can be embedded in frames.

**Configuration**: `DENY`
- Completely prevents the page from being displayed in any frame
- Protects against clickjacking attacks

### 3. X-Content-Type-Options
**Purpose**: Prevents MIME type sniffing attacks.

**Configuration**: `nosniff`
- Prevents browsers from MIME-sniffing responses
- Forces browsers to respect the declared Content-Type

### 4. Referrer-Policy
**Purpose**: Controls how much referrer information is sent with requests.

**Configuration**: `strict-origin-when-cross-origin`
- Sends full URL for same-origin requests
- Sends only origin for cross-origin HTTPS requests
- Sends nothing for cross-origin HTTP requests

### 5. Permissions-Policy (formerly Feature-Policy)
**Purpose**: Controls which browser features can be used by the page.

**Configuration**: 
```
camera=(), microphone=(), geolocation=(), payment=(), usb=(), 
magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), 
autoplay=(), encrypted-media=(), fullscreen=(self), picture-in-picture=()
```

**What it blocks**:
- Camera and microphone access
- Geolocation
- Payment API
- USB access
- Various sensors
- Autoplay media
- Encrypted media
- Picture-in-picture (except for same origin)
- Allows fullscreen only for same origin

### 6. Cross-Origin-Embedder-Policy (COEP)
**Purpose**: Allows a site to prevent assets from being loaded if they don't grant permission via CORS or CORP.

**Configuration**: `require-corp`
- Requires all cross-origin resources to have Cross-Origin-Resource-Policy header
- Enables Cross-Origin Isolation for enhanced security
- Prevents certain side-channel attacks

### 7. Cross-Origin-Opener-Policy (COOP)
**Purpose**: Allows a site to opt-in to Cross-Origin Isolation in the browser.

**Configuration**: `same-origin`
- Restricts cross-origin window access to same-origin only
- Prevents cross-origin window manipulation
- Enhances security for sensitive operations

### 8. Cross-Origin-Resource-Policy (CORP)
**Purpose**: Allows a resource owner to specify who can load the resource.

**Configuration**: `same-origin`
- Restricts resource loading to same-origin requests only
- Prevents cross-origin resource embedding
- Works in conjunction with COEP for enhanced security

## Additional Security Measures

### Meta Tags Added
- `robots: noindex, nofollow` - Prevents search engine indexing
- `format-detection: telephone=no` - Prevents automatic phone number detection

## Implementation Locations

1. **Firebase Hosting Configuration** (`firebase.json`)
   - Server-level headers applied to all responses
   - Takes precedence over meta tags

2. **HTML Meta Tags** (`index.html`)
   - Client-side fallback security headers
   - Applied when server headers are not available

## Deployment Instructions

1. **Test Locally**:
   ```bash
   npm run build
   firebase serve
   ```

2. **Deploy to Firebase**:
   ```bash
   firebase deploy
   ```

3. **Verify Headers**:
   - Use browser developer tools to check response headers
   - Test with security header scanning tools like:
     - Security Headers by Snyk
     - Mozilla Observatory
     - SSL Labs

## Security Benefits

- **XSS Protection**: CSP prevents malicious script injection
- **Clickjacking Protection**: X-Frame-Options prevents iframe embedding
- **MIME Sniffing Protection**: X-Content-Type-Options prevents content type confusion
- **Privacy Protection**: Referrer-Policy controls information leakage
- **Feature Control**: Permissions-Policy restricts dangerous browser APIs
- **Cross-Origin Isolation**: COEP, COOP, and CORP enable enhanced security isolation
- **Side-Channel Attack Prevention**: Cross-origin policies prevent timing and other attacks
- **Resource Protection**: CORP prevents unauthorized resource embedding

## Monitoring and Maintenance

- Regularly test security headers using online tools
- Monitor for CSP violations in browser console
- Update CSP if new external services are added
- Review and update permissions policy as needed

## Notes

- The CSP includes `'unsafe-inline'` and `'unsafe-eval'` for React development
- Consider removing these in production if possible
- Firebase and Google services are explicitly allowed for authentication and hosting
- All external resources use HTTPS for secure connections


