import { collection, collectionGroup, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../firebase';
import '../../../styles/UserRecordsPage.css';

const UserLogsPage = () => {
  const [sessionLogs, setSessionLogs] = useState([]);
  const [screenLogs, setScreenLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('login');
  const [users, setUsers] = useState([]); // <-- Add this for user records
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
    setExpandedPlantId(null);
  };

  // Function to toggle plant details expansion
  const togglePlant = (plantId) => {
    setExpandedPlantId(prevId => (prevId === plantId ? null : plantId));
  };

  // Fetch user records for the User Records tab
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const plantsQuery = query(collectionGroup(db, 'plants'));
    const unsubscribe = onSnapshot(plantsQuery, (snapshot) => {
      const allPlants = snapshot.docs.map(doc => {
        const parentGrowerRef = doc.ref.parent.parent;
        return {
          id: doc.id,
          parentGrowerId: parentGrowerRef ? parentGrowerRef.id : 'N/A',
          ...doc.data(),
        };
      });
      const groupedPlants = allPlants.reduce((acc, plant) => {
        const growerId = plant.parentGrowerId;
        if (!acc[growerId]) {
          acc[growerId] = [];
        }
        acc[growerId].push(plant);
        return acc;
      }, {});
      const finalGroupedData = Object.keys(groupedPlants).map(growerId => ({
        growerId,
        plants: groupedPlants[growerId],
      }));
      setPlantLogs(finalGroupedData);
    }, (error) => {
      console.error("Error fetching plant logs:", error);
    });
    return () => unsubscribe();
  }, []);

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
        <button className={activeTab === 'userrecords' ? 'active' : ''} onClick={() => setActiveTab('userrecords')}>
          User Records
        </button>
      </div>

      {/* Session Logs Table */}
      {activeTab === 'login' && (
        <div className="table-wrapper">
          <table className="records-table">
            <thead>
              <tr>
                <th>Session ID</th>
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

      {/* Screen Logs Table */}
      {activeTab === 'screen' && (
        <div className="table-wrapper">
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

      {/* Plant Logs Section */}
      {activeTab === 'plant' && (
        <div className="plant-logs-section">
          {plantLogs.length === 0 ? (
            <p>No plant logs found.</p>
          ) : (
            <div className="table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th className="expand-cell-header"></th>
                    <th>User ID</th>
                  </tr>
                </thead>
                <tbody>
                  {plantLogs.map(growerGroup => (
                    <React.Fragment key={growerGroup.growerId}>
                      <tr className="hoverable-row" onClick={() => toggleGrower(growerGroup.growerId)}>
                        <td className="expand-cell">
                          <span className="expand-icon">
                            {expandedGrowerId === growerGroup.growerId ? '▲' : '▼'}
                          </span>
                        </td>
                        <td>{growerGroup.growerId}</td>
                      </tr>
                      {expandedGrowerId === growerGroup.growerId && (
                        <tr className="expanded-row">
                          <td colSpan="2">
                            <div className="inner-table-wrapper">
                              <table className="records-table inner-records-table">
                                <thead>
                                  <tr>
                                    <th></th>
                                    <th>Plant Name</th>
                                    <th>Plant Type</th>
                                    <th>Plant ID</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {growerGroup.plants.map(plant => (
                                    <React.Fragment key={plant.id}>
                                      <tr className="hoverable-row" onClick={() => togglePlant(plant.id)}>
                                        <td><span className="menu-icon">⋮</span></td>
                                        <td>{plant.name || 'N/A'}</td>
                                        <td>{plant.type || 'N/A'}</td>
                                        <td>{plant.id}</td>
                                      </tr>
                                      {expandedPlantId === plant.id && (
                                        <tr className="expanded-row">
                                          <td colSpan="4">
                                            <div className="plant-details-display">
                                              <p><strong>Plant Name:</strong> {plant.name || 'N/A'}</p>
                                              <p><strong>Plant ID:</strong> {plant.id}</p>
                                              <p><strong>Sensor ID:</strong> {plant.sensorId || 'N/A'}</p>
                                              <p><strong>Plant Type:</strong> {plant.type || 'N/A'}</p>
                                              <p><strong>Date Added:</strong>
                                                {plant.timestamp?.toDate
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

      {/* User Records Table */}
      {activeTab === 'userrecords' && (
        <div className="table-wrapper">
          <table className="records-table">
            <thead>
              <tr>
                <th>UID</th>
                <th>Name</th>
                <th>Username</th>
                <th>Phone Number</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.uid}>
                  <td>{user.uid}</td>
                  <td>{user.name || 'N/A'}</td>
                  <td>{user.username || 'N/A'}</td>
                  <td>{user.contact || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserLogsPage;