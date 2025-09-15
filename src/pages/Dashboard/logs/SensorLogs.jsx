import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaChevronDown, FaChevronUp, FaClock, FaCloudRain, FaCloudSun, FaFlask, FaList, FaMicrochip, FaTemperatureHigh, FaTimesCircle, FaTint, FaUser, FaWater } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import { auth, db } from '../../../firebase';
import '../../../styles/UserRecordsPage.css';

const SensorLogsPage = () => {
  const [activeTab, setActiveTab] = useState('kits');
  const [expandedKitRow, setExpandedKitRow] = useState(null);
  const [expandedSessionRow, setExpandedSessionRow] = useState(null);

  // Role and user info
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState(null);
  const navigate = useNavigate();

  // Hardcoded Sensor Kits
  const sensorKits = [
    { id: 'SK-001', isActive: true, uid: 'user123' },
    { id: 'SK-002', isActive: false, uid: 'user456' },
  ];

  // Hardcoded Sensor Sessions
  const sensorSessions = [
    {
      skid: 'SK-001',
      uid: 'user123',
      sensorType: 'All',
      ph: 6.4,
      tds: 800,
      waterTemp: 22.5,
      airTemp: 26.1,
      humidity: 60,
      timestamp: '2025-05-15 14:30',
    },
    {
      skid: 'SK-002',
      uid: 'user456',
      sensorType: 'All',
      ph: 6.9,
      tds: 900,
      waterTemp: 23.0,
      airTemp: 25.7,
      humidity: 55,
      timestamp: '2025-05-15 13:45',
    },
  ];

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
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Access control for admin
  if (role === "admin") {
    return (
      <div className="loading-container">
        <Navbar role={role} />
        <p>Access denied. Only Super Admin can view this page.</p>
      </div>
    );
  }

  const toggleKitExpand = (index) => {
    setExpandedKitRow(expandedKitRow === index ? null : index);
  };

  const toggleSessionExpand = (index) => {
    setExpandedSessionRow(expandedSessionRow === index ? null : index);
  };

  return (
    <div className="user-records-container">
      <Navbar role={role} />

      <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FaMicrochip style={{ color: "#4CAF50" }} /> Sensor Logs
      </h2>

      <div className="tab-buttons">
        <button
          className={activeTab === 'kits' ? 'active' : ''}
          onClick={() => setActiveTab('kits')}
        >
          <FaList style={{ marginRight: 4 }} /> Sensor Kits
        </button>
        <button
          className={activeTab === 'sessions' ? 'active' : ''}
          onClick={() => setActiveTab('sessions')}
        >
          <FaFlask style={{ marginRight: 4 }} /> Sensor Sessions
        </button>
      </div>

      {/* Sensor Kits Table */}
      {activeTab === 'kits' && (
        <table className="records-table">
          <thead>
            <tr>
              <th><FaMicrochip /> Sensor Kit ID</th>
              <th><FaCheckCircle /> Is Active</th>
              <th><FaUser /> UID</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sensorKits.map((kit, index) => (
              <React.Fragment key={index}>
                <tr onClick={() => toggleKitExpand(index)} className="hoverable-row">
                  <td>
                    <span className="menu-icon">⋮</span> {kit.id}
                  </td>
                  <td>
                    {kit.isActive
                      ? <span style={{ color: "#4CAF50", fontWeight: "bold" }}><FaCheckCircle /> Yes</span>
                      : <span style={{ color: "#F44336", fontWeight: "bold" }}><FaTimesCircle /> No</span>
                    }
                  </td>
                  <td>{kit.uid}</td>
                  <td>
                    {expandedKitRow === index
                      ? <FaChevronUp />
                      : <FaChevronDown />}
                  </td>
                </tr>
                {expandedKitRow === index && (
                  <tr className="expanded-row">
                    <td colSpan="4">
                      <div className="view-only-details">
                        <p><FaMicrochip /> <strong>Sensor Kit ID:</strong> {kit.id}</p>
                        <p>
                          {kit.isActive
                            ? <span style={{ color: "#4CAF50" }}><FaCheckCircle /> Active</span>
                            : <span style={{ color: "#F44336" }}><FaTimesCircle /> Inactive</span>
                          }
                        </p>
                        <p><FaUser /> <strong>UID:</strong> {kit.uid}</p>
                        <button className="close-btn" onClick={() => setExpandedKitRow(null)}>
                          <FaTimesCircle style={{ marginRight: 4 }} /> Close
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      {/* Sensor Sessions Table */}
      {activeTab === 'sessions' && (
        <table className="records-table">
          <thead>
            <tr>
              <th><FaMicrochip /> Sensor Kit ID</th>
              <th><FaUser /> UID</th>
              <th><FaFlask /> Sensor Type</th>
              <th><FaTint /> pH</th>
              <th><FaWater /> TDS (ppm)</th>
              <th><FaTemperatureHigh /> Water Temp (°C)</th>
              <th><FaCloudSun /> Air Temp (°C)</th>
              <th><FaCloudRain /> Humidity (%)</th>
              <th><FaClock /> Timestamp</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sensorSessions.map((session, index) => (
              <React.Fragment key={index}>
                <tr onClick={() => toggleSessionExpand(index)} className="hoverable-row">
                  <td><span className="menu-icon">⋮</span> {session.skid}</td>
                  <td>{session.uid}</td>
                  <td>{session.sensorType}</td>
                  <td>{session.ph}</td>
                  <td>{session.tds}</td>
                  <td>{session.waterTemp}</td>
                  <td>{session.airTemp}</td>
                  <td>{session.humidity}</td>
                  <td>{session.timestamp}</td>
                  <td>
                    {expandedSessionRow === index
                      ? <FaChevronUp />
                      : <FaChevronDown />}
                  </td>
                </tr>
                {expandedSessionRow === index && (
                  <tr className="expanded-row">
                    <td colSpan="10">
                      <div className="view-only-details">
                        <p><FaMicrochip /> <strong>Sensor Kit ID:</strong> {session.skid}</p>
                        <p><FaUser /> <strong>User ID:</strong> {session.uid}</p>
                        <p><FaFlask /> <strong>Sensor Type:</strong> {session.sensorType}</p>
                        <p><FaTint /> <strong>pH:</strong> {session.ph}</p>
                        <p><FaWater /> <strong>TDS:</strong> {session.tds} ppm</p>
                        <p><FaTemperatureHigh /> <strong>Water Temp:</strong> {session.waterTemp} °C</p>
                        <p><FaCloudSun /> <strong>Air Temp:</strong> {session.airTemp} °C</p>
                        <p><FaCloudRain /> <strong>Humidity:</strong> {session.humidity} %</p>
                        <p><FaClock /> <strong>Timestamp:</strong> {session.timestamp}</p>
                        <button className="close-btn" onClick={() => setExpandedSessionRow(null)}>
                          <FaTimesCircle style={{ marginRight: 4 }} /> Close
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SensorLogsPage;