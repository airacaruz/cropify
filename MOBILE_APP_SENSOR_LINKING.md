# 📱 Mobile App - Sensor Kit Linking Guide

## Overview

This document explains how users link sensor kits in the Cropify mobile application using the 6-digit code provided by admins.

---

## 🎯 User Input Requirements

The user only needs to provide **3 pieces of information**:

1. **Plant Name** (Text field)
   - Example: "My Tomato Garden", "Backyard Lettuce", "Greenhouse Cucumbers"
   - Required field
   - User-friendly name for their plant

2. **Plant Type** (Dropdown/Select)
   - Example: "Tomato", "Lettuce", "Cucumber", "Pepper", "Spinach"
   - Required field
   - Helps categorize and provide plant-specific insights

3. **Sensor Code** (6-digit number input)
   - Example: "456789", "123456", "789012"
   - Required field
   - Provided by admin/distributor

---

## 📱 Mobile App UI/UX

### Form Example:

```
┌─────────────────────────────────────┐
│  🌱 Link Sensor Kit                 │
├─────────────────────────────────────┤
│                                     │
│  Plant Name *                       │
│  ┌───────────────────────────────┐ │
│  │ My Tomato Garden              │ │
│  └───────────────────────────────┘ │
│                                     │
│  Plant Type *                       │
│  ┌───────────────────────────────┐ │
│  │ Tomato               ▼        │ │
│  └───────────────────────────────┘ │
│                                     │
│  Sensor Code *                      │
│  ┌───────────────────────────────┐ │
│  │ 4 5 6 7 8 9                   │ │
│  └───────────────────────────────┘ │
│  💡 Enter the 6-digit code from    │
│     your sensor kit package        │
│                                     │
│  ┌───────────────────────────────┐ │
│  │     Connect Sensor Kit        │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## ⚙️ Backend Process (When User Clicks "Connect")

### Step 1: Validate Sensor Code

```javascript
async function validateSensorCode(sensorCode) {
  // Query SensorCollection by sensorCode
  const sensorsQuery = query(
    collection(db, 'SensorCollection'),
    where('sensorCode', '==', sensorCode)
  );
  
  const snapshot = await getDocs(sensorsQuery);
  
  if (snapshot.empty) {
    throw new Error('Invalid sensor code. Please check and try again.');
  }
  
  const sensorDoc = snapshot.docs[0];
  const sensorData = sensorDoc.data();
  const sensorNumber = sensorDoc.id;
  
  // Check if already linked
  if (sensorData.linked === true) {
    throw new Error('This sensor is already connected to another plant.');
  }
  
  // Check if distributed
  if (sensorData.status !== 'distributed') {
    throw new Error('This sensor code is not ready for activation. Please contact support.');
  }
  
  return { sensorNumber, sensorData };
}
```

### Step 2: Link Sensor to User's Plant

```javascript
async function linkSensorToPlant(plantName, plantType, sensorCode, userId) {
  try {
    // 1. Validate the sensor code
    const { sensorNumber, sensorData } = await validateSensorCode(sensorCode);
    
    // 2. Update SensorCollection (mark as deployed)
    await updateDoc(doc(db, 'SensorCollection', sensorNumber), {
      linked: true,
      linkedTo: userId,
      linkedAt: new Date().toISOString(),
      plantName: plantName,
      plantType: plantType,
      status: 'deployed'
    });
    
    // 3. Create/Update SensorKits entry
    await setDoc(doc(db, 'SensorKits', sensorNumber), {
      sensorCode: sensorCode,
      sensorNumber: sensorNumber,
      plantName: plantName,
      plantType: plantType,
      userId: userId,
      linked: true,
      linkedPlantId: null, // Will be updated when plant is created
      lastLinkTimestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    
    // 4. Create Plants entry in Realtime Database
    const plantsRef = ref(realtimeDb, 'Plants');
    const newPlantRef = push(plantsRef);
    
    await set(newPlantRef, {
      plantId: newPlantRef.key,
      sensorNumber: sensorNumber,
      sensorCode: sensorCode,
      plantName: plantName,
      plantType: plantType,
      userId: userId,
      linked: true,
      linkedPlantId: newPlantRef.key,
      lastLinkTimestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    
    // 5. Update SensorKits with plant ID
    await updateDoc(doc(db, 'SensorKits', sensorNumber), {
      linkedPlantId: newPlantRef.key
    });
    
    return {
      success: true,
      plantId: newPlantRef.key,
      sensorNumber: sensorNumber,
      message: 'Sensor kit connected successfully!'
    };
    
  } catch (error) {
    console.error('Error linking sensor:', error);
    throw error;
  }
}
```

### Step 3: Initialize Sensor Data Stream (Optional)

```javascript
async function initializeSensorDataStream(plantId, sensorCode) {
  const sensorDataRef = ref(realtimeDb, `SensorData/${plantId}`);
  
  await set(sensorDataRef, {
    plantId: plantId,
    sensorCode: sensorCode,
    currentReadings: {
      ph: null,
      ec: null,
      temperature: null,
      humidity: null,
      lastUpdated: null
    },
    status: 'waiting_for_data'
  });
}
```

---

## ✅ Success Response

After successful linking, show user:

```
┌─────────────────────────────────────┐
│  ✅ Sensor Kit Connected!           │
├─────────────────────────────────────┤
│                                     │
│  🌱 Plant: My Tomato Garden         │
│  🌿 Type: Tomato                    │
│  📡 Sensor Code: 456789             │
│  🔢 Sensor Number: 0002             │
│                                     │
│  Your sensor is now monitoring      │
│  your plant's health!               │
│                                     │
│  ┌───────────────────────────────┐ │
│  │     View Dashboard            │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## ❌ Error Handling

### Common Errors:

| Error Code | User Message | Reason |
|------------|-------------|---------|
| `INVALID_CODE` | "Invalid sensor code. Please check and try again." | Code doesn't exist in database |
| `ALREADY_LINKED` | "This sensor is already connected to a plant." | Sensor is already in use |
| `NOT_DISTRIBUTED` | "This sensor code hasn't been activated. Please contact your distributor." | Status is not "distributed" |
| `NETWORK_ERROR` | "Connection error. Please check your internet and try again." | Firebase connection issue |
| `MISSING_FIELD` | "Please fill in all required fields." | User left a field empty |

### Error Display Example:

```
┌─────────────────────────────────────┐
│  ❌ Connection Failed               │
├─────────────────────────────────────┤
│                                     │
│  This sensor is already connected   │
│  to a plant.                        │
│                                     │
│  If you believe this is an error,   │
│  please contact support.            │
│                                     │
│  ┌───────────────────────────────┐ │
│  │     Try Again                 │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 📊 Database Updates After Linking

### SensorCollection (Firestore)
```javascript
// Before (after admin distribution):
{
  sensorNumber: "0002",
  sensorCode: "456789",
  status: "distributed",
  linked: false,
  linkedTo: null,
  plantName: null,
  plantType: null
}

// After (user links):
{
  sensorNumber: "0002",
  sensorCode: "456789",
  status: "deployed",           // ✅ Changed
  linked: true,                 // ✅ Changed
  linkedTo: "user_uid_abc123",  // ✅ Added
  linkedAt: "2024-10-09T...",   // ✅ Added
  plantName: "My Tomato Garden", // ✅ Added
  plantType: "Tomato"           // ✅ Added
}
```

### SensorKits (Firestore)
```javascript
// Created when user links:
{
  sensorCode: "456789",
  sensorNumber: "0002",
  plantName: "My Tomato Garden",
  plantType: "Tomato",
  userId: "user_uid_abc123",
  linked: true,
  linkedPlantId: "plant_xyz123",
  lastLinkTimestamp: "2024-10-09T...",
  createdAt: "2024-10-09T..."
}
```

### Plants (Realtime Database)
```javascript
// Created when user links:
{
  "plant_xyz123": {
    plantId: "plant_xyz123",
    sensorNumber: "0002",
    sensorCode: "456789",
    plantName: "My Tomato Garden",
    plantType: "Tomato",
    userId: "user_uid_abc123",
    linked: true,
    linkedPlantId: "plant_xyz123",
    lastLinkTimestamp: "2024-10-09T...",
    createdAt: "2024-10-09T...",
    status: "active"
  }
}
```

---

## 🎨 Plant Type Options

Suggested plant types for the dropdown:

```javascript
const plantTypes = [
  'Tomato',
  'Lettuce',
  'Cucumber',
  'Pepper',
  'Spinach',
  'Cabbage',
  'Carrot',
  'Potato',
  'Onion',
  'Eggplant',
  'Strawberry',
  'Herbs (Basil, Mint, etc.)',
  'Other'
];
```

---

## 🔐 Security Considerations

1. **User Authentication Required**
   - User must be logged in to link sensor
   - Use Firebase Auth to get `userId`

2. **Rate Limiting**
   - Limit attempts to prevent brute force code guessing
   - Max 5 failed attempts per 5 minutes

3. **Code Uniqueness**
   - Ensure sensor code is unique across all sensors
   - Validate code hasn't been tampered with

4. **User Ownership**
   - User can only view/manage their own plants
   - Admin can see all deployed sensors

---

## 🧪 Testing Checklist

- [ ] Valid code links successfully
- [ ] Invalid code shows error
- [ ] Already linked code shows error
- [ ] Empty fields show validation error
- [ ] Network error handled gracefully
- [ ] Success message displays correctly
- [ ] Plant appears in user's dashboard
- [ ] Admin sees sensor as "deployed"
- [ ] Sensor readings start appearing
- [ ] User can view plant details

---

## 📞 Support

For implementation questions or issues:
- Check Firebase Console for data integrity
- Verify user authentication is working
- Review browser/app console for errors
- Contact backend team for API issues

---

**Last Updated:** October 2024  
**Version:** 1.0.0

