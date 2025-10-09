# 🌱 Cropify Sensor Inventory Management System

## Overview

This system implements a comprehensive sensor inventory management solution with automatic code generation and tracking.

## Database Structure

### Firestore Collections

#### 1. **SensorCollection** (Inventory/Vault)
Stores all available sensors for assignment. This is the master inventory.

#### 2. **SensorKits** (Deployed Sensors)
Stores detailed information about sensors that have been deployed/linked to users. The system merges data from both collections to provide complete information.

```javascript
SensorCollection/
  0002/  // Sensor Number (4-digit padded)
    {
      sensorNumber: "0002",
      sensorCode: null,              // Generated when linked: "CROP-0002-123456"
      status: "available",           // available | deployed | maintenance | retired
      linked: false,                 // Boolean - is it assigned to a user?
      linkedTo: null,                // User ID when linked
      linkedAt: null,                // ISO timestamp
      plantName: null,               // Plant name when linked
      linkedBy: null,                // Admin who linked it
      createdAt: "2024-10-09T...",
      createdBy: "System",
      condition: "new",              // new | good | fair | needs_repair
      model: "Cropify Sensor v1",
      capabilities: {
        ph: true,
        ec: true,
        temperature: true,
        humidity: true
      }
    }
```

#### 3. **SensorKits Structure**
```javascript
SensorKits/
  0001/  // Sensor Number
    {
      sensorCode: "123456",
      plantName: "Tomato Plant",
      userId: "NtRy1oCH...",
      linked: true,
      linkedPlantId: "8K7DmIAvM...",
      lastLinkTimestamp: "2025-10-09T...",
      createdAt: "2025-10-09T..."
    }
```

### Data Merging Logic

The system intelligently merges data from both `SensorCollection` and `SensorKits`:

1. **Sensor in BOTH collections** → Uses detailed data from `SensorKits` (plantName, userId, sensorCode)
2. **Sensor ONLY in SensorCollection** → Shows as available in inventory
3. **Sensor ONLY in SensorKits** → Shows as deployed (legacy data)

This ensures you always see the most complete and up-to-date information!

### Realtime Database

#### 4. **Plants** (Active Deployments)
Stores plant information with linked sensors.

```javascript
Plants/
  {plantId}/
    {
      sensorNumber: "0002",
      sensorCode: "CROP-0002-123456",
      plantName: "Tomato Plant #1",
      userId: "user123",
      linked: true,
      linkedPlantId: "{plantId}",
      lastLinkTimestamp: "2024-10-09T...",
      createdAt: "2024-10-09T...",
      createdBy: "Admin Name"
    }
```

## 🚀 Initial Setup

### Step 1: Initialize Sensor Inventory

Run this **ONCE** to populate your database with sensors from 0002 to 1000.

#### Option A: Using Browser Console

1. Open your admin dashboard
2. Open browser DevTools (F12)
3. Go to Console tab
4. Paste and run:

```javascript
import { initializeSensorInventory } from './src/utils/initializeSensorInventory.js';

// Initialize sensors 0002 - 1000
initializeSensorInventory(2, 1000)
  .then(results => console.log('✅ Done!', results))
  .catch(error => console.error('❌ Error:', error));
```

#### Option B: Using a One-Time Script

Create a file `scripts/initSensors.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeSensorInventory } from '../src/utils/initializeSensorInventory.js';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

initializeSensorInventory(2, 1000)
  .then(results => {
    console.log('✅ Initialization complete!', results);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  });
```

Run it:
```bash
node scripts/initSensors.js
```

### Step 2: Verify Inventory

Check your Firestore console:
`https://console.firebase.google.com/project/cropify-8e68d/firestore/data/SensorCollection`

You should see sensors numbered 0002, 0003, 0004... up to 1000.

## 📋 Usage Workflow

### Admin: Distributing Sensor Codes

1. **Navigate to Sensor Logs** page
2. **Click "Add Sensor Kit"** button
3. **Select a sensor** from the dropdown
   - Shows all sensors (available and distributed)
   - Shows: `Sensor #0002 - 🟢 Available` or `Sensor #0003 - 🔴 Linked (Tomato) - User: NtRy1oCH...`
4. **Click "Generate & Distribute Code"**
5. **Copy the 6-digit code** and provide it to the user/farmer

### What Happens Automatically:

1. ✅ **Generates unique 6-digit sensor code:**
   ```
   123456
   456789
   789012
   ```

2. ✅ **Updates SensorCollection:**
   ```javascript
   {
     sensorCode: "123456",
     status: "distributed", // Code distributed but not yet activated
     distributedAt: "2024-10-09T12:34:56.789Z",
     distributedBy: "Admin Name",
     linked: false, // User hasn't connected it yet
     linkedTo: null,
     plantName: null
   }
   ```

3. ✅ **Code is ready for user** - admin provides code to user

### User: Connecting Plant (Mobile App)

