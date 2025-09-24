import { onAuthStateChanged } from 'firebase/auth';
import { collection, collectionGroup, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FaBarcode, FaCalendarAlt, FaChevronDown, FaChevronUp, FaDesktop, FaIdBadge, FaLeaf, FaSeedling, FaSignInAlt, FaUser } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import { auth, db } from '../../../firebase';
import '../../../styles/UserRecordsPage.css';


const UserLogsPage = () => {
  const [sessionLogs, setSessionLogs] = useState([]);
  const [screenLogs, setScreenLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('login');
  const [plantLogs, setPlantLogs] = useState([]);
  const [expandedGrowerId, setExpandedGrowerId] = useState(null);
  const [expandedPlantId, setExpandedPlantId] = useState(null);

  // Role and user info
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState(null);
  const [isAdminUid, setIsAdminUid] = useState(false);

  const navigate = useNavigate();

  // Auth and role fetch (using uid and Firestore reference)
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
            if (data.role === "admin") setIsAdminUid(true);
          });
        } else {
          setRole("unknown");
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Plant logs
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

  // Session logs
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

  // Screen logs
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



  // Only allow superadmin and admin with UID to view
  if (role !== "superadmin" && !isAdminUid) {
    return (
      <div className="loading-container">
        <Navbar role={role} adminName={adminName} adminId={uid} />
        <p>Access denied. Only Super Admin and Admin can view this page.</p>
      </div>
    );
  }

  // UI
  return (
    <div className="user-records-container">
      <Navbar role={role} adminName={adminName} />
    
      <div className="tab-buttons">
        <button className={activeTab === 'login' ? 'active' : ''} onClick={() => setActiveTab('login')}>
          <FaSignInAlt style={{ marginRight: 4 }} /> Session Logs
        </button>
        <button className={activeTab === 'screen' ? 'active' : ''} onClick={() => setActiveTab('screen')}>
          <FaDesktop style={{ marginRight: 4 }} /> Screen Logs
        </button>
        <button className={activeTab === 'plant' ? 'active' : ''} onClick={() => setActiveTab('plant')}>
          <FaSeedling style={{ marginRight: 4 }} /> Plant Logs
        </button>
      </div>

      {/* Session Logs Table */}
      {activeTab === 'login' && (
        <div className="table-wrapper">
          <table className="records-table">
            <thead>
              <tr>
                <th><FaIdBadge /> Session ID</th>
                <th><FaCalendarAlt /> Login Date</th>
                <th>Login Time</th>
                <th><FaCalendarAlt /> Logout Date</th>
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
                <th><FaIdBadge /> Visit ID</th>
                <th><FaUser /> User ID</th>
                <th><FaDesktop /> Screen Name</th>
                <th><FaCalendarAlt /> Timestamp</th>
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
                    <th><FaUser /> User ID</th>
                  </tr>
                </thead>
                <tbody>
                  {plantLogs.map(growerGroup => (
                    <React.Fragment key={growerGroup.growerId}>
                      <tr className="hoverable-row" onClick={() => setExpandedGrowerId(prevId => (prevId === growerGroup.growerId ? null : growerGroup.growerId))}>
                        <td className="expand-cell">
                          <span className="expand-icon">
                            {expandedGrowerId === growerGroup.growerId ? <FaChevronUp /> : <FaChevronDown />}
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
                                    <th><FaLeaf /> Plant Name</th>
                                    <th>Plant Type</th>
                                    <th><FaBarcode /> Plant ID</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {growerGroup.plants.map(plant => (
                                    <React.Fragment key={plant.id}>
                                      <tr className="hoverable-row" onClick={() => setExpandedPlantId(prevId => (prevId === plant.id ? null : plant.id))}>
                                        <td><span className="menu-icon">⋮</span></td>
                                        <td>{plant.name || 'N/A'}</td>
                                        <td>{plant.type || 'N/A'}</td>
                                        <td>{plant.id}</td>
                                      </tr>
                                      {expandedPlantId === plant.id && (
                                        <tr className="expanded-row">
                                          <td colSpan="4">
                                            <div className="plant-details-display">
                                              <p><FaLeaf /> <strong>Plant Name:</strong> {plant.name || 'N/A'}</p>
                                              <p><FaBarcode /> <strong>Plant ID:</strong> {plant.id}</p>
                                              <p><FaIdBadge /> <strong>Sensor ID:</strong> {plant.sensorId || 'N/A'}</p>
                                              <p><FaSeedling /> <strong>Plant Type:</strong> {plant.type || 'N/A'}</p>
                                              <p><FaCalendarAlt /> <strong>Date Added:</strong>
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

    </div>
  );
};


export default UserLogsPage;