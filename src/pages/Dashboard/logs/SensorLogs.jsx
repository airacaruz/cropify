import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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


  const openModal = (data) => {
    setSelectedData(data);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedData(null);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPosition = margin;
    
    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace = 20) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Sensor Logs Report', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Comprehensive sensor kit and session data', margin, yPosition);
    yPosition += 15;

    // Sensor Kits Section
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Sensor Kits', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Kits: ${sensorKits.length}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Active Kits: ${sensorKits.filter(kit => kit.isActive).length}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Inactive Kits: ${sensorKits.filter(kit => !kit.isActive).length}`, margin, yPosition);
    yPosition += 10;

    // Sensor Kits Table
    checkPageBreak(40);
    const kitsTableData = sensorKits.map(kit => [
      kit.id,
      kit.isActive ? 'Yes' : 'No',
      kit.uid
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['Sensor Kit ID', 'Is Active', 'UID']],
      body: kitsTableData,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30 },
        2: { cellWidth: 50 }
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fontSize: 9,
        fontStyle: 'bold',
        fillColor: [76, 175, 80]
      }
    });

    // Sensor Sessions Section
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Sensor Sessions', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Sessions: ${sensorSessions.length}`, margin, yPosition);
    yPosition += 10;

    // Sensor Sessions Table
    checkPageBreak(40);
    const sessionsTableData = sensorSessions.map(session => [
      session.skid,
      session.uid,
      session.sensorType,
      session.ph,
      session.tds,
      session.waterTemp,
      session.airTemp,
      session.humidity,
      session.timestamp
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['Kit ID', 'UID', 'Type', 'pH', 'TDS', 'Water Temp', 'Air Temp', 'Humidity', 'Timestamp']],
      body: sessionsTableData,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 20 },
        2: { cellWidth: 15 },
        3: { cellWidth: 15 },
        4: { cellWidth: 15 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 20 },
        8: { cellWidth: 30 }
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fontSize: 8,
        fontStyle: 'bold',
        fillColor: [76, 175, 80]
      }
    });

    // Add footer to all pages
    const pageCount = doc.internal.getNumberOfPages();
    const generatedDateTime = `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, margin, pageHeight - 10);
      doc.text('Cropify Sensor Logs Report', pageWidth - 80, pageHeight - 10);
      doc.text(generatedDateTime, margin, pageHeight - 20);
    }

    doc.save('Cropify_Sensor_Logs_Report.pdf');
  };

  return (
    <div className="user-records-container">
      <Navbar role={role} adminName={adminName} adminId={uid} onPrintSummary={exportToPDF} />

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
                {activeTab === 'kits' ? 'Sensor Kit Details' : 'Sensor Session Details'}
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
