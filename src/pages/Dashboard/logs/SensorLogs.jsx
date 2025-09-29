import { onAuthStateChanged } from 'firebase/auth';
import { get, ref } from 'firebase/database';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { FaCheckCircle, FaClock, FaCloudRain, FaEye, FaFlask, FaList, FaMicrochip, FaRedo, FaTemperatureHigh, FaTimes, FaTint, FaUser, FaWater } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import { auth, db, realtimeDb } from '../../../firebase';
import '../../../styles/UserRecordsPage.css';

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
      console.log('Starting sensor data fetch...');
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
        });
        
        console.log('Firestore sensor kits fetched:', kits.length, 'kits');
      } catch (firestoreError) {
        console.log('No Firestore sensor kits found or error:', firestoreError);
      }
      
      // Fetch from Realtime Database Sensors path with timeout
      try {
        console.log('Fetching from Realtime Database...');
        const sensorsRef = ref(realtimeDb, 'Sensors');
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Realtime Database fetch timeout')), 5000); // 5 second timeout
        });
        
        const snapshot = await Promise.race([get(sensorsRef), timeoutPromise]);
        
        if (snapshot.exists()) {
          const sensorsData = snapshot.val();
          console.log('Realtime Database data found:', Object.keys(sensorsData).length, 'sensors');
          
          // Process each sensor from Realtime Database
          Object.keys(sensorsData).forEach(sensorId => {
            const sensorData = sensorsData[sensorId];
            
            // Check if this sensor kit already exists in Firestore data
            const existingKit = kits.find(kit => kit.id === sensorId);
            
            if (existingKit) {
              // Update existing kit with real-time data
              existingKit.code = sensorData.sensorCode || existingKit.code;
              existingKit.linked = sensorData.linked !== undefined ? sensorData.linked : existingKit.linked;
              existingKit.linkedPlantId = sensorData.linkedPlantId || existingKit.linkedPlantId;
              existingKit.plantName = sensorData.plantName || existingKit.plantName;
              existingKit.userId = sensorData.userId || existingKit.userId;
              existingKit.lastLinkTimestamp = new Date().toISOString();
            } else {
              // Create new kit entry from Realtime Database
              const kit = {
                id: sensorId,
                code: sensorData.sensorCode || 'N/A',
                linked: sensorData.linked || false,
                linkedPlantId: sensorData.linkedPlantId || null,
                plantName: sensorData.plantName || 'N/A',
                userId: sensorData.userId || 'system',
                lastLinkTimestamp: new Date().toISOString()
              };
              kits.push(kit);
            }
            
            // Create sensor session entry
            const session = {
              skid: sensorId,
              code: sensorData.sensorCode || 'N/A',
              uid: sensorData.userId || 'system',
              sensorType: 'All',
              ph: sensorData.ph || 0,
              tds: sensorData.tds || 0,
              temperature: sensorData.temperature || 0,
              humidity: sensorData.humidity || 0,
              timestamp: new Date().toISOString(),
              plantName: sensorData.plantName || 'N/A',
              linked: sensorData.linked || false
            };
            sessions.push(session);
          });
          
          console.log('Realtime Database sensor data processed:', { kits: kits.length, sessions: sessions.length });
        } else {
          console.log('No data found in Realtime Database');
        }
      } catch (realtimeError) {
        console.log('Realtime Database error or timeout:', realtimeError);
        // Continue with just Firestore data - this is normal if no realtime data exists
      }
      
      setSensorKits(kits);
      setSensorSessions(sessions);
      setLastUpdated(new Date());
      console.log('Sensor data fetch completed:', { kits: kits.length, sessions: sessions.length });
      
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      // Set empty arrays but still show the page
      setSensorKits([]);
      setSensorSessions([]);
      setLastUpdated(new Date());
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/", { replace: true });
      } else {
        setUid(user.uid);
        // Fetch role from Firestore using uid reference
        const q = query(collection(db, "admins"), where("adminId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            setRole((data.role || "unknown").toLowerCase());
            setAdminName(data.name || "Admin");
          });
        } else {
          setRole("unknown");
        }
        
        // Fetch sensor data after authentication with a small delay
        setTimeout(() => {
          fetchSensorData();
        }, 100);
      }
    });
    return () => unsubscribe();
  }, [navigate, fetchSensorData]);


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
          marginBottom: '10px' 
        }}>
          Last updated: {lastUpdated.toLocaleTimeString()}
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
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
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
                      <td style={{ padding: '12px' }}>{kit.userId}</td>
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
              <p style={{ fontSize: '14px' }}>Sensor data will appear here when available</p>
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
                      <FaUser style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      User ID
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      🌱 Plant Name
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      <FaFlask style={{ marginRight: '8px', color: '#4CAF50' }} /> 
                      Sensor Type
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
                      <td style={{ padding: '12px' }}>{session.uid}</td>
                      <td style={{ padding: '12px' }}>{session.plantName || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{session.sensorType}</td>
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
                      <div style={{ color: '#666' }}>{selectedData.userId}</div>
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
                      <div style={{ color: '#666' }}>{selectedData.userId}</div>
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
                    <FaFlask style={{ color: "#4CAF50", marginRight: "12px", fontSize: '18px' }} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>Sensor Type</div>
                      <div style={{ color: '#666' }}>{selectedData.sensorType}</div>
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