1. **User opens Cropify mobile app**
2. **User navigates to "Link Sensor Kit"**
3. **User fills in the form:**
   - **Plant Name** (e.g., "My Tomato Garden")
   - **Plant Type** (e.g., "Tomato", "Lettuce", "Cucumber")
   - **Sensor Code** (6-digit code from admin: e.g., "456789")
4. **User clicks "Connect"**
5. **System validates and updates:**
   - SensorCollection: `linked: true, linkedTo: userId, plantName: "My Tomato Garden", status: "deployed"`
   - SensorKits: Creates entry with plant name, plant type, and user details
   - Realtime DB: Creates entry in Plants collection with full plant info

## 🔒 Security Features

### Code Distribution Tracking
- Tracks **who distributed** the code (`distributedBy`)
- Tracks **when distributed** (`distributedAt`)
- Sensors can be redistributed if needed (generates new code)
- Complete history in SensorCollection

### Audit Trail
- Admin distribution is logged
- User activation is tracked (when user connects plant)
- Full lifecycle: `available` → `distributed` → `deployed` (when user connects)
- Maintains data integrity across all collections

## 📊 Monitoring

### Check Inventory Status

```javascript
import { checkSensorInventory } from './src/utils/initializeSensorInventory.js';

checkSensorInventory(db)
  .then(stats => console.log(stats));

// Output:
// {
//   total: 999,
//   available: 850,
//   linked: 149,
//   deployed: 149,
//   maintenance: 0
// }
```

### View in Firebase Console

**SensorCollection (Firestore):**
```
https://console.firebase.google.com/project/cropify-8e68d/firestore/data/SensorCollection
```

**Plants (Realtime DB):**
```
https://console.firebase.google.com/project/cropify-8e68d/database/cropify-8e68d-default-rtdb/data/Plants
```

## 🔧 Maintenance

### Add More Sensors

```javascript
import { addSensorsToInventory } from './src/utils/initializeSensorInventory.js';

// Add sensors 1001-1500
addSensorsToInventory([1001, 1002, 1003, ...1500])
  .then(results => console.log(results));
```

### Unlink a Sensor (Manual)

1. Go to SensorCollection in Firestore
2. Find the sensor document
3. Update fields:
   ```javascript
   {
     linked: false,
     linkedTo: null,
     linkedAt: null,
     sensorCode: null,
     status: "available",
     plantName: null,
     linkedBy: null
   }
   ```

### Mark Sensor for Maintenance

Update `status` field to `"maintenance"` in SensorCollection.

## 📈 Sensor Code Format

Generated codes are **6-digit numbers**:
```
123456
456789
789012
234567
```

### Format:
- **6 random digits** (100000 - 999999)
- Easy for users to enter in mobile app
- Unique for each distribution
- No special characters or letters

## 🎯 Best Practices

1. **Never delete** from SensorCollection - update status instead
2. **Always distribute codes** through the admin interface (automatic tracking)
3. **Provide clear instructions** to users on how to use the 6-digit code
4. **Check inventory** regularly to ensure sufficient available sensors
5. **Document** any manual changes to the database
6. **Backup** SensorCollection before bulk operations
7. **Track distributed but not activated** sensors (status: "distributed")

## 🚨 Troubleshooting

### Sensor Not Showing in Dropdown
- **Check**: Is it already linked? (`linked: true`)
- **Check**: Does it exist in SensorCollection?
- **Solution**: Query SensorCollection for that sensor number

### Duplicate Sensor Codes
- **Unlikely**: Timestamp ensures uniqueness
- **If happens**: Manually update sensorCode field

### Lost Sensor Tracking
- **Recovery**: Check SensorCollection for `linkedAt` timestamp
- **Prevention**: Always use the admin interface

## 📝 Database Queries

### Find Available Sensors
```javascript
// Firestore
const available = await getDocs(
  query(collection(db, 'SensorCollection'), where('linked', '==', false))
);
```

### Find Sensors by User
```javascript
// Firestore
const userSensors = await getDocs(
  query(collection(db, 'SensorCollection'), where('linkedTo', '==', 'user123'))
);
```

### Count by Status
```javascript
// Firestore
const deployed = await getDocs(
  query(collection(db, 'SensorCollection'), where('status', '==', 'deployed'))
);
```

## 🔐 Firestore Security Rules

Add these rules to protect SensorCollection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // SensorCollection - Admin only
    match /SensorCollection/{sensorNumber} {
      allow read: if request.auth != null && 
                     request.auth.token.role in ['admin', 'superadmin'];
      allow write: if request.auth != null && 
                      request.auth.token.role in ['admin', 'superadmin'];
    }
    
    // Prevent accidental deletion
    match /SensorCollection/{sensorNumber} {
      allow delete: if false;  // Never allow deletion
    }
  }
}
```

## 📞 Support

For issues or questions about the sensor inventory system:
1. Check this documentation
2. Review Firebase console for data integrity
3. Check browser console for error logs
4. Contact system administrator

---

**Version:** 1.0.0  
**Last Updated:** October 2024  
**Author:** Cropify Development Team

