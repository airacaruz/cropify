import { onAuthStateChanged } from 'firebase/auth';
import { get, ref, set, update } from 'firebase/database';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { FaBolt, FaCheckCircle, FaClock, FaCloudRain, FaEye, FaFlask, FaList, FaMicrochip, FaPlus, FaRedo, FaTemperatureHigh, FaTimes, FaTint, FaUser } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import { auth, db, realtimeDb } from '../../../firebase';
import '../../../styles/Dashboard/UserRecords.css';
import { hashUID } from '../../../utils/hashUtils';

// CSS will be handled through inline styles and existing CSS classes


const SensorLogsPage = () => {
  const [activeTab, setActiveTab] = useState('kits');
  const [showModal, setShowModal] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  
  // Add Sensor Kit Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableSensorKits, setAvailableSensorKits] = useState([]);
  const [selectedSensorKit, setSelectedSensorKit] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [fetchingKits, setFetchingKits] = useState(false);
  
  // Parameters Logs States (Temporarily Hidden)
  // eslint-disable-next-line no-unused-vars
  const [parametersLogs, setParametersLogs] = useState([]);
  const [loadingParameters, setLoadingParameters] = useState(false);

  // Role and user info
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState("");
  const navigate = useNavigate();

  // Real-time sensor data (used in other tabs)
  // eslint-disable-next-line no-unused-vars
  const [sensorKits, setSensorKits] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [sensorSessions, setSensorSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Grouped sensor data (multiple plants per sensor)
  const [groupedSensorKits, setGroupedSensorKits] = useState({});
  const [groupedSensorSessions, setGroupedSensorSessions] = useState({});

  // Fetch Parameters Logs (manually inputted plant parameters from databases)
  const fetchParametersLogs = useCallback(async () => {
    try {
      setLoadingParameters(true);
      const logs = [];
      
      console.log('═══════════════════════════════════════════════════');
      console.log('🔍 FETCHING PARAMETERS LOGS FROM DATABASES');
      console.log('═══════════════════════════════════════════════════');
      console.log('🔧 Project ID:', db.app.options.projectId);
      console.log('🔧 Firestore DB:', db);
      console.log('🔧 Realtime DB:', realtimeDb);
      
      // STRATEGY: Check BOTH Firestore AND Realtime Database
      
      // ============================================================
      // METHOD 1: Try Realtime Database /Growers path
      // ============================================================
      console.log('\n📡 METHOD 1: Checking Realtime Database...');
      console.log('🔍 Path: /Growers');
      
      try {
        const realtimeGrowersRef = ref(realtimeDb, 'Growers');
        const realtimeGrowersSnapshot = await get(realtimeGrowersRef);
        
        if (realtimeGrowersSnapshot.exists()) {
          const growersData = realtimeGrowersSnapshot.val();
          console.log('✅ REALTIME DATABASE HAS GROWERS!');
          console.log('👥 Growers found:', Object.keys(growersData).length);
          
          // Process each grower from Realtime DB
          Object.keys(growersData).forEach((growerId) => {
            const growerData = growersData[growerId];
            console.log(`\n👤 Processing Realtime DB grower: ${growerId}`);
            
            // Check if grower has plants
            if (growerData.plants) {
              console.log(`🌱 Plants found: ${Object.keys(growerData.plants).length}`);
              
              Object.keys(growerData.plants).forEach((plantId) => {
                const plantData = growerData.plants[plantId];
                
                console.log(`   🌿 Plant: ${plantId}`);
                console.log(`      Name: ${plantData.name || 'N/A'}`);
                console.log(`      Source: ${plantData.source || 'N/A'}`);
                
                // Only include manual plants
                if (plantData.source === 'manual') {
                  console.log(`   ✅ MANUAL PLANT FOUND!`);
                  
                  logs.push({
                    id: plantId,
                    plantName: plantData.name || 'N/A',
                    plantType: plantData.type || 'N/A',
                    ph: plantData.ph || null,
                    tds: plantData.tds || null,
                    ec: plantData.tds || null,
                    temperature: plantData.temperature || null,
                    humidity: plantData.humidity || null,
                    waterTemp: plantData.waterTemp || null,
                    plantId: plantData.plantId || null,
                    notes: plantData.notes || null,
                    location: plantData.location || null,
                    userId: growerId,
                    userName: growerData.name || growerData.email || growerId.substring(0, 8) + '...',
                    userEmail: growerData.email || 'N/A',
                    timestamp: plantData.timestamp || new Date().toISOString(),
                    lastManualUpdate: plantData.timestamp || new Date().toISOString(),
                    createdAt: plantData.createdAt || null,
                    source: 'Manual Input (Realtime DB)',
                    status: plantData.status || 'active',
                    updatedBy: growerData.name || 'User',
                    fullData: plantData
                  });
                }
              });
            } else {
              console.log(`   ⚠️ No plants field for grower ${growerId}`);
            }
          });
          
          console.log(`✅ Realtime DB Method: ${logs.length} manual plants found`);
        } else {
          console.log('❌ No /Growers path in Realtime Database');
        }
      } catch (realtimeError) {
        console.error('❌ Realtime Database fetch error:', realtimeError);
      }
      
      // ============================================================
      // METHOD 2: Try Firestore Growers collection with subcollection
      // ============================================================
      console.log('\n📊 METHOD 2: Checking Firestore Growers collection...');
      
      try {
        const firestoreGrowersRef = collection(db, 'Growers');
        const firestoreGrowersSnapshot = await getDocs(firestoreGrowersRef);
        
        console.log(`👥 Firestore Growers found: ${firestoreGrowersSnapshot.size}`);
        
        if (!firestoreGrowersSnapshot.empty) {
          console.log('✅ FIRESTORE HAS GROWERS!');
          
          for (const growerDoc of firestoreGrowersSnapshot.docs) {
            const growerId = growerDoc.id;
            const growerData = growerDoc.data();
            
            console.log(`\n👤 Processing Firestore grower: ${growerId}`);
            
            // Fetch plants subcollection
            try {
              const plantsRef = collection(db, 'Growers', growerId, 'plants');
              const plantsSnapshot = await getDocs(plantsRef);
              
              console.log(`🌱 Plants subcollection: ${plantsSnapshot.size}`);
              
              plantsSnapshot.forEach((plantDoc) => {
                const plantData = plantDoc.data();
                const plantId = plantDoc.id;
                
                console.log(`   🌿 Plant: ${plantId}`);
                console.log(`      Name: ${plantData.name || 'N/A'}`);
                console.log(`      Source: ${plantData.source || 'N/A'}`);
                
                // Only include manual plants
                if (plantData.source === 'manual') {
                  console.log(`   ✅ MANUAL PLANT FOUND!`);
                  
                  logs.push({
                    id: plantId,
                    plantName: plantData.name || 'N/A',
                    plantType: plantData.type || 'N/A',
                    ph: plantData.ph || null,
                    tds: plantData.tds || null,
                    ec: plantData.tds || null,
                    temperature: plantData.temperature || null,
                    humidity: plantData.humidity || null,
                    waterTemp: plantData.waterTemp || null,
                    plantId: plantData.plantId || null,
                    notes: plantData.notes || null,
                    location: plantData.location || null,
                    userId: growerId,
                    userName: growerData.name || growerData.email || growerId.substring(0, 8) + '...',
                    userEmail: growerData.email || 'N/A',
                    timestamp: plantData.timestamp || new Date().toISOString(),
                    lastManualUpdate: plantData.timestamp || new Date().toISOString(),
                    createdAt: plantData.createdAt || null,
                    source: 'Manual Input (Firestore)',
                    status: plantData.status || 'active',
                    updatedBy: growerData.name || 'User',
                    fullData: plantData
                  });
                }
              });
            } catch (plantsError) {
              console.error(`   ❌ Error fetching plants for ${growerId}:`, plantsError);
            }
          }
          
          console.log(`✅ Firestore Method: ${logs.length} total manual plants found`);
        } else {
          console.log('❌ Firestore Growers collection is empty');
        }
      } catch (firestoreError) {
        console.error('❌ Firestore fetch error:', firestoreError);
      }
      
      // ============================================================
      // FINAL SUMMARY
      // ============================================================
      console.log('\n═══════════════════════════════════════════════════');
      console.log('📊 FETCH COMPLETE - FINAL SUMMARY');
      console.log('═══════════════════════════════════════════════════');
      console.log(`✅ Total manual plants found: ${logs.length}`);
      console.log('═══════════════════════════════════════════════════');
      
      if (logs.length === 0) {
        console.error('\n❌ NO MANUAL PLANTS FOUND IN EITHER DATABASE!');
        console.error('💡 Possible reasons:');
        console.error('   1. No plants have source="manual"');
        console.error('   2. Growers/plants data is in a different location');
        console.error('   3. Data structure is different than expected');
        console.error('   4. Firestore/Realtime DB permissions blocking access');
      } else {
        console.log(`\n✅ SUCCESS! Found ${logs.length} manual plants`);
        console.log('📊 Plants:', logs.map(p => p.plantName).join(', '));
      }
      
      // Sort by last update (most recent first)
      logs.sort((a, b) => new Date(b.lastManualUpdate) - new Date(a.lastManualUpdate));
      
      setParametersLogs(logs);
      
    } catch (error) {
      console.error('💥 Error fetching parameters logs:', error);
      console.error('💥 Error details:', error.message, error.stack);
    } finally {
      setLoadingParameters(false);
    }
  }, []);

  // Fetch sensor data from both Firestore and Realtime Database
  const fetchSensorData = useCallback(async () => {
    try {
      console.log('🔍 Starting sensor data fetch...');
      console.log('🌍 Environment:', import.meta.env.MODE);
      console.log('👤 User UID:', uid);
      console.log('🔥 Firebase Config:', {
        projectId: realtimeDb.app.options.projectId,
        databaseURL: realtimeDb.app.options.databaseURL,
        authDomain: realtimeDb.app.options.authDomain
      });
      setLoading(true);
      const kits = [];
      const sessions = [];
      
      // Fetch from Firestore SensorCollection (inventory)
      try {
        console.log('Fetching from Firestore SensorCollection (inventory)...');
        const sensorCollectionRef = collection(db, 'SensorCollection');
        const sensorCollectionSnapshot = await getDocs(sensorCollectionRef);
        
        sensorCollectionSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Add all sensors from inventory
          const kit = {
            id: doc.id,
            code: data.sensorCode || '------',
            sensorCode: data.sensorCode || '------',
            linked: data.linked || false,
            linkedPlantId: data.linkedPlantId || null,
            plantName: data.plantName || (data.sensorCode ? 'Not linked yet' : 'N/A'),
            userId: data.linkedTo || 'N/A',
            lastLinkTimestamp: data.distributedAt || data.linkedAt || new Date().toISOString(),
            status: data.status || 'available',
            source: 'SensorCollection'
          };
          kits.push(kit);
        });
        
        console.log('SensorCollection kits fetched:', kits.length);
      } catch (collectionError) {
        console.log('No SensorCollection data found or error:', collectionError);
      }
      
      // Fetch from Firestore SensorKits collection
      try {
        console.log('Fetching from Firestore SensorKits collection...');
        const sensorKitsRef = collection(db, 'SensorKits');
        const sensorKitsSnapshot = await getDocs(sensorKitsRef);
        
        sensorKitsSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Filter out hardcoded entries only
          const isHardcodedEntry = (
            data.plantName === 'plantName' || 
            data.userId === 'userId' ||
            data.plantName === 'userId' ||
            data.userId === 'plantName'
          );
          
          // Only filter out hardcoded entries, show all sensors
          if (!isHardcodedEntry) {
            // Check if this sensor already exists from SensorCollection
            const existingKitIndex = kits.findIndex(k => 
              k.id === doc.id || 
              k.sensorCode === data.sensorCode
            );
            
            if (existingKitIndex !== -1) {
              // Update existing kit with SensorKits data (more detailed)
              kits[existingKitIndex] = {
                ...kits[existingKitIndex],
                code: data.sensorCode || kits[existingKitIndex].code,
                sensorCode: data.sensorCode || kits[existingKitIndex].sensorCode,
                linked: data.linked || kits[existingKitIndex].linked,
                linkedPlantId: data.linkedPlantId || kits[existingKitIndex].linkedPlantId,
                plantName: data.plantName || kits[existingKitIndex].plantName,
                userId: data.userId || kits[existingKitIndex].userId,
                lastLinkTimestamp: data.lastLinkTimestamp || kits[existingKitIndex].lastLinkTimestamp,
                source: 'SensorCollection + SensorKits'
              };
            } else {
              // Add new kit from SensorKits (if not in SensorCollection)
            const kit = {
              id: doc.id,
                code: data.sensorCode || '------',
                sensorCode: data.sensorCode || '------',
              linked: data.linked || false,
              linkedPlantId: data.linkedPlantId || null,
              plantName: data.plantName || 'N/A',
              userId: data.userId || 'system',
                lastLinkTimestamp: data.lastLinkTimestamp || new Date().toISOString(),
                source: 'SensorKits'
            };
            kits.push(kit);
            }
          }
        });
        
        console.log('Firestore sensor kits fetched:', kits.length, 'kits');
      } catch (firestoreError) {
        console.log('No Firestore sensor kits found or error:', firestoreError);
      }
      
      // Fetch from Realtime Database Sensors path with timeout
      try {
        console.log('📡 Fetching from Realtime Database...');
        console.log('🔗 Database URL:', realtimeDb.app.options.databaseURL);
        const sensorsRef = ref(realtimeDb, 'Sensors');
        console.log('📍 Sensors ref created:', sensorsRef.toString());
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Realtime Database fetch timeout')), 30000); // 30 second timeout
        });
        
        console.log('⏳ Starting database fetch with timeout...');
        console.log('🌐 Network status:', navigator.onLine ? 'Online' : 'Offline');
        console.log('🔄 Attempting Firebase Realtime Database connection...');
        
        const startTime = Date.now();
        const snapshot = await Promise.race([get(sensorsRef), timeoutPromise]);
        const endTime = Date.now();
        
        console.log('✅ Database fetch completed in', endTime - startTime, 'ms');
        console.log('✅ Snapshot exists:', snapshot.exists());
        
        if (snapshot.exists()) {
          const sensorsData = snapshot.val();
          console.log('Realtime Database data found:', Object.keys(sensorsData).length, 'sensors');
          console.log('Full sensors data:', sensorsData);
          
          // Process each sensor from Realtime Database
          Object.keys(sensorsData).forEach(sensorId => {
            const sensorData = sensorsData[sensorId];
            console.log(`Processing sensor ${sensorId}:`, sensorData);
            console.log(`Sensor ${sensorId} userId:`, sensorData.userId);
            console.log(`Sensor ${sensorId} plantName:`, sensorData.plantName);
            console.log(`Sensor ${sensorId} readings:`, {
              ph: sensorData.ph,
              tds: sensorData.tds,
              temperature: sensorData.temperature,
              humidity: sensorData.humidity
            });
            
            // Check if this sensor kit already exists in Firestore data by ID or by sensorCode/code match
            const existingKit = kits.find(kit => 
              kit.id === sensorId || 
              (kit.sensorCode && kit.sensorCode !== '' && kit.sensorCode !== '------' && (kit.sensorCode === sensorData.code || kit.code === sensorData.code || kit.sensorCode === sensorData.sensorCode))
            );
            
            if (existingKit) {
                // Update existing kit with real-time data, but preserve plantName and userId from Firestore
                existingKit.code = sensorData.code || sensorData.sensorCode || existingKit.code;
                existingKit.sensorCode = sensorData.sensorCode || sensorData.code || existingKit.sensorCode;
                existingKit.linked = sensorData.linked !== undefined ? sensorData.linked : existingKit.linked;
                existingKit.linkedPlantId = sensorData.linkedPlantId || existingKit.linkedPlantId;
                // Keep plantName and userId from Firestore (don't overwrite with undefined values)
                existingKit.plantName = sensorData.plantName || existingKit.plantName;
                existingKit.userId = sensorData.userId || existingKit.userId;
                existingKit.lastLinkTimestamp = new Date().toISOString();
                
                // Add real-time sensor readings to existing kit
                existingKit.currentReadings = {
                  ph: sensorData.ph,
                  tds: sensorData.tds,
                  temperature: sensorData.temperature,
                  humidity: sensorData.humidity,
                  timestamp: new Date().toISOString()
                };
            } else {
            // Only filter out hardcoded entries, show all sensors (even without readings)
            const isHardcodedEntry = (
              sensorData.plantName === 'plantName' || 
              sensorData.userId === 'userId' ||
              sensorData.plantName === 'userId' ||
              sensorData.userId === 'plantName'
            );
            
            // Show sensor if it has a code (has been distributed) OR has readings
            const hasCode = sensorData.code || sensorData.sensorCode;
            
            if (!isHardcodedEntry && hasCode) {
                const kit = {
                  id: sensorId,
                  code: sensorData.code || sensorData.sensorCode || 'N/A',
                  sensorCode: sensorData.sensorCode || sensorData.code || 'N/A',
                  linked: sensorData.linked !== undefined ? sensorData.linked : false,
                  linkedPlantId: sensorData.linkedPlantId || null,
                  plantName: sensorData.plantName || 'N/A',
                  userId: sensorData.userId || 'system',
                  lastLinkTimestamp: new Date().toISOString(),
                  currentReadings: {
                    ph: sensorData.ph || null,
                    tds: sensorData.tds || null,
                    temperature: sensorData.temperature || null,
                    humidity: sensorData.humidity || null,
                    timestamp: new Date().toISOString()
                  }
                };
                kits.push(kit);
              }
            }
            
            // Create sensor session entry if has code (distributed) or valid readings
            const hasUserId = sensorData.userId && sensorData.userId !== 'system';
            const hasReadings = sensorData.ph !== undefined || sensorData.temperature !== undefined || sensorData.humidity !== undefined || sensorData.tds !== undefined;
            const hasCode = sensorData.code || sensorData.sensorCode;
            
            console.log(`Sensor ${sensorId} - hasUserId: ${hasUserId}, hasReadings: ${hasReadings}, hasCode: ${hasCode}`);
            
            // Show sensors that have been distributed (have code) OR have readings
            if (hasCode || hasReadings) {
              // Use preserved data from existing kit if available, otherwise use sensorData
              const existingKit = kits.find(kit => 
                kit.id === sensorId || 
                kit.sensorCode === sensorData.code || 
                kit.code === sensorData.code ||
                kit.sensorCode === sensorData.sensorCode
              );
              const session = {
                skid: sensorId,
                code: sensorData.code || sensorData.sensorCode || 'N/A',
                uid: existingKit?.userId || sensorData.userId || 'system',
                sensorType: 'All',
                ph: sensorData.ph !== undefined ? sensorData.ph : null,
                tds: sensorData.tds !== undefined ? sensorData.tds : null,
                temperature: sensorData.temperature !== undefined ? sensorData.temperature : null,
                humidity: sensorData.humidity !== undefined ? sensorData.humidity : null,
                timestamp: new Date().toISOString(),
                plantName: existingKit?.plantName || sensorData.plantName || 'Waiting for connection',
                linked: sensorData.linked !== undefined ? sensorData.linked : false
              };
              sessions.push(session);
              console.log(`✅ Added session for sensor ${sensorId}:`, session);
              console.log(`✅ Session data:`, {
                skid: session.skid,
                ph: session.ph,
                temperature: session.temperature,
                humidity: session.humidity,
                uid: session.uid
              });
            } else {
              console.log(`❌ Skipping sensor ${sensorId} - no readings found`);
              console.log(`❌ Sensor data:`, sensorData);
            }
          });
          
          console.log('Realtime Database sensor data processed:', { kits: kits.length, sessions: sessions.length });
        } else {
          console.log('❌ No data found in Realtime Database');
        }
      } catch (realtimeError) {
        console.error('💥 Realtime Database error or timeout:', realtimeError);
        console.error('💥 Error details:', {
          name: realtimeError.name,
          message: realtimeError.message,
          code: realtimeError.code,
          stack: realtimeError.stack
        });
        // Continue with just Firestore data - this is normal if no realtime data exists
      }
      
      // Filter out sensors without generated codes (------) before displaying
      const kitsWithCodes = kits.filter(kit => kit.sensorCode && kit.sensorCode !== '------');
      const sessionsWithCodes = sessions.filter(session => session.code && session.code !== '------');
      
      // Sort kits by sensor ID/number
      kitsWithCodes.sort((a, b) => {
        const numA = parseInt(a.id) || 0;
        const numB = parseInt(b.id) || 0;
        return numA - numB;
      });
      
      // Sort sessions by sensor ID/number
      sessionsWithCodes.sort((a, b) => {
        const numA = parseInt(a.skid) || 0;
        const numB = parseInt(b.skid) || 0;
        return numA - numB;
      });
      
      setSensorKits(kitsWithCodes);
      setSensorSessions(sessionsWithCodes);
      
      // Group kits by sensor code (only for sensors with codes)
      const groupedKits = {};
      kitsWithCodes.forEach(kit => {
        const sensorKey = kit.sensorCode;
        if (!groupedKits[sensorKey]) {
          groupedKits[sensorKey] = [];
        }
        groupedKits[sensorKey].push(kit);
      });
      setGroupedSensorKits(groupedKits);
      
      // Group sessions by sensor code (only for sessions with codes)
      const groupedSessions = {};
      sessionsWithCodes.forEach(session => {
        const sensorKey = session.code;
        if (!groupedSessions[sensorKey]) {
          groupedSessions[sensorKey] = [];
        }
        groupedSessions[sensorKey].push(session);
      });
      setGroupedSensorSessions(groupedSessions);
      
      setLastUpdated(new Date());
      console.log('Sensor data fetch completed:', { 
        totalKits: kits.length,
        kitsWithCodes: kitsWithCodes.length,
        totalSessions: sessions.length,
        sessionsWithCodes: sessionsWithCodes.length,
        groupedKits: Object.keys(groupedKits).length,
        groupedSessions: Object.keys(groupedSessions).length
      });
      
    } catch (error) {
      console.error('💥 CRITICAL ERROR fetching sensor data:', error);
      console.error('💥 Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      // Set empty arrays but still show the page
      setSensorKits([]);
      setSensorSessions([]);
      setLastUpdated(new Date());
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    console.log('🔐 Setting up authentication listener...');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔐 Auth state changed:', user ? 'User logged in' : 'User logged out');
      if (!user) {
        console.log('🚫 No user, redirecting to login...');
        navigate("/", { replace: true });
      } else {
        console.log('✅ User authenticated:', { uid: user.uid, email: user.email });
        setUid(user.uid);
        
        try {
          // Fetch role from Firestore using uid reference
          console.log('👤 Fetching admin role from Firestore...');
          const q = query(collection(db, "admins"), where("adminId", "==", user.uid));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              console.log('👤 Admin data found:', { role: data.role, name: data.name });
              setRole((data.role || "unknown").toLowerCase());
              setAdminName(data.name || "Admin");
            });
          } else {
            console.log('⚠️ No admin data found for user');
            setRole("unknown");
          }
          
          // Fetch sensor data after authentication with a small delay
          console.log('⏰ Scheduling sensor data fetch...');
          setTimeout(() => {
            fetchSensorData();
            fetchParametersLogs();
          }, 100);
        } catch (error) {
          console.error('💥 Error in auth flow:', error);
        }
      }
    });
    return () => unsubscribe();
  }, [navigate, fetchSensorData, fetchParametersLogs]);

  // Real-time listener disabled - data only updates on manual refresh
  // useEffect(() => {
  //   Real-time updates removed to prevent automatic refresh
  // }, [uid]);


  const openModal = (data) => {
    setSelectedData(data);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedData(null);
  };

  // Fetch and merge data from SensorCollection (inventory) and SensorKits (deployed sensors)
  const fetchAvailableSensorKits = async () => {
    try {
      setFetchingKits(true);
      
      // Fetch from SensorCollection (inventory)
      const sensorCollectionRef = collection(db, 'SensorCollection');
      const sensorCollectionSnapshot = await getDocs(sensorCollectionRef);
      
      // Fetch from SensorKits (deployed/linked sensors with full details)
      const sensorKitsRef = collection(db, 'SensorKits');
      const sensorKitsSnapshot = await getDocs(sensorKitsRef);
      
      // Create a map of SensorKits data for quick lookup
      const sensorKitsMap = new Map();
      sensorKitsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Filter out hardcoded entries
        const isHardcodedEntry = (
          data.plantName === 'plantName' || 
          data.userId === 'userId' ||
          data.plantName === 'userId' ||
          data.userId === 'plantName'
        );
        
        if (!isHardcodedEntry) {
          sensorKitsMap.set(doc.id, {
            sensorCode: data.sensorCode || null,
            plantName: data.plantName || null,
            userId: data.userId || null,
            linked: data.linked || false,
            linkedPlantId: data.linkedPlantId || null,
            lastLinkTimestamp: data.lastLinkTimestamp || null,
            createdAt: data.createdAt || null
          });
        }
      });
      
      const kits = [];
      
      // Merge data: Use SensorCollection as base, enrich with SensorKits data if available
      sensorCollectionSnapshot.forEach((doc) => {
        const collectionData = doc.data();
        const sensorNumber = doc.id;
        
        // Check if this sensor exists in SensorKits (deployed)
        const sensorKitData = sensorKitsMap.get(sensorNumber);
        
        if (sensorKitData) {
          // Sensor is deployed - use detailed data from SensorKits
          kits.push({
            id: sensorNumber,
            sensorNumber: sensorNumber,
            sensorCode: sensorKitData.sensorCode || collectionData.sensorCode || null,
            plantName: sensorKitData.plantName || collectionData.plantName || null,
            userId: sensorKitData.userId || collectionData.linkedTo || null,
            linked: sensorKitData.linked || collectionData.linked || true,
            linkedPlantId: sensorKitData.linkedPlantId || null,
            linkedAt: sensorKitData.lastLinkTimestamp || collectionData.linkedAt || null,
            status: collectionData.status || 'deployed',
            source: 'both', // Data from both collections
            createdAt: sensorKitData.createdAt || collectionData.createdAt || null
          });
                } else {
          // Sensor only in SensorCollection (available in inventory)
          kits.push({
            id: sensorNumber,
            sensorNumber: sensorNumber,
            sensorCode: collectionData.sensorCode || null,
            plantName: collectionData.plantName || null,
            userId: collectionData.linkedTo || null,
            linked: collectionData.linked || false,
            linkedPlantId: null,
            linkedAt: collectionData.linkedAt || null,
            status: collectionData.status || 'available',
            source: 'collection', // Only from SensorCollection
            createdAt: collectionData.createdAt || null
          });
        }
      });
      
      // Also add sensors that are ONLY in SensorKits (not in SensorCollection yet)
      sensorKitsMap.forEach((kitData, sensorNumber) => {
        // Check if we already added this sensor from SensorCollection
        if (!kits.find(k => k.sensorNumber === sensorNumber)) {
          kits.push({
            id: sensorNumber,
            sensorNumber: sensorNumber,
            sensorCode: kitData.sensorCode || null,
            plantName: kitData.plantName || null,
            userId: kitData.userId || null,
            linked: kitData.linked || true,
            linkedPlantId: kitData.linkedPlantId || null,
            linkedAt: kitData.lastLinkTimestamp || null,
            status: 'deployed',
            source: 'kits', // Only from SensorKits
            createdAt: kitData.createdAt || null
          });
        }
      });
      
      // Sort by sensor number
      kits.sort((a, b) => a.sensorNumber.localeCompare(b.sensorNumber));
      
      setAvailableSensorKits(kits);
      console.log('Sensor inventory fetched and merged:', {
        total: kits.length,
        fromBoth: kits.filter(k => k.source === 'both').length,
        onlyCollection: kits.filter(k => k.source === 'collection').length,
        onlyKits: kits.filter(k => k.source === 'kits').length
      });
    } catch (error) {
      console.error('Error fetching sensor kits:', error);
      alert('Failed to fetch sensor kits. Please try again.');
    } finally {
      setFetchingKits(false);
    }
  };

  // Open modal and fetch available sensor kits
  const openAddModal = () => {
    setShowAddModal(true);
    fetchAvailableSensorKits();
  };

  const handleAddSensorKit = async (e) => {
    e.preventDefault();
    
    if (!selectedSensorKit) {
      alert('Please select a sensor kit');
      return;
    }
    
    try {
      setAddLoading(true);
      
      // Generate unique 6-digit sensor code
      const generatedSensorCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      console.log('Generated 6-digit sensor code:', generatedSensorCode);
      
      // Update SensorCollection to mark sensor code as distributed
      const sensorDocRef = doc(db, 'SensorCollection', selectedSensorKit.sensorNumber);
      await updateDoc(sensorDocRef, {
        sensorCode: generatedSensorCode,
        status: 'distributed', // Code distributed but not yet activated by user
        distributedAt: new Date().toISOString(),
        distributedBy: adminName || 'Admin',
        linked: false, // Not yet linked to a plant (user will do this)
        linkedTo: null,
        linkedAt: null,
        plantName: null
      });
      
      console.log('SensorCollection updated - Code distributed for sensor:', selectedSensorKit.sensorNumber);
      
      // Update Realtime Database Sensors/{sensorNumber}/code
      const sensorRealtimeRef = ref(realtimeDb, `Sensors/${selectedSensorKit.sensorNumber}`);
      
      // Check if sensor exists in Realtime DB, if not create it
      const sensorSnapshot = await get(sensorRealtimeRef);
      
      if (sensorSnapshot.exists()) {
        // Update existing sensor with new code
        await update(sensorRealtimeRef, {
          code: generatedSensorCode,
          linked: false
        });
        console.log('Realtime Database updated - Code added to Sensors/' + selectedSensorKit.sensorNumber);
                } else {
        // Create new sensor entry with code
        await set(sensorRealtimeRef, {
          code: generatedSensorCode,
          humidity: null,
          key: 'code',
          ph: null,
          tds: null,
          plantId: null,
          temperature: null,
          linked: false
        });
        console.log('Realtime Database created - New sensor entry at Sensors/' + selectedSensorKit.sensorNumber);
      }
      
      alert(`✅ Sensor Kit Added Successfully!\n\n📱 6-Digit Code: ${generatedSensorCode}\n\n🔢 Sensor Number: ${selectedSensorKit.sensorNumber}\n\n📋 Provide this code to the user so they can connect their plant in the mobile app.`);
      
      // Reset form
      setSelectedSensorKit(null);
      setShowAddModal(false);
      
      // Refresh sensor data
      fetchSensorData();
    } catch (error) {
      console.error('Error distributing sensor code:', error);
      alert('Failed to distribute sensor code. Please try again.\n\nError: ' + error.message);
    } finally {
      setAddLoading(false);
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setSelectedSensorKit(null);
    setAvailableSensorKits([]);
  };


  return (
    <div className="user-records-container">
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <Navbar role={role} adminName={adminName} adminId={uid} />

      <div className="tab-buttons" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '0 10px'
      }}>
        <div className="tab-group" style={{
          display: 'flex',
          gap: '10px'
        }}>
        <button
          className={activeTab === 'kits' ? 'active' : ''}
          onClick={() => setActiveTab('kits')}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'kits' ? '#4CAF50' : '#f5f5f5',
              color: activeTab === 'kits' ? 'white' : '#333',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
          >
            <FaList /> Sensor Kits
        </button>
        <button
          className={activeTab === 'sessions' ? 'active' : ''}
          onClick={() => setActiveTab('sessions')}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'sessions' ? '#4CAF50' : '#f5f5f5',
              color: activeTab === 'sessions' ? 'white' : '#333',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
          >
            <FaFlask /> Logs
          </button>
        {/* Temporarily Hidden - Parameters Logs Tab Button */}
        {/* <button
          className={activeTab === 'parameters' ? 'active' : ''}
          onClick={() => {
            setActiveTab('parameters');
            fetchParametersLogs();
          }}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'parameters' ? '#4CAF50' : '#f5f5f5',
              color: activeTab === 'parameters' ? 'white' : '#333',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
          >
            <FaClock /> Parameters Logs
          </button> */}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="add-sensor-btn" 
            onClick={openAddModal}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
          >
            <FaPlus /> Add Sensor Kit
          </button>
        <button 
          className="refresh-btn" 
          onClick={() => {
            fetchSensorData();
            fetchParametersLogs();
          }}
          disabled={loading || loadingParameters}
          style={{
            backgroundColor: (loading || loadingParameters) ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '6px',
            cursor: (loading || loadingParameters) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '500',
            transition: 'all 0.3s ease'
          }}
        >
          <FaRedo className={(loading || loadingParameters) ? 'spin' : ''} />
          {(loading || loadingParameters) ? 'Refreshing...' : 'Refresh'}
        </button>
        </div>
      </div>
      
      {lastUpdated && (
        <div style={{ 
          textAlign: 'right', 
          color: '#666', 
          fontSize: '12px', 
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#2196F3',
            borderRadius: '50%'
          }}></div>
          <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      )}

      {/* Sensor Kits Table */}
      {activeTab === 'kits' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="loading-spinner" style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #4CAF50',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <p>Loading sensor data...</p>
            </div>
          ) : Object.keys(groupedSensorKits).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <FaMicrochip size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>No sensor data available</p>
              <p style={{ fontSize: '14px' }}>Make sure your sensors are connected and sending data</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="records-table" style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <thead style={{ backgroundColor: '#f8f9fa' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaMicrochip style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      Sensor Kit ID
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Sensor Code</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaCheckCircle style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      Linked
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      🌱 Plant Name
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }} title="User ID masked with asterisks, shows only last 3 characters">
                      <FaUser style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      User ID
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedSensorKits)
              .sort(([, kitsA], [, kitsB]) => {
                // Sort by the first kit's ID in each group
                const numA = parseInt(kitsA[0].id) || 0;
                const numB = parseInt(kitsB[0].id) || 0;
                return numA - numB;
              })
              .map(([sensorCode, kits], groupIndex) => (
              <React.Fragment key={sensorCode}>
                {kits.map((kit, kitIndex) => (
                  <tr key={`${sensorCode}-${kitIndex}`} style={{
                    borderBottom: kitIndex === kits.length - 1 ? '3px solid #4CAF50' : '1px solid #e9ecef',
                    backgroundColor: groupIndex % 2 === 0 ? 'transparent' : '#f8f9fa',
                      transition: 'background-color 0.2s ease'
                    }}
                  onMouseEnter={(e) => {
                    const row = e.target.closest('tr');
                    row.style.backgroundColor = groupIndex % 2 === 0 ? '#f0f7f0' : '#e8f5e9';
                  }}
                  onMouseLeave={(e) => {
                    const row = e.target.closest('tr');
                    row.style.backgroundColor = groupIndex % 2 === 0 ? 'transparent' : '#f8f9fa';
                  }}
                  >
                    <td style={{ 
                      padding: '12px', 
                      fontWeight: '500',
                      borderLeft: kitIndex === 0 ? '4px solid #4CAF50' : '4px solid transparent',
                      paddingLeft: kitIndex === 0 ? '12px' : '16px'
                    }}>
                      {kitIndex === 0 && (
                        <div style={{ 
                          display: 'inline-block',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          marginRight: '8px'
                        }}>
                          {kits.length > 1 ? `${kits.length} Plants` : '1 Plant'}
                        </div>
                      )}
                      {kit.id}
                    </td>
                    <td style={{ 
                      padding: '12px',
                      fontWeight: kitIndex === 0 ? 'bold' : 'normal'
                    }}>
                      {kitIndex === 0 ? kit.code : '↳ ' + kit.code}
                    </td>
                      <td style={{ padding: '12px' }}>
                        {kit.linked
                          ? <span style={{ color: "#4CAF50", fontWeight: "bold", display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <FaCheckCircle /> Yes
                            </span>
                          : <span style={{ color: "#F44336", fontWeight: "bold", display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <FaTimes /> No
                            </span>
                  }
                </td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{kit.plantName}</td>
                      <td style={{ padding: '12px' }} title={`Original UID: ${kit.userId}`}>{hashUID(kit.userId)}</td>
                      <td style={{ padding: '12px', textAlign: "center" }}>
                  <button 
                    className="view-btn"
                    onClick={() => openModal(kit)}
                    style={{
                      background: "#4CAF50",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                            borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                            gap: "6px",
                      fontSize: "14px",
                            fontWeight: "500",
                            transition: "all 0.3s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#45a049";
                            e.target.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "#4CAF50";
                            e.target.style.transform = "translateY(0)";
                    }}
                  >
                    <FaEye /> View
                  </button>
                </td>
              </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
            </div>
          )}
        </div>
      )}

      {/* Sensor Logs Table */}
      {activeTab === 'sessions' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="loading-spinner" style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #4CAF50',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <p>Loading sensor logs...</p>
            </div>
          ) : Object.keys(groupedSensorSessions).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <FaFlask size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>No sensor logs available</p>
              <p style={{ fontSize: '14px' }}>Make sure your sensors are connected and sending data</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="records-table" style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <thead style={{ backgroundColor: '#f8f9fa' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaMicrochip style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      Sensor Kit ID
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Sensor Code</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }} title="User ID masked with asterisks, shows only last 3 characters">
                      <FaUser style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      User ID
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      🌱 Plant Name
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaTint style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      pH
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaBolt style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      EC
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaTemperatureHigh style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      Temperature (°C)
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaCloudRain style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      Humidity (%)
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaClock style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      Timestamp
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedSensorSessions)
              .sort(([, sessionsA], [, sessionsB]) => {
                // Sort by the first session's sensor kit ID in each group
                const numA = parseInt(sessionsA[0].skid) || 0;
                const numB = parseInt(sessionsB[0].skid) || 0;
                return numA - numB;
              })
              .map(([sensorCode, sessions], groupIndex) => (
              <React.Fragment key={sensorCode}>
                {sessions.map((session, sessionIndex) => (
                  <tr key={`${sensorCode}-${sessionIndex}`} style={{
                    borderBottom: sessionIndex === sessions.length - 1 ? '3px solid #4CAF50' : '1px solid #e9ecef',
                    backgroundColor: groupIndex % 2 === 0 ? 'transparent' : '#f8f9fa',
                      transition: 'background-color 0.2s ease'
                    }}
                  onMouseEnter={(e) => {
                    const row = e.target.closest('tr');
                    row.style.backgroundColor = groupIndex % 2 === 0 ? '#f0f7f0' : '#e8f5e9';
                  }}
                  onMouseLeave={(e) => {
                    const row = e.target.closest('tr');
                    row.style.backgroundColor = groupIndex % 2 === 0 ? 'transparent' : '#f8f9fa';
                  }}
                  >
                    <td style={{ 
                      padding: '12px', 
                      fontWeight: '500',
                      borderLeft: sessionIndex === 0 ? '4px solid #4CAF50' : '4px solid transparent',
                      paddingLeft: sessionIndex === 0 ? '12px' : '16px'
                    }}>
                      {sessionIndex === 0 && (
                        <div style={{ 
                          display: 'inline-block',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          marginRight: '8px'
                        }}>
                          {sessions.length > 1 ? `${sessions.length} Plants` : '1 Plant'}
                        </div>
                      )}
                      {session.skid}
                    </td>
                    <td style={{ 
                      padding: '12px',
                      fontWeight: sessionIndex === 0 ? 'bold' : 'normal'
                    }}>
                      {sessionIndex === 0 ? session.code : '↳ ' + session.code}
                    </td>
                      <td style={{ padding: '12px' }} title={`Original UID: ${session.uid}`}>{hashUID(session.uid)}</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{session.plantName || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{session.ph?.toFixed(2) || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{session.tds?.toFixed(2) || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{session.temperature?.toFixed(1) || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{session.humidity?.toFixed(1) || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{new Date(session.timestamp).toLocaleString()}</td>
                      <td style={{ padding: '12px', textAlign: "center" }}>
                  <button 
                    className="view-btn"
                    onClick={() => openModal(session)}
                    style={{
                      background: "#4CAF50",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                            borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                            gap: "6px",
                      fontSize: "14px",
                            fontWeight: "500",
                            transition: "all 0.3s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#45a049";
                            e.target.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "#4CAF50";
                            e.target.style.transform = "translateY(0)";
                    }}
                  >
                    <FaEye /> View
                  </button>
                </td>
              </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
            </div>
          )}
        </div>
      )}

      {/* Temporarily Hidden - Parameters Logs Tab */}
      {/* {activeTab === 'parameters' && (
        <div>
          {loadingParameters ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="loading-spinner" style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #4CAF50',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <p>Loading parameters logs...</p>
            </div>
          ) : parametersLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <FaClock size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>No manual parameters found</p>
              <p style={{ fontSize: '14px' }}>Parameters with manual updates will appear here</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="records-table" style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <thead style={{ backgroundColor: '#f8f9fa' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaMicrochip style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      Sensor ID
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      🌱 Plant Name
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      🌿 Plant Type
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      📍 Source
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaTint style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      pH
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaBolt style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      EC
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaTemperatureHigh style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      Temp (°C)
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaCloudRain style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      Humidity (%)
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaClock style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      Last Updated
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaUser style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      User ID
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parametersLogs.map((log, index) => (
                    <tr key={log.id} style={{
                      borderBottom: '1px solid #e9ecef',
                      backgroundColor: index % 2 === 0 ? 'transparent' : '#f8f9fa',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      const row = e.target.closest('tr');
                      row.style.backgroundColor = '#e8f5e9';
                    }}
                    onMouseLeave={(e) => {
                      const row = e.target.closest('tr');
                      row.style.backgroundColor = index % 2 === 0 ? 'transparent' : '#f8f9fa';
                    }}
                    >
                      <td style={{ padding: '12px', fontWeight: '500' }}>{log.id}</td>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{log.plantName}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          backgroundColor: '#f3e5f5',
                          color: '#6a1b9a',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {log.plantType}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          backgroundColor: log.source === 'Growers Collection' ? '#e8f5e9' : log.source === 'Plants (Realtime DB)' ? '#e3f2fd' : '#fff3e0',
                          color: log.source === 'Growers Collection' ? '#2e7d32' : log.source === 'Plants (Realtime DB)' ? '#1565c0' : '#e65100',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500'
                        }}>
                          {log.source}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{log.ph !== null ? log.ph.toFixed(2) : 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{log.ec !== null ? log.ec.toFixed(2) : 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{log.temperature !== null ? log.temperature.toFixed(1) : 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{log.humidity !== null ? log.humidity.toFixed(1) : 'N/A'}</td>
                      <td style={{ padding: '12px', fontSize: '12px' }}>
                        {new Date(log.lastManualUpdate).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {log.updatedBy}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: "center" }}>
                        <button 
                          className="view-btn"
                          onClick={() => openModal(log)}
                          style={{
                            background: "#4CAF50",
                            color: "white",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "14px",
                            fontWeight: "500",
                            transition: "all 0.3s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#45a049";
                            e.target.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "#4CAF50";
                            e.target.style.transform = "translateY(0)";
                          }}
                        >
                          <FaEye /> View
                        </button>
                      </td>
                    </tr>
            ))}
          </tbody>
        </table>
            </div>
          )}
        </div>
      )} */}


      {/* Modal for displaying sensor information */}
      {showModal && selectedData && (
        <div className="modal-overlay" onClick={closeModal} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '0',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div className="modal-header" style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <h3 style={{
                margin: 0,
                color: '#333',
                fontSize: '20px',
                fontWeight: '600'
              }}>
                {activeTab === 'parameters' ? 'Plant Parameter Details' : activeTab === 'kits' ? 'Sensor Kit Details' : 'Sensor Log Details'}
              </h3>
              <button className="close-modal-btn" onClick={closeModal} style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#666',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f0f0f0';
                e.target.style.color = '#333';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#666';
              }}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body" style={{
              padding: '24px',
              maxHeight: '60vh',
              overflowY: 'auto'
            }}>
              {activeTab === 'parameters' ? (
                <div className="sensor-details" style={{
                  display: 'grid',
                  gap: '16px'
                }}>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <FaMicrochip style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Plant ID</div>
                      <div style={{ color: '#666' }}>{selectedData.id}</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>🌱 Plant Name</div>
                      <div style={{ color: '#666', fontSize: '16px', fontWeight: '600' }}>{selectedData.plantName}</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>🌿 Plant Type</div>
                      <div style={{ color: '#666' }}>{selectedData.plantType}</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#e8f5e9',
                    borderRadius: '8px',
                    border: '1px solid #4CAF50'
                  }}>
                    <div style={{ width: '100%' }}>
                      <div style={{ fontWeight: '700', color: '#2e7d32', marginBottom: '8px', fontSize: '15px' }}>📊 Plant Parameters (Manually Inputted)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                            <FaTint style={{ marginRight: '4px', color: '#4CAF50' }} />
                            pH Level
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>
                            {selectedData.ph !== null ? selectedData.ph.toFixed(2) : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                            <FaBolt style={{ marginRight: '4px', color: '#4CAF50' }} />
                            EC (Electrical Conductivity)
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>
                            {selectedData.ec !== null ? selectedData.ec.toFixed(2) : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                            <FaTemperatureHigh style={{ marginRight: '4px', color: '#4CAF50' }} />
                            Temperature
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>
                            {selectedData.temperature !== null ? `${selectedData.temperature.toFixed(1)}°C` : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                            <FaCloudRain style={{ marginRight: '4px', color: '#4CAF50' }} />
                            Humidity
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>
                            {selectedData.humidity !== null ? `${selectedData.humidity.toFixed(1)}%` : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {selectedData.waterTemp && (
                    <div className="detail-item" style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <FaTemperatureHigh style={{ color: "#2196F3", marginRight: "12px", fontSize: '18px' }} />
                      <div>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Water Temperature</div>
                        <div style={{ color: '#666' }}>{selectedData.waterTemp.toFixed(1)}°C</div>
                      </div>
                    </div>
                  )}
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>📍 Data Source</div>
                      <div style={{ color: '#666' }}>{selectedData.source}</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <FaUser style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>User ID</div>
                      <div style={{ color: '#666' }} title={`Original UID: ${selectedData.userId}`}>{selectedData.userName || hashUID(selectedData.userId)}</div>
                    </div>
                  </div>
                  {selectedData.notes && (
                    <div className="detail-item" style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      backgroundColor: '#fff3e0',
                      borderRadius: '8px',
                      border: '1px solid #ff9800'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>📝 Notes</div>
                        <div style={{ color: '#666' }}>{selectedData.notes}</div>
                      </div>
                    </div>
                  )}
                  {selectedData.location && (
                    <div className="detail-item" style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>📍 Location</div>
                        <div style={{ color: '#666' }}>{selectedData.location}</div>
                      </div>
                    </div>
                  )}
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <FaClock style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Last Updated</div>
                      <div style={{ color: '#666' }}>{new Date(selectedData.lastManualUpdate).toLocaleString()}</div>
                    </div>
                  </div>
                  {selectedData.createdAt && (
                    <div className="detail-item" style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Created At</div>
                        <div style={{ color: '#666' }}>{new Date(selectedData.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '8px',
                    border: '1px solid #2196F3'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Status</div>
                      <div style={{ 
                        color: selectedData.status === 'active' ? '#4CAF50' : '#666',
                        fontWeight: '500'
                      }}>
                        {selectedData.status.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeTab === 'kits' ? (
                <div className="sensor-details" style={{
                  display: 'grid',
                  gap: '16px'
                }}>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <FaMicrochip style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Sensor Kit ID</div>
                      <div style={{ color: '#666' }}>{selectedData.id}</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Sensor Code</div>
                      <div style={{ color: '#666' }}>{selectedData.code}</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Plant Name</div>
                      <div style={{ color: '#666' }}>{selectedData.plantName || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <FaCheckCircle style={{ color: selectedData.linked ? "#4CAF50" : "#F44336", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Linked</div>
                      <div style={{ color: selectedData.linked ? "#4CAF50" : "#F44336", fontWeight: '500' }}>
                        {selectedData.linked ? "Yes" : "No"}
                      </div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <FaUser style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>User ID</div>
                      <div style={{ color: '#666' }} title={`Original UID: ${selectedData.userId}`}>{hashUID(selectedData.userId)}</div>
                    </div>
                  </div>
                  {selectedData.lastLinkTimestamp && (
                    <div className="detail-item" style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <FaClock style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                      <div>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Last Update</div>
                        <div style={{ color: '#666' }}>{new Date(selectedData.lastLinkTimestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="sensor-details" style={{
                  display: 'grid',
                  gap: '16px'
                }}>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <FaMicrochip style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Sensor Kit ID</div>
                      <div style={{ color: '#666' }}>{selectedData.skid}</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Sensor Code</div>
                      <div style={{ color: '#666' }}>{selectedData.code}</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Plant Name</div>
                      <div style={{ color: '#666' }}>{selectedData.plantName || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <FaUser style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>User ID</div>
                      <div style={{ color: '#666' }} title={`Original UID: ${selectedData.uid}`}>{hashUID(selectedData.uid)}</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <FaTint style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>pH Level</div>
                      <div style={{ color: '#666', fontSize: '18px', fontWeight: '500' }}>{selectedData.ph?.toFixed(2) || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <FaBolt style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>EC (Electrical Conductivity)</div>
                      <div style={{ color: '#666', fontSize: '18px', fontWeight: '500' }}>{selectedData.tds?.toFixed(2) || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <FaTemperatureHigh style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Temperature</div>
                      <div style={{ color: '#666', fontSize: '18px', fontWeight: '500' }}>{selectedData.temperature?.toFixed(1) || 'N/A'} °C</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <FaCloudRain style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Humidity</div>
                      <div style={{ color: '#666', fontSize: '18px', fontWeight: '500' }}>{selectedData.humidity?.toFixed(1) || 'N/A'} %</div>
                    </div>
                  </div>
                  <div className="detail-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <FaClock style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Timestamp</div>
                      <div style={{ color: '#666' }}>{new Date(selectedData.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{
              padding: '20px 24px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#f8f9fa'
            }}>
              <button className="cancel-btn" onClick={closeModal} style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#5a6268';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#6c757d';
                e.target.style.transform = 'translateY(0)';
              }}
              >
                <FaTimes /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Sensor Kit Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddModal} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '0',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div className="modal-header" style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <h3 style={{
                margin: 0,
                color: '#333',
                fontSize: '20px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FaPlus style={{ color: '#4CAF50' }} /> Add Sensor Kit
              </h3>
              <button className="close-modal-btn" onClick={closeAddModal} style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#666',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f0f0f0';
                e.target.style.color = '#333';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#666';
              }}
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleAddSensorKit}>
              <div className="modal-body" style={{
                padding: '24px',
                maxHeight: '60vh',
                overflowY: 'auto'
              }}>
                {/* Loading State */}
                {fetchingKits ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '4px solid #f3f3f3',
                      borderTop: '4px solid #4CAF50',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 16px'
                    }}></div>
                    <p style={{ color: '#666', margin: 0 }}>Loading sensor inventory...</p>
                  </div>
                ) : availableSensorKits.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <FaMicrochip size={48} style={{ color: '#ccc', marginBottom: '16px' }} />
                    <p style={{ color: '#666', margin: '0 0 8px 0', fontWeight: '600' }}>No sensors in inventory</p>
                    <p style={{ color: '#999', margin: 0, fontSize: '14px' }}>Please initialize the sensor inventory first.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: '#333',
                        fontSize: '14px'
                      }}>
                        Select Sensor Kit <span style={{ color: '#f44336' }}>*</span>
                      </label>
                      <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                        🟢 Available &nbsp;|&nbsp; 🔴 Already Linked
                      </div>
                      <select
                        value={selectedSensorKit?.id || ''}
                        onChange={(e) => {
                          const kit = availableSensorKits.find(k => k.id === e.target.value);
                          setSelectedSensorKit(kit || null);
                        }}
                        required
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          transition: 'border-color 0.2s',
                          boxSizing: 'border-box',
                          backgroundColor: 'white',
                          cursor: 'pointer'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                      >
                        <option value="">-- Select a sensor from inventory --</option>
                        {availableSensorKits.map((kit) => (
                          <option key={kit.id} value={kit.id}>
                            Sensor #{kit.sensorNumber} - {kit.linked 
                              ? `🔴 Linked (${kit.plantName || 'Unknown'}) - User: ${kit.userId ? kit.userId.substring(0, 8) + '...' : 'N/A'}` 
                              : '🟢 Available'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedSensorKit && (
                      <div style={{
                        marginBottom: '20px',
                        padding: '12px 16px',
                        backgroundColor: selectedSensorKit.linked ? '#ffebee' : '#e8f5e9',
                        borderLeft: `4px solid ${selectedSensorKit.linked ? '#f44336' : '#4CAF50'}`,
                        borderRadius: '4px'
                      }}>
                        <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>
                          <strong>{selectedSensorKit.linked ? '⚠️ Selected Sensor (Already Linked):' : '✅ Selected Sensor from Inventory:'}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
                          <div><strong>Sensor Number:</strong> {selectedSensorKit.sensorNumber}</div>
                          {selectedSensorKit.sensorCode && (
                            <div><strong>Sensor Code:</strong> {selectedSensorKit.sensorCode}</div>
                          )}
                          <div><strong>Status:</strong> {selectedSensorKit.linked ? '🔴 Linked' : '🟢 Available'}</div>
                          {selectedSensorKit.linked && (
                            <>
                              <div><strong>Linked To (User):</strong> {selectedSensorKit.userId || selectedSensorKit.linkedTo || 'N/A'}</div>
                              <div><strong>Plant Name:</strong> {selectedSensorKit.plantName || 'N/A'}</div>
                              {selectedSensorKit.linkedAt && (
                                <div><strong>Linked At:</strong> {new Date(selectedSensorKit.linkedAt).toLocaleString()}</div>
                              )}
                            </>
                          )}
                          <div style={{ 
                            marginTop: '4px',
                            padding: '4px 8px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#888'
                          }}>
                            📍 Data Source: {selectedSensorKit.source === 'both' ? 'SensorCollection + SensorKits' : 
                                           selectedSensorKit.source === 'collection' ? 'SensorCollection (Inventory)' : 
                                           'SensorKits (Deployed)'}
                          </div>
                          <div style={{ 
                            marginTop: '8px', 
                            padding: '8px', 
                            backgroundColor: selectedSensorKit.linked ? '#ffebee' : (selectedSensorKit.sensorCode ? '#fff3cd' : '#e3f2fd'), 
                            borderRadius: '4px', 
                            fontSize: '12px',
                            border: selectedSensorKit.linked ? '1px solid #f44336' : 'none'
                          }}>
                            <strong>{selectedSensorKit.linked ? '🚫 Warning:' : 'ℹ️ Note:'}</strong> {selectedSensorKit.linked
                              ? 'This sensor is already linked to a plant and cannot be redistributed. The button below is disabled.'
                              : selectedSensorKit.sensorCode 
                              ? 'This sensor already has a code. Generating a new code will replace the old one.'
                              : 'A unique 6-digit code will be generated and distributed to the user.'}
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{
                      padding: '16px',
                      backgroundColor: '#fff9e6',
                      borderRadius: '8px',
                      border: '1px solid #ffd700',
                      marginBottom: '20px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ fontSize: '24px' }}>📱</div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                            How it works:
                          </div>
                          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#666', lineHeight: '1.8' }}>
                            <li>Click "Add Sensor Kit" to generate a 6-digit sensor code</li>
                            <li>Provide the code to the user/farmer</li>
                            <li>User enters the code in their mobile app with plant details</li>
                            <li>User connects their plant and starts monitoring</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer" style={{
                padding: '20px 24px',
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                backgroundColor: '#f8f9fa'
              }}>
                <button type="button" onClick={closeAddModal} style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
                >
                  <FaTimes style={{ marginRight: '4px' }} /> Close
                </button>
                {!fetchingKits && availableSensorKits.length > 0 && (
                  <button type="submit" disabled={addLoading || !selectedSensorKit || selectedSensorKit?.linked} style={{
                    background: (addLoading || !selectedSensorKit || selectedSensorKit?.linked) ? '#ccc' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: (addLoading || !selectedSensorKit || selectedSensorKit?.linked) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => !addLoading && selectedSensorKit && !selectedSensorKit.linked && (e.target.style.backgroundColor = '#45a049')}
                  onMouseLeave={(e) => !addLoading && selectedSensorKit && !selectedSensorKit.linked && (e.target.style.backgroundColor = '#4CAF50')}
                  >
                    <FaPlus /> {addLoading ? 'Adding Sensor...' : selectedSensorKit?.linked ? 'Sensor Already Linked' : 'Add Sensor Kit'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SensorLogsPage;
