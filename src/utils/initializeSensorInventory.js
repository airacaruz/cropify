import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Initialize SensorCollection with sensor inventory (0002 - 1000+)
 * This creates a vault/inventory of available sensors that can be assigned to users
 * 
 * Run this ONCE to populate the database with sensor inventory
 */
export const initializeSensorInventory = async (startNumber = 2, endNumber = 1000) => {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  console.log(`🚀 Starting sensor inventory initialization...`);
  console.log(`📊 Creating sensors from ${String(startNumber).padStart(4, '0')} to ${String(endNumber).padStart(4, '0')}`);

  try {
    // Create sensors in batches to avoid overwhelming the database
    const batchSize = 50;
    const totalSensors = endNumber - startNumber + 1;
    const batches = Math.ceil(totalSensors / batchSize);

    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const batchStart = startNumber + (batchIndex * batchSize);
      const batchEnd = Math.min(batchStart + batchSize - 1, endNumber);

      console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches} (Sensors ${String(batchStart).padStart(4, '0')} - ${String(batchEnd).padStart(4, '0')})`);

      const promises = [];

      for (let i = batchStart; i <= batchEnd; i++) {
        const sensorNumber = String(i).padStart(4, '0');
        
        const sensorData = {
          sensorNumber: sensorNumber,
          sensorCode: null,              // Will be generated when linked
          status: 'available',           // available | deployed | maintenance | retired
          linked: false,                 // Not linked to any user yet
          linkedTo: null,                // User ID when linked
          linkedAt: null,                // Timestamp when linked
          plantName: null,               // Plant name when linked
          linkedBy: null,                // Admin who linked it
          
          // Inventory metadata
          createdAt: new Date().toISOString(),
          createdBy: 'System',
          condition: 'new',              // new | good | fair | needs_repair
          
          // Hardware specs (optional - can be updated later)
          model: 'Cropify Sensor v1',
          capabilities: {
            ph: true,
            ec: true,
            temperature: true,
            humidity: true
          }
        };

        const sensorDocRef = doc(db, 'SensorCollection', sensorNumber);
        promises.push(
          setDoc(sensorDocRef, sensorData)
            .then(() => {
              results.success++;
              if (results.success % 50 === 0) {
                console.log(`   ✅ ${results.success} sensors created...`);
              }
            })
            .catch((error) => {
              results.failed++;
              results.errors.push({ sensorNumber, error: error.message });
              console.error(`   ❌ Failed to create sensor ${sensorNumber}:`, error.message);
            })
        );
      }

      // Wait for all promises in this batch to complete
      await Promise.all(promises);
      
      // Small delay between batches to avoid rate limiting
      if (batchIndex < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ SENSOR INVENTORY INITIALIZATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   ✅ Success: ${results.success} sensors`);
    console.log(`   ❌ Failed: ${results.failed} sensors`);
    console.log(`   📦 Total: ${totalSensors} sensors`);
    
    if (results.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      results.errors.forEach(err => {
        console.log(`   - Sensor ${err.sensorNumber}: ${err.error}`);
      });
    }

    return results;

  } catch (error) {
    console.error('💥 CRITICAL ERROR during initialization:', error);
    throw error;
  }
};

/**
 * Check sensor inventory status
 */
export const checkSensorInventory = async (db) => {
  try {
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    
    const sensorCollectionRef = collection(db, 'SensorCollection');
    const snapshot = await getDocs(sensorCollectionRef);
    
    let available = 0;
    let linked = 0;
    let deployed = 0;
    let maintenance = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.linked) available++;
      if (data.linked) linked++;
      if (data.status === 'deployed') deployed++;
      if (data.status === 'maintenance') maintenance++;
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SENSOR INVENTORY STATUS');
    console.log('='.repeat(60));
    console.log(`Total Sensors: ${snapshot.size}`);
    console.log(`🟢 Available: ${available}`);
    console.log(`🔵 Linked: ${linked}`);
    console.log(`📦 Deployed: ${deployed}`);
    console.log(`🔧 Maintenance: ${maintenance}`);
    console.log('='.repeat(60));
    
    return {
      total: snapshot.size,
      available,
      linked,
      deployed,
      maintenance
    };
  } catch (error) {
    console.error('Error checking inventory:', error);
    throw error;
  }
};

/**
 * Add individual sensors to inventory
 */
export const addSensorsToInventory = async (sensorNumbers) => {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const num of sensorNumbers) {
    const sensorNumber = String(num).padStart(4, '0');
    
    try {
      const sensorData = {
        sensorNumber: sensorNumber,
        sensorCode: null,
        status: 'available',
        linked: false,
        linkedTo: null,
        linkedAt: null,
        plantName: null,
        linkedBy: null,
        createdAt: new Date().toISOString(),
        createdBy: 'Admin',
        condition: 'new',
        model: 'Cropify Sensor v1',
        capabilities: {
          ph: true,
          ec: true,
          temperature: true,
          humidity: true
        }
      };

      const sensorDocRef = doc(db, 'SensorCollection', sensorNumber);
      await setDoc(sensorDocRef, sensorData);
      
      results.success++;
      console.log(`✅ Added sensor ${sensorNumber}`);
    } catch (error) {
      results.failed++;
      results.errors.push({ sensorNumber, error: error.message });
      console.error(`❌ Failed to add sensor ${sensorNumber}:`, error.message);
    }
  }

  return results;
};

