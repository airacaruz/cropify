/**
 * Utility to search for a specific plant in Firestore database
 * Usage: Run this in browser console or create a temporary admin page
 */

import { get, ref } from 'firebase/database';
import { collection, getDocs } from 'firebase/firestore';
import { db, realtimeDb } from '../firebase';

/**
 * Search for a plant by name across all collections
 * @param {string} plantName - The plant name to search for (e.g., "letty lettuce")
 */
export const searchPlantByName = async (plantName) => {
  console.log(`🔍 Searching for plant: "${plantName}"...`);
  const results = {
    SensorKits: [],
    SensorCollection: [],
    Growers: [],
    Plants: [],
    RealtimeDB_Plants: [],
    RealtimeDB_Sensors: []
  };
  
  const searchTerm = plantName.toLowerCase();
  
  try {
    // 1. Search in SensorKits collection
    console.log('Searching SensorKits collection...');
    const sensorKitsRef = collection(db, 'SensorKits');
    const sensorKitsSnapshot = await getDocs(sensorKitsRef);
    
    sensorKitsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.plantName && data.plantName.toLowerCase().includes(searchTerm)) {
        results.SensorKits.push({
          id: doc.id,
          ...data,
          collection: 'SensorKits'
        });
      }
    });
    console.log(`✅ SensorKits: Found ${results.SensorKits.length} matches`);
    
    // 2. Search in SensorCollection
    console.log('Searching SensorCollection...');
    const sensorCollectionRef = collection(db, 'SensorCollection');
    const sensorCollectionSnapshot = await getDocs(sensorCollectionRef);
    
    sensorCollectionSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.plantName && data.plantName.toLowerCase().includes(searchTerm)) {
        results.SensorCollection.push({
          id: doc.id,
          ...data,
          collection: 'SensorCollection'
        });
      }
    });
    console.log(`✅ SensorCollection: Found ${results.SensorCollection.length} matches`);
    
    // 3. Search in Growers collection (if exists)
    try {
      console.log('Searching Growers collection...');
      const growersRef = collection(db, 'Growers');
      const growersSnapshot = await getDocs(growersRef);
      
      growersSnapshot.forEach((doc) => {
        const data = doc.data();
        // Check if grower has plants array or plant field
        if (data.plants && Array.isArray(data.plants)) {
          data.plants.forEach((plant, index) => {
            if (plant.name && plant.name.toLowerCase().includes(searchTerm)) {
              results.Growers.push({
                growerId: doc.id,
                plantIndex: index,
                ...plant,
                growerData: data,
                collection: 'Growers'
              });
            }
          });
        } else if (data.plantName && data.plantName.toLowerCase().includes(searchTerm)) {
          results.Growers.push({
            id: doc.id,
            ...data,
            collection: 'Growers'
          });
        }
      });
      console.log(`✅ Growers: Found ${results.Growers.length} matches`);
    } catch (growersError) {
      console.log('⚠️ Growers collection not found or error:', growersError.message);
    }
    
    // 4. Search in Plants collection (if exists)
    try {
      console.log('Searching Plants collection...');
      const plantsRef = collection(db, 'Plants');
      const plantsSnapshot = await getDocs(plantsRef);
      
      plantsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.plantName && data.plantName.toLowerCase().includes(searchTerm)) {
          results.Plants.push({
            id: doc.id,
            ...data,
            collection: 'Plants'
          });
        } else if (data.name && data.name.toLowerCase().includes(searchTerm)) {
          results.Plants.push({
            id: doc.id,
            ...data,
            collection: 'Plants'
          });
        }
      });
      console.log(`✅ Plants: Found ${results.Plants.length} matches`);
    } catch (plantsError) {
      console.log('⚠️ Plants collection not found or error:', plantsError.message);
    }
    
    // 5. Search in Realtime Database - Plants path (MOBILE APP DATA!)
    try {
      console.log('🔥 Searching Firebase Realtime Database - Plants...');
      const plantsRealtimeRef = ref(realtimeDb, 'Plants');
      const plantsRealtimeSnapshot = await get(plantsRealtimeRef);
      
      if (plantsRealtimeSnapshot.exists()) {
        const plantsData = plantsRealtimeSnapshot.val();
        Object.keys(plantsData).forEach((plantId) => {
          const data = plantsData[plantId];
          if (data.plantName && data.plantName.toLowerCase().includes(searchTerm)) {
            results.RealtimeDB_Plants.push({
              id: plantId,
              ...data,
              database: 'RealtimeDB',
              path: `Plants/${plantId}`
            });
          }
        });
      }
      console.log(`✅ Realtime DB Plants: Found ${results.RealtimeDB_Plants.length} matches`);
    } catch (realtimeError) {
      console.log('⚠️ Realtime DB Plants path not found or error:', realtimeError.message);
    }
    
    // 6. Search in Realtime Database - Sensors path (may contain plant info)
    try {
      console.log('🔥 Searching Firebase Realtime Database - Sensors...');
      const sensorsRealtimeRef = ref(realtimeDb, 'Sensors');
      const sensorsRealtimeSnapshot = await get(sensorsRealtimeRef);
      
      if (sensorsRealtimeSnapshot.exists()) {
        const sensorsData = sensorsRealtimeSnapshot.val();
        Object.keys(sensorsData).forEach((sensorId) => {
          const data = sensorsData[sensorId];
          if (data.plantName && data.plantName.toLowerCase().includes(searchTerm)) {
            results.RealtimeDB_Sensors.push({
              id: sensorId,
              ...data,
              database: 'RealtimeDB',
              path: `Sensors/${sensorId}`
            });
          }
        });
      }
      console.log(`✅ Realtime DB Sensors: Found ${results.RealtimeDB_Sensors.length} matches`);
    } catch (realtimeError) {
      console.log('⚠️ Realtime DB Sensors path not found or error:', realtimeError.message);
    }
    
    // Summary
    const totalResults = 
      results.SensorKits.length + 
      results.SensorCollection.length + 
      results.Growers.length + 
      results.Plants.length +
      results.RealtimeDB_Plants.length +
      results.RealtimeDB_Sensors.length;
    
    console.log('\n📊 SEARCH RESULTS SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Plant Name: "${plantName}"`);
    console.log(`Total Results: ${totalResults}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`SensorKits (Firestore): ${results.SensorKits.length} matches`);
    console.log(`SensorCollection (Firestore): ${results.SensorCollection.length} matches`);
    console.log(`Growers (Firestore): ${results.Growers.length} matches`);
    console.log(`Plants (Firestore): ${results.Plants.length} matches`);
    console.log(`🔥 Plants (Realtime DB - Mobile App): ${results.RealtimeDB_Plants.length} matches`);
    console.log(`🔥 Sensors (Realtime DB): ${results.RealtimeDB_Sensors.length} matches`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Display detailed results
    if (totalResults > 0) {
      console.log('📝 DETAILED RESULTS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      if (results.SensorKits.length > 0) {
        console.log('🔧 SensorKits Collection:');
        results.SensorKits.forEach((item, index) => {
          console.log(`  ${index + 1}. ID: ${item.id}`);
          console.log(`     Plant Name: ${item.plantName}`);
          console.log(`     Sensor Code: ${item.sensorCode || 'N/A'}`);
          console.log(`     User ID: ${item.userId || 'N/A'}`);
          console.log(`     Linked: ${item.linked ? 'Yes' : 'No'}`);
          console.log('');
        });
      }
      
      if (results.SensorCollection.length > 0) {
        console.log('📦 SensorCollection:');
        results.SensorCollection.forEach((item, index) => {
          console.log(`  ${index + 1}. ID: ${item.id}`);
          console.log(`     Plant Name: ${item.plantName}`);
          console.log(`     Sensor Code: ${item.sensorCode || 'N/A'}`);
          console.log(`     Status: ${item.status || 'N/A'}`);
          console.log('');
        });
      }
      
      if (results.Growers.length > 0) {
        console.log('👨‍🌾 Growers Collection:');
        results.Growers.forEach((item, index) => {
          console.log(`  ${index + 1}. Grower ID: ${item.growerId || item.id}`);
          console.log(`     Plant Name: ${item.name || item.plantName}`);
          console.log(`     Plant Type: ${item.type || item.plantType || 'N/A'}`);
          console.log(`     Sensor Code: ${item.sensorCode || 'N/A'}`);
          console.log('');
        });
      }
      
      if (results.Plants.length > 0) {
        console.log('🌱 Plants Collection (Firestore):');
        results.Plants.forEach((item, index) => {
          console.log(`  ${index + 1}. ID: ${item.id}`);
          console.log(`     Plant Name: ${item.plantName || item.name}`);
          console.log(`     Plant Type: ${item.plantType || 'N/A'}`);
          console.log(`     Sensor Code: ${item.sensorCode || 'N/A'}`);
          console.log('');
        });
      }
      
      if (results.RealtimeDB_Plants.length > 0) {
        console.log('🔥📱 Plants (Realtime Database - MOBILE APP DATA):');
        results.RealtimeDB_Plants.forEach((item, index) => {
          console.log(`  ${index + 1}. Plant ID: ${item.id}`);
          console.log(`     Path: ${item.path}`);
          console.log(`     Plant Name: ${item.plantName}`);
          console.log(`     Plant Type: ${item.plantType || 'N/A'}`);
          console.log(`     Sensor Code: ${item.sensorCode || item.code || 'N/A'}`);
          console.log(`     User ID: ${item.userId || 'N/A'}`);
          console.log(`     Created At: ${item.createdAt || 'N/A'}`);
          console.log('');
        });
      }
      
      if (results.RealtimeDB_Sensors.length > 0) {
        console.log('🔥🔧 Sensors (Realtime Database - with Plant Info):');
        results.RealtimeDB_Sensors.forEach((item, index) => {
          console.log(`  ${index + 1}. Sensor ID: ${item.id}`);
          console.log(`     Path: ${item.path}`);
          console.log(`     Plant Name: ${item.plantName}`);
          console.log(`     Sensor Code: ${item.code || 'N/A'}`);
          console.log(`     Linked: ${item.linked ? 'Yes' : 'No'}`);
          console.log(`     Temperature: ${item.temperature || 'N/A'}`);
          console.log(`     Humidity: ${item.humidity || 'N/A'}`);
          console.log(`     pH: ${item.ph || 'N/A'}`);
          console.log(`     TDS: ${item.tds || 'N/A'}`);
          console.log('');
        });
      }
    } else {
      console.log(`❌ No plants found matching "${plantName}"`);
      console.log('\n💡 Suggestions:');
      console.log('  - Check spelling');
      console.log('  - Try partial name (e.g., "lettuce" instead of "letty lettuce")');
      console.log('  - Check if plant exists in database');
    }
    
    return results;
    
  } catch (error) {
    console.error('💥 Error searching for plant:', error);
    console.error('Error details:', error.message);
    throw error;
  }
};

/**
 * Search for all plants containing a keyword
 * @param {string} keyword - Keyword to search for (e.g., "lettuce", "letty")
 */
export const searchByKeyword = async (keyword) => {
  console.log(`🔍 Searching for keyword: "${keyword}"...`);
  return await searchPlantByName(keyword);
};

/**
 * Get all plants from a specific collection
 * @param {string} collectionName - Name of the collection (e.g., "Growers", "SensorKits")
 */
export const getAllPlantsFromCollection = async (collectionName) => {
  console.log(`📂 Fetching all plants from ${collectionName}...`);
  
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    const plants = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      plants.push({
        id: doc.id,
        ...data
      });
    });
    
    console.log(`✅ Found ${plants.length} documents in ${collectionName}`);
    console.table(plants);
    
    return plants;
    
  } catch (error) {
    console.error(`💥 Error fetching from ${collectionName}:`, error);
    throw error;
  }
};

// Export for use in React components
export default {
  searchPlantByName,
  searchByKeyword,
  getAllPlantsFromCollection
};

