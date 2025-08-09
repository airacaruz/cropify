import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, collectionGroup, query, orderBy } from 'firebase/firestore';

import { db } from '../../../firebase';
import '../../../styles/UserRecordsPage.css'; // This is the CSS file that styles this component
import { useNavigate } from 'react-router-dom';

const UserLogsPage = () => {
  const [sessionLogs, setSessionLogs] = useState([]);
  const [screenLogs, setScreenLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();

  // State to hold grouped plant data
  const [plantLogs, setPlantLogs] = useState([]);
  // State to manage expanded grower sections (outer level)
  const [expandedGrowerId, setExpandedGrowerId] = useState(null);
  // State to manage expanded individual plant details (inner level)
  const [expandedPlantId, setExpandedPlantId] = useState(null);

  // Function to toggle grower expansion
  const toggleGrower = (growerId) => {
    setExpandedGrowerId(prevId => (prevId === growerId ? null : growerId));
    // Collapse any expanded plant when a new grower is toggled
    setExpandedPlantId(null);
  };

  // Function to toggle plant details expansion
  const togglePlant = (plantId) => {
    setExpandedPlantId(prevId => (prevId === plantId ? null : plantId));
  };


  useEffect(() => {
    // IMPORTANT: For collectionGroup queries, you MUST create an index in your Firestore console.
    // Go to Firebase Console -> Firestore Database -> Indexes tab.
    // Create a new index with:
    // Collection ID: 'plants' (or whatever your exact subcollection name is)
    // Query Scope: 'Collection group'
    // Fields: You can leave blank, or add 'name' (Ascending) if you want to sort plants by name.

    // Optional: Add orderBy to the query for consistent sorting of plants
    const plantsQuery = query(collectionGroup(db, 'plants'));

    const unsubscribe = onSnapshot(plantsQuery, (snapshot) => {
      const allPlants = snapshot.docs.map(doc => {
        const parentGrowerRef = doc.ref.parent.parent;
        return {
          id: doc.id, // This is the plant ID
          parentGrowerId: parentGrowerRef ? parentGrowerRef.id : 'N/A', // Get the grower's userId
          ...doc.data(), // Spread all plant details
        };
      });

      // Group plants by parentGrowerId
      const groupedPlants = allPlants.reduce((acc, plant) => {
        const growerId = plant.parentGrowerId;
        if (!acc[growerId]) {
          acc[growerId] = [];
        }
        acc[growerId].push(plant);
        return acc;
      }, {});

      // Convert the grouped object into an array for easier rendering
      const finalGroupedData = Object.keys(groupedPlants).map(growerId => ({
        growerId,
        plants: groupedPlants[growerId],
      }));

      setPlantLogs(finalGroupedData);
    }, (error) => {
      console.error("Error fetching plant logs:", error);
      // You might want to set an error state here to display to the user
    });

    return () => unsubscribe();
  }, []); // Empty dependency array means this effect runs once on mount


  // Session logs listener (unchanged from your original code)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'user_logs_UserSessions'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        sessionId: doc.id,
        ...doc.data(),
      }));

      const sortedData = data.sort((a, b) => {
        const timeA = a.loginTime?.seconds || 0;
        const timeB = b.loginTime?.seconds || 0;
        return timeB - timeA;
      });

      setSessionLogs(sortedData);
    });

    return () => unsubscribe();
  }, []);

  // Screen logs listener (unchanged from your original code)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'user_logs_ScreenVisited'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        visitId: doc.id,
        userId: doc.data().userId || '—',
        screenName: doc.data().screenName || 'N/A',
        timestamp: doc.data().timestamp,
      }));

      const sortedData = data.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });

      setScreenLogs(sortedData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="user-records-container">
      <div className="back-button" onClick={() => navigate(-1)}>← Back</div>
      <h2>User Logs</h2>
    
      <div className="tab-buttons">
        <button className={activeTab === 'login' ? 'active' : ''} onClick={() => setActiveTab('login')}>
          Session Logs
        </button>
        <button className={activeTab === 'screen' ? 'active' : ''} onClick={() => setActiveTab('screen')}>
          Screen Logs
        </button>
        <button className={activeTab === 'plant' ? 'active' : ''} onClick={() => setActiveTab('plant')}>
          Plant Logs
        </button>
      </div>

      {/* Session Logs Table (unchanged) */}
      {activeTab === 'login' && (
        <div className="table-wrapper"> {/* Added table-wrapper for consistent styling */}
          <table className="records-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Email</th>
                <th>Login Date</th>
                <th>Login Time</th>
                <th>Logout Date</th>
                <th>Logout Time</th>
              </tr>
            </thead>
            <tbody>
              {sessionLogs.map(log => (
                <tr key={log.sessionId}>
                  <td>{log.sessionId}</td>
                  <td>{log.userEmail || '—'}</td>
                  <td>{log.loginTime?.toDate ? log.loginTime.toDate().toLocaleDateString() : '—'}</td>
                  <td>
                    {log.loginTime?.seconds
                      ? new Date(log.loginTime.seconds * 1000).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })
                      : '—'}
                  </td>
                  <td>{log.logoutTime?.toDate ? log.logoutTime.toDate().toLocaleDateString() : '—'}</td>
                  <td>
                    {log.logoutTime?.seconds
                      ? new Date(log.logoutTime.seconds * 1000).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Screen Logs Table (unchanged) */}
      {activeTab === 'screen' && (
        <div className="table-wrapper"> {/* Added table-wrapper for consistent styling */}
          <table className="records-table">
            <thead>
              <tr>
                <th>Visit ID</th>
                <th>User ID</th>
                <th>Screen Name</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {screenLogs.map(log => (
                <tr key={log.visitId}>
                  <td>{log.visitId}</td>
                  <td>{log.userId}</td>
                  <td>{log.screenName}</td>
                  <td>
                    {log.timestamp?.seconds
                      ? new Date(log.timestamp.seconds * 1000).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plant Logs Section (Nested Expandable Tables) */}
      {activeTab === 'plant' && (
        <div className="plant-logs-section">
          {plantLogs.length === 0 ? (
            <p>No plant logs found.</p>
          ) : (
            <div className="table-wrapper"> {/* Outer table-wrapper for consistent styling */}
              <table className="records-table">
                <thead>
                  <tr>
                    <th className="expand-cell-header"></th> {/* Header for expand icon - NOW FIRST */}
                    <th>User ID</th>
                  </tr>
                </thead>
                <tbody>
                  {plantLogs.map(growerGroup => (
                    <React.Fragment key={growerGroup.growerId}>
                      <tr className="hoverable-row" onClick={() => toggleGrower(growerGroup.growerId)}>
                        <td className="expand-cell"> {/* Cell for expand icon - NOW FIRST */}
                          <span className="expand-icon">
                            {expandedGrowerId === growerGroup.growerId ? '▲' : '▼'}
                          </span>
                        </td>
                        <td>{growerGroup.growerId}</td>
                      </tr>
                      {expandedGrowerId === growerGroup.growerId && (
                        <tr className="expanded-row">
                          <td colSpan="2"> {/* colSpan matches outer table columns */}
                            <div className="inner-table-wrapper"> {/* New wrapper for inner table */}
                              <table className="records-table inner-records-table"> {/* Inner table for plants */}
                                <thead>
                                  <tr>
                                    <th></th> {/* For 3 dots icon - NOW FIRST */}
                                    <th>Plant Name</th>
                                    <th>Plant Type</th>
                                    <th>Plant ID</th>
                                    {/* Add other common plant fields here */}
                                  </tr>
                                </thead>
                                <tbody>
                                  {growerGroup.plants.map(plant => (
                                    <React.Fragment key={plant.id}>
                                      <tr className="hoverable-row" onClick={() => togglePlant(plant.id)}>
                                        <td><span className="menu-icon">⋮</span></td> {/* 3 dots icon - NOW FIRST */}
                                        <td>{plant.name || 'N/A'}</td>
                                        <td>{plant.type || 'N/A'}</td>
                                        <td>{plant.id}</td>
                                      </tr>
                                      {expandedPlantId === plant.id && (
                                        <tr className="expanded-row">
                                          <td colSpan="4"> {/* colSpan matches inner table columns */}
                                            <div className="plant-details-display">
                                              {/* Detailed plant info - MODIFIED HERE */}
                                              <p><strong>Plant Name:</strong> {plant.name || 'N/A'}</p>
                                              <p><strong>Plant ID:</strong> {plant.id}</p>
                                              <p><strong>Sensor ID:</strong> {plant.sensorId || 'N/A'}</p> {/* Assuming 'sensorId' field */}
                                              <p><strong>Plant Type:</strong> {plant.type || 'N/A'}</p>
                                              <p><strong>Date Added:</strong>
                                                {plant.timestamp?.toDate // Assuming 'timestamp' is the date added
                                                  ? plant.timestamp.toDate().toLocaleDateString()
                                                  : 'N/A'}
                                              </p>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserLogsPage;
