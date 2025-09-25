import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaClock, FaCloudRain, FaCloudSun, FaEye, FaFlask, FaList, FaMicrochip, FaTemperatureHigh, FaTimes, FaTint, FaUser, FaWater } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import { auth, db } from '../../../firebase';
import '../../../styles/UserRecordsPage.css';


const SensorLogsPage = () => {
  const [activeTab, setActiveTab] = useState('kits');
  const [showModal, setShowModal] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  // Role and user info
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState("");
  const navigate = useNavigate();

  // Hardcoded Sensor Kits
  const sensorKits = [
    { id: 'SK-001', isActive: true, uid: 'user123' },
    { id: 'SK-002', isActive: false, uid: 'user456' },
  ];

  // Hardcoded Sensor Logs
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
          <FaFlask style={{ marginRight: 4 }} /> Logs
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
              <th style={{ width: "100px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sensorKits.map((kit, index) => (
              <tr key={index}>
                <td>{kit.id}</td>
                <td>
                  {kit.isActive
                    ? <span style={{ color: "#4CAF50", fontWeight: "bold" }}><FaCheckCircle /> Yes</span>
                    : <span style={{ color: "#F44336", fontWeight: "bold" }}><FaTimes /> No</span>
                  }
                </td>
                <td>{kit.uid}</td>
                <td style={{ textAlign: "center" }}>
                  <button 
                    className="view-btn"
                    onClick={() => openModal(kit)}
                    style={{
                      background: "#4CAF50",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "14px",
                      fontWeight: "500"
                    }}
                  >
                    <FaEye /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Sensor Logs Table */}
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
              <th style={{ width: "100px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sensorSessions.map((session, index) => (
              <tr key={index}>
                <td>{session.skid}</td>
                <td>{session.uid}</td>
                <td>{session.sensorType}</td>
                <td>{session.ph}</td>
                <td>{session.tds}</td>
                <td>{session.waterTemp}</td>
                <td>{session.airTemp}</td>
                <td>{session.humidity}</td>
                <td>{session.timestamp}</td>
                <td style={{ textAlign: "center" }}>
                  <button 
                    className="view-btn"
                    onClick={() => openModal(session)}
                    style={{
                      background: "#4CAF50",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "14px",
                      fontWeight: "500"
                    }}
                  >
                    <FaEye /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal for displaying sensor information */}
      {showModal && selectedData && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {activeTab === 'kits' ? 'Sensor Kit Details' : 'Sensor Log Details'}
              </h3>
              <button className="close-modal-btn" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              {activeTab === 'kits' ? (
                <div className="sensor-details">
                  <div className="detail-item">
                    <FaMicrochip style={{ color: "#4CAF50", marginRight: "8px" }} />
                    <strong>Sensor Kit ID:</strong> {selectedData.id}
                  </div>
                  <div className="detail-item">
                    <FaCheckCircle style={{ color: selectedData.isActive ? "#4CAF50" : "#F44336", marginRight: "8px" }} />
                    <strong>Status:</strong> {selectedData.isActive ? "Active" : "Inactive"}
                  </div>
                  <div className="detail-item">
                    <FaUser style={{ color: "#4CAF50", marginRight: "8px" }} />
                    <strong>User ID:</strong> {selectedData.uid}
                  </div>
                </div>
              ) : (
                <div className="sensor-details">
                  <div className="detail-item">
                    <FaMicrochip style={{ color: "#4CAF50", marginRight: "8px" }} />
                    <strong>Sensor Kit ID:</strong> {selectedData.skid}
                  </div>
                  <div className="detail-item">
                    <FaUser style={{ color: "#4CAF50", marginRight: "8px" }} />
                    <strong>User ID:</strong> {selectedData.uid}
                  </div>
                  <div className="detail-item">
                    <FaFlask style={{ color: "#4CAF50", marginRight: "8px" }} />
                    <strong>Sensor Type:</strong> {selectedData.sensorType}
                  </div>
                  <div className="detail-item">
                    <FaTint style={{ color: "#4CAF50", marginRight: "8px" }} />
                    <strong>pH:</strong> {selectedData.ph}
                  </div>
                  <div className="detail-item">
                    <FaWater style={{ color: "#4CAF50", marginRight: "8px" }} />
                    <strong>TDS:</strong> {selectedData.tds} ppm
                  </div>
                  <div className="detail-item">
                    <FaTemperatureHigh style={{ color: "#4CAF50", marginRight: "8px" }} />
                    <strong>Water Temperature:</strong> {selectedData.waterTemp} °C
                  </div>
                  <div className="detail-item">
                    <FaCloudSun style={{ color: "#4CAF50", marginRight: "8px" }} />
                    <strong>Air Temperature:</strong> {selectedData.airTemp} °C
                  </div>
                  <div className="detail-item">
                    <FaCloudRain style={{ color: "#4CAF50", marginRight: "8px" }} />
                    <strong>Humidity:</strong> {selectedData.humidity} %
                  </div>
                  <div className="detail-item">
                    <FaClock style={{ color: "#4CAF50", marginRight: "8px" }} />
                    <strong>Timestamp:</strong> {selectedData.timestamp}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={closeModal}>
                <FaTimes style={{ marginRight: 4 }} /> Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SensorLogsPage;
