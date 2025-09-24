# Database Setup Guide for Cropify Authentication

This guide explains how to set up and use the database handler for the Cropify Authentication system.

## 🗄️ Database Structure

### Firebase Firestore Collections

```
cropify-8e68d/
├── admins/
│   └── {adminId}/
│       └── mfa/
│           └── totp/
│               ├── enabled: boolean
│               ├── secret: string (base32)
│               ├── backupCodes: string[]
│               ├── accountName: string
│               ├── serviceName: string
│               ├── createdAt: timestamp
│               ├── lastVerifiedAt: timestamp
│               ├── lastUpdated: timestamp
│               └── setupCompleted: boolean
```

## 🔧 Setup Instructions

### 1. Firebase Configuration

Your Firebase configuration is already set up in `src/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDw76Wvqrckyz3jD7iscPHixaJ-I2M0r9Y",
  authDomain: "cropify-8e68d.firebaseapp.com",
  projectId: "cropify-8e68d",
  storageBucket: "cropify-8e68d.appspot.com",
  messagingSenderId: "781285242880",
  appId: "1:781285242880:web:b42465242f97da0adcc0e5"
};
```

### 2. Firestore Security Rules

Add these rules to your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin MFA data - only accessible by authenticated admins
    match /admins/{adminId}/mfa/{document=**} {
      allow read, write: if request.auth != null 
        && request.auth.uid == adminId
        && request.auth.token.role in ['admin', 'superadmin'];
    }
    
    // Admin documents - only accessible by authenticated admins
    match /admins/{adminId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == adminId
        && request.auth.token.role in ['admin', 'superadmin'];
    }
  }
}
```

### 3. Database Initialization

The database is automatically initialized when you import the Authentication module:

```javascript
import { initializeDatabase, testDatabaseConnection } from '../Authentication';

// Test connection
const isConnected = await testDatabaseConnection();
console.log('Database connected:', isConnected);
```

## 📊 Database Operations

### Basic Operations

```javascript
import { 
  documentOperations, 
  collectionOperations, 
  mfaOperations 
} from '../Authentication';

// Get a document
const adminData = await documentOperations.get('admins', 'admin123');

// Set a document
await documentOperations.set('admins', 'admin123', {
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin'
});

// Update a document
await documentOperations.update('admins', 'admin123', {
  lastLogin: new Date()
});

// Delete a document
await documentOperations.delete('admins', 'admin123');
```

### MFA-Specific Operations

```javascript
import { mfaOperations } from '../Authentication';

// Get MFA data
const mfaData = await mfaOperations.getMFAData('admin123');

// Set MFA data
await mfaOperations.setMFAData('admin123', {
  enabled: true,
  secret: 'JBSWY3DPEHPK3PXP',
  backupCodes: ['123456', '789012'],
  accountName: 'john@example.com',
  serviceName: 'Cropify Admin'
});

// Update MFA data
await mfaOperations.updateMFAData('admin123', {
  lastVerifiedAt: new Date()
});

// Delete MFA data
await mfaOperations.deleteMFAData('admin123');
```

### Collection Operations

```javascript
import { collectionOperations } from '../Authentication';

// Get all documents with filters
const admins = await collectionOperations.getAll('admins', {
  where: [
    { field: 'role', operator: '==', value: 'admin' }
  ],
  orderBy: [
    { field: 'createdAt', direction: 'desc' }
  ],
  limit: 10
});

// Listen to real-time changes
const unsubscribe = collectionOperations.listen('admins', (docs) => {
  console.log('Admins updated:', docs);
}, {
  where: [
    { field: 'active', operator: '==', value: true }
  ]
});

// Stop listening
unsubscribe();
```

## 🔒 Error Handling

The database handler includes comprehensive error handling:

```javascript
import { withErrorHandling } from '../Authentication';

const result = await withErrorHandling(async () => {
  // Your database operation
  return await someDatabaseOperation();
}, 'Custom operation name');
```

### Common Error Types

- **permission-denied**: Check authentication and Firestore rules
- **unavailable**: Database is temporarily unavailable
- **deadline-exceeded**: Operation timed out
- **resource-exhausted**: Database quota exceeded

## 🚀 Usage Examples

### 1. Complete 2FA Setup

```javascript
import { 
  setupComplete2FA, 
  verifyAdmin2FA, 
  completeAdmin2FASetup 
} from '../Authentication';

// Step 1: Generate setup data
const setupData = await setupComplete2FA('admin123', 'john@example.com', 'Cropify Admin');

// Step 2: User scans QR code and enters token
const isValid = await verifyAdmin2FA('admin123', '123456');

// Step 3: Complete setup
if (isValid) {
  await completeAdmin2FASetup('admin123', '123456');
}
```

### 2. Check 2FA Status

```javascript
import { isAdmin2FAEnabled } from '../Authentication';

const isEnabled = await isAdmin2FAEnabled('admin123');
console.log('2FA enabled:', isEnabled);
```

### 3. Disable 2FA

```javascript
import { disableAdmin2FA } from '../Authentication';

await disableAdmin2FA('admin123');
```

### 4. Batch Operations

```javascript
import { createBatch, commitBatch } from '../Authentication';

const batch = createBatch();

// Add multiple operations to batch
batch.set(doc(db, 'admins', 'admin1'), { name: 'Admin 1' });
batch.set(doc(db, 'admins', 'admin2'), { name: 'Admin 2' });

// Commit all operations at once
await commitBatch(batch);
```

## 🔧 Troubleshooting

### Connection Issues

```javascript
import { 
  isDatabaseConnected, 
  enableDatabaseConnection, 
  disableDatabaseConnection 
} from '../Authentication';

// Check connection status
console.log('Connected:', isDatabaseConnected());

// Enable/disable connection
await enableDatabaseConnection();
await disableDatabaseConnection();
```

### Testing Database Operations

```javascript
import { testDatabaseConnection } from '../Authentication';

const isWorking = await testDatabaseConnection();
if (!isWorking) {
  console.error('Database connection failed');
}
```

## 📝 Best Practices

1. **Always use error handling**: Wrap database operations in try-catch blocks
2. **Use batch operations**: For multiple writes, use batch operations
3. **Implement retry logic**: For critical operations, implement retry mechanisms
4. **Monitor connection status**: Check connection status before operations
5. **Use proper security rules**: Ensure Firestore rules match your access patterns
6. **Handle offline scenarios**: Implement offline support for critical features

## 🎯 Performance Tips

1. **Use indexes**: Create composite indexes for complex queries
2. **Limit data**: Use pagination for large datasets
3. **Cache frequently accessed data**: Store frequently used data in memory
4. **Use real-time listeners sparingly**: Only listen to data that changes frequently
5. **Optimize queries**: Use specific field selections and proper ordering

## 🔐 Security Considerations

1. **Validate input**: Always validate data before saving to database
2. **Use server timestamps**: Use `serverTimestamp()` for consistent timestamps
3. **Implement rate limiting**: Prevent abuse of database operations
4. **Audit logs**: Log important database operations
5. **Regular backups**: Set up automated backups of critical data

This database setup provides a robust foundation for your Cropify Authentication system with comprehensive error handling, security, and performance optimizations.
