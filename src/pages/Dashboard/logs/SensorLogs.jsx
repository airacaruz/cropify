import { onAuthStateChanged } from 'firebase/auth';
import { get, off, onValue, ref } from 'firebase/database';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { FaCheckCircle, FaClock, FaCloudRain, FaEye, FaFlask, FaList, FaMicrochip, FaRedo, FaTemperatureHigh, FaTimes, FaTint, FaUser, FaWater } from "react-icons/fa";
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

  // Role and user info
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState("");
  const navigate = useNavigate();

  // Real-time sensor data
  const [sensorKits, setSensorKits] = useState([]);
  const [sensorSessions, setSensorSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

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
            const kit = {
              id: doc.id,
              code: data.sensorCode || 'N/A',
              linked: data.linked || false,
              linkedPlantId: data.linkedPlantId || null,
              plantName: data.plantName || 'N/A',
              userId: data.userId || 'system',
              lastLinkTimestamp: data.lastLinkTimestamp || new Date().toISOString()
            };
            kits.push(kit);
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
            
            // Check if this sensor kit already exists in Firestore data
            const existingKit = kits.find(kit => kit.id === sensorId);
            
            if (existingKit) {
              // Check if sensor is now unlinked - if so, remove it from kits
              if (sensorData.linked === false) {
                const kitIndex = kits.findIndex(kit => kit.id === sensorId);
                if (kitIndex !== -1) {
                  kits.splice(kitIndex, 1);
                  console.log(`Removed unlinked sensor ${sensorId} from kits during fetch`);
                }
              } else {
                // Update existing kit with real-time data, but preserve plantName and userId from Firestore
                existingKit.code = sensorData.code || sensorData.sensorCode || existingKit.code;
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
              }
            } else {
            // Only filter out hardcoded entries, show all sensors with readings
            const isHardcodedEntry = (
              sensorData.plantName === 'plantName' || 
              sensorData.userId === 'userId' ||
              sensorData.plantName === 'userId' ||
              sensorData.userId === 'plantName'
            );
            
            if (!isHardcodedEntry) {
                const kit = {
                  id: sensorId,
                  code: sensorData.code || sensorData.sensorCode || 'N/A',
                  linked: sensorData.linked || false,
                  linkedPlantId: sensorData.linkedPlantId || null,
                  plantName: sensorData.plantName || 'N/A',
                  userId: sensorData.userId,
                  lastLinkTimestamp: new Date().toISOString(),
                  currentReadings: {
                    ph: sensorData.ph,
                    tds: sensorData.tds,
                    temperature: sensorData.temperature,
                    humidity: sensorData.humidity,
                    timestamp: new Date().toISOString()
                  }
                };
                kits.push(kit);
              }
            }
            
            // Create sensor session entry if userId exists (indicating sensor is in use) AND has valid readings
            const hasUserId = sensorData.userId && sensorData.userId !== 'system';
            const hasReadings = sensorData.ph !== undefined || sensorData.temperature !== undefined || sensorData.humidity !== undefined || sensorData.tds !== undefined;
            const isLinked = sensorData.linked !== false; // Only create sessions for linked sensors
            
            console.log(`Sensor ${sensorId} - hasUserId: ${hasUserId}, hasReadings: ${hasReadings}, isLinked: ${isLinked}`);
            
            // Show all sensors with readings - simplified for production debugging
            if (hasReadings && isLinked) {
              // Use preserved data from existing kit if available, otherwise use sensorData
              const existingKit = kits.find(kit => kit.id === sensorId);
              const session = {
                skid: sensorId,
                code: sensorData.code || sensorData.sensorCode || 'N/A',
                uid: existingKit?.userId || sensorData.userId || 'system',
                sensorType: 'All',
                ph: sensorData.ph || 0,
                tds: sensorData.tds || 0,
                temperature: sensorData.temperature || 0,
                humidity: sensorData.humidity || 0,
                timestamp: new Date().toISOString(),
                plantName: existingKit?.plantName || sensorData.plantName || 'N/A',
                linked: sensorData.linked || false
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
      
      setSensorKits(kits);
      setSensorSessions(sessions);
      setLastUpdated(new Date());
      console.log('Sensor data fetch completed:', { kits: kits.length, sessions: sessions.length });
      
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
          }, 100);
        } catch (error) {
          console.error('💥 Error in auth flow:', error);
        }
      }
    });
    return () => unsubscribe();
  }, [navigate, fetchSensorData]);

  // Set up real-time listener for sensor data updates
  useEffect(() => {
    if (!uid) {
      console.log('No UID available, skipping real-time listener setup');
      return; // Don't set up listener if user is not authenticated
    }
    
    console.log('Setting up real-time listener for sensor data...');
    console.log('User UID:', uid);
    console.log('Environment:', import.meta.env.MODE);
    console.log('Firebase Realtime DB URL:', realtimeDb.app.options.databaseURL);
    console.log('Firebase project ID:', realtimeDb.app.options.projectId);
    
    // Test Firebase connection first
    console.log('🧪 Testing Firebase Realtime Database connection...');
    const testRef = ref(realtimeDb, 'test');
    get(testRef).then((snapshot) => {
      console.log('✅ Firebase Realtime Database connection test successful');
      console.log('🧪 Test snapshot exists:', snapshot.exists());
    }).catch((error) => {
      console.error('❌ Firebase Realtime Database connection test failed:', error);
      console.error('❌ Connection test error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
    });
    
    // Also test the Sensors path directly
    console.log('🧪 Testing direct Sensors path access...');
    const sensorsTestRef = ref(realtimeDb, 'Sensors');
    get(sensorsTestRef).then((snapshot) => {
      console.log('✅ Direct Sensors path test successful');
      console.log('🧪 Sensors snapshot exists:', snapshot.exists());
      if (snapshot.exists()) {
        console.log('🧪 Sensors data keys:', Object.keys(snapshot.val()));
      }
    }).catch((error) => {
      console.error('❌ Direct Sensors path test failed:', error);
    });
    
    const sensorsRef = ref(realtimeDb, 'Sensors');
    
    const unsubscribeRealtime = onValue(sensorsRef, (snapshot) => {
      console.log('Real-time listener triggered');
      if (snapshot.exists()) {
        console.log('Real-time sensor data update received');
        const sensorsData = snapshot.val();
        console.log('Raw sensor data from Firebase:', sensorsData);
        
        // Update sensor kits with latest readings
        let updatedKits = [];
        setSensorKits(prevKits => {
          updatedKits = [...prevKits];
          
          Object.keys(sensorsData).forEach(sensorId => {
            const sensorData = sensorsData[sensorId];
            const existingKitIndex = updatedKits.findIndex(kit => kit.id === sensorId);
            
            if (existingKitIndex !== -1) {
              // Only update if it's not a system sensor kit
              if (updatedKits[existingKitIndex].userId !== 'system') {
                // Check if sensor is now unlinked - if so, remove it
                if (sensorData.linked === false) {
                  updatedKits.splice(existingKitIndex, 1);
                  console.log(`Removed unlinked sensor ${sensorId} from kits`);
                } else {
                  // Update existing kit with latest readings, but preserve plantName and userId
                  updatedKits[existingKitIndex] = {
                    ...updatedKits[existingKitIndex],
                    code: sensorData.code || sensorData.sensorCode || updatedKits[existingKitIndex].code,
                    linked: sensorData.linked !== undefined ? sensorData.linked : updatedKits[existingKitIndex].linked,
                    linkedPlantId: sensorData.linkedPlantId || updatedKits[existingKitIndex].linkedPlantId,
                    // Preserve plantName and userId (don't overwrite with undefined)
                    plantName: sensorData.plantName || updatedKits[existingKitIndex].plantName,
                    userId: sensorData.userId || updatedKits[existingKitIndex].userId,
                    lastLinkTimestamp: new Date().toISOString(),
                    currentReadings: {
                      ph: sensorData.ph,
                      tds: sensorData.tds,
                      temperature: sensorData.temperature,
                      humidity: sensorData.humidity,
                      timestamp: new Date().toISOString()
                    }
                  };
                }
              }
            }
          });
          
          return updatedKits;
        });
        
        // Update sensor sessions with latest readings for linked sensors
        setSensorSessions(prevSessions => {
          const updatedSessions = [...prevSessions];
          
          Object.keys(sensorsData).forEach(sensorId => {
            const sensorData = sensorsData[sensorId];
            
            // Check if sensor is unlinked - if so, remove it from sessions
            if (sensorData.linked === false) {
              const existingIndex = updatedSessions.findIndex(s => s.skid === sensorId);
              if (existingIndex !== -1) {
                updatedSessions.splice(existingIndex, 1);
                console.log(`Removed unlinked sensor ${sensorId} from sessions`);
              }
            } else if (sensorData.ph !== undefined || sensorData.temperature !== undefined || sensorData.humidity !== undefined || sensorData.tds !== undefined) {
              // Use preserved data from existing kit if available
              const existingKit = updatedKits.find(kit => kit.id === sensorId);
              const userId = existingKit?.userId || sensorData.userId;
              
              // Only filter out hardcoded entries, show all sensors with readings
              const isHardcodedEntry = (
                sensorData.plantName === 'plantName' || 
                sensorData.userId === 'userId' ||
                sensorData.plantName === 'userId' ||
                sensorData.userId === 'plantName'
              );
              
              if (!isHardcodedEntry) {
                const session = {
                  skid: sensorId,
                  code: sensorData.code || sensorData.sensorCode || 'N/A',
                  uid: userId,
                  sensorType: 'All',
                  ph: sensorData.ph || 0,
                  tds: sensorData.tds || 0,
                  temperature: sensorData.temperature || 0,
                  humidity: sensorData.humidity || 0,
                  timestamp: new Date().toISOString(),
                  plantName: existingKit?.plantName || sensorData.plantName || 'N/A',
                  linked: sensorData.linked || false
                };
                
                // Find existing session and update it, or add new one
                const existingIndex = updatedSessions.findIndex(s => s.skid === sensorId);
                if (existingIndex !== -1) {
                  updatedSessions[existingIndex] = session;
                } else {
                  updatedSessions.push(session);
                }
              }
            }
          });
          
          return updatedSessions;
        });

        
        setLastUpdated(new Date());
      }
    }, (error) => {
      console.error('Real-time listener error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      console.error('This might be why sensor logs are not showing in production');
    });
    
    return () => {
      console.log('Cleaning up real-time listener');
      off(sensorsRef, 'value', unsubscribeRealtime);
    };
  }, [uid]);


  const openModal = (data) => {
    setSelectedData(data);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedData(null);
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
        </div>
        <button 
          className="refresh-btn" 
          onClick={fetchSensorData}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '500',
            transition: 'all 0.3s ease'
          }}
        >
          <FaRedo className={loading ? 'spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
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
            backgroundColor: '#4CAF50',
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }}></div>
          <span>Live data • Last updated: {lastUpdated.toLocaleTimeString()}</span>
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
          ) : sensorKits.length === 0 ? (
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
            {sensorKits.map((kit, index) => (
                    <tr key={index} style={{
                      borderBottom: '1px solid #dee2e6',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.closest('tr').style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.closest('tr').style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '12px', fontWeight: '500' }}>{kit.id}</td>
                      <td style={{ padding: '12px' }}>{kit.code}</td>
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
                      <td style={{ padding: '12px' }}>{kit.plantName}</td>
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
          ) : sensorSessions.length === 0 ? (
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
                      <FaWater style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      TDS (ppm)
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
            {sensorSessions.map((session, index) => (
                    <tr key={index} style={{
                      borderBottom: '1px solid #dee2e6',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.closest('tr').style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.closest('tr').style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '12px', fontWeight: '500' }}>{session.skid}</td>
                      <td style={{ padding: '12px' }}>{session.code}</td>
                      <td style={{ padding: '12px' }} title={`Original UID: ${session.uid}`}>{hashUID(session.uid)}</td>
                      <td style={{ padding: '12px' }}>{session.plantName || 'N/A'}</td>
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
          </tbody>
        </table>
            </div>
          )}
        </div>
      )}


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
                {activeTab === 'kits' ? 'Sensor Kit Details' : 'Sensor Log Details'}
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
              {activeTab === 'kits' ? (
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
                    <FaWater style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>TDS (Total Dissolved Solids)</div>
                      <div style={{ color: '#666', fontSize: '18px', fontWeight: '500' }}>{selectedData.tds?.toFixed(2) || 'N/A'} ppm</div>
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

    </div>
  );
};

export default SensorLogsPage;
