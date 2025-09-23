import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaClock, FaCloudRain, FaCloudSun, FaEye, FaFlask, FaList, FaMicrochip, FaTemperatureHigh, FaTimes, FaTint, FaUser, FaWater } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import { auth, db } from '../../../firebase';
import '../../../styles/UserRecordsPage.css';
import { adminAuditActions } from '../../../utils/adminAuditLogger';

const exportSensorLogsPDF = async ({
    sensorKits,
    sensorSessions,
    totalKits,
    activeKits,
    inactiveKits,
    totalSessions
}) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    
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

    // Add title page
    doc.setFontSize(24);
    doc.text('Cropify Sensor Logs Report', margin, yPosition);
    yPosition += 15;
    
    doc.setFontSize(12);
    doc.text('Comprehensive sensor kit and session data for Cropify platform', margin, yPosition);
    yPosition += 30;

    // Add Executive Summary
    doc.setFontSize(16);
    doc.text('Executive Summary', 20, yPosition);
    yPosition += 15;
    
    doc.setFontSize(11);
    const summaryText = [
        'This report provides a comprehensive analysis of sensor logs within the Cropify platform,',
        'including sensor kit management, session data, and environmental monitoring.',
        'Key findings include sensor performance metrics, data collection statistics,',
        'and detailed sensor information for system optimization and monitoring.'
    ];
    
    summaryText.forEach(line => {
        doc.text(line, 20, yPosition);
        yPosition += 6;
    });
    
    yPosition += 15;

    // Add Key Performance Indicators (KPIs) Section
    doc.setFontSize(16);
    doc.text('Key Performance Indicators (KPIs)', 20, yPosition);
    yPosition += 15;
    
    const kpiTableData = [
        ['Metric', 'Current Value', 'Trend', 'Status'],
        ['Total Sensor Kits', totalKits.toString(), 'Active', 'Active'],
        ['Active Kits', activeKits.toString(), 'Operational', 'Good'],
        ['Inactive Kits', inactiveKits.toString(), 'Maintenance', 'Needs Attention'],
        ['Total Sessions', totalSessions.toString(), 'Growing', 'Active']
    ];
    
    autoTable(doc, {
        head: [kpiTableData[0]],
        body: kpiTableData.slice(1),
        startY: yPosition,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [76, 175, 80] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    yPosition = doc.lastAutoTable.finalY + 20;

    // Add Sensor Kits Analytics Section
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.text('Sensor Kits Analytics & Management', margin, yPosition);
    yPosition += 15;
    
    if (sensorKits && sensorKits.length > 0) {
        const kitUtilizationRate = totalKits > 0 ? ((activeKits / totalKits) * 100).toFixed(1) : 0;
        
        doc.setFontSize(12);
        doc.text('Sensor Kit Analysis:', margin, yPosition);
        yPosition += 10;
        
        const kitMetrics = [
            `• Total sensor kits deployed: ${totalKits}`,
            `• Active kits: ${activeKits} (${kitUtilizationRate}% utilization)`,
            `• Inactive kits: ${inactiveKits} (${totalKits > 0 ? ((inactiveKits / totalKits) * 100).toFixed(1) : 0}% maintenance)`,
            `• Kit operational status: ${activeKits > inactiveKits ? 'Good' : 'Needs Attention'}`
        ];
        
        kitMetrics.forEach(metric => {
            checkPageBreak(8);
            doc.text(metric, margin + 5, yPosition);
            yPosition += 7;
        });
        
        yPosition += 15;
        
        // Enhanced sensor kits table
        const kitTableData = sensorKits.map(kit => [
            kit.id,
            kit.isActive ? 'Yes' : 'No',
            kit.uid
        ]);
        
        autoTable(doc, {
            head: [['Sensor Kit ID', 'Is Active', 'UID']],
            body: kitTableData,
            startY: yPosition,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [76, 175, 80] },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        
        yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Add Sensor Sessions Analytics Section
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.text('Sensor Sessions Analytics & Data Collection', margin, yPosition);
    yPosition += 15;
    
    if (sensorSessions && sensorSessions.length > 0) {
        // Calculate sensor statistics
        const avgPH = (sensorSessions.reduce((sum, s) => sum + s.ph, 0) / sensorSessions.length).toFixed(2);
        const avgTDS = (sensorSessions.reduce((sum, s) => sum + s.tds, 0) / sensorSessions.length).toFixed(0);
        const avgWaterTemp = (sensorSessions.reduce((sum, s) => sum + s.waterTemp, 0) / sensorSessions.length).toFixed(1);
        const avgAirTemp = (sensorSessions.reduce((sum, s) => sum + s.airTemp, 0) / sensorSessions.length).toFixed(1);
        const avgHumidity = (sensorSessions.reduce((sum, s) => sum + s.humidity, 0) / sensorSessions.length).toFixed(1);
        
        doc.setFontSize(12);
        doc.text('Sensor Performance Summary:', margin, yPosition);
        yPosition += 10;
        
        const sensorMetrics = [
            `• Total sensor readings: ${totalSessions}`,
            `• Average pH Level: ${avgPH} (Optimal: 5.5-7.5)`,
            `• Average TDS: ${avgTDS} ppm (Optimal: 500-1500)`,
            `• Average Water Temperature: ${avgWaterTemp}°C (Optimal: 18-24°C)`,
            `• Average Air Temperature: ${avgAirTemp}°C (Optimal: 20-26°C)`,
            `• Average Humidity: ${avgHumidity}% (Optimal: 40-70%)`
        ];
        
        sensorMetrics.forEach(metric => {
            checkPageBreak(8);
            doc.text(metric, margin + 5, yPosition);
            yPosition += 7;
        });
        
        yPosition += 15;
        
        // Enhanced sensor sessions table (showing first 15 records)
        const sessionTableData = sensorSessions.slice(0, 15).map(session => [
            session.skid,
            session.uid,
            session.sensorType,
            session.ph.toFixed(2),
            session.tds.toString(),
            `${session.waterTemp.toFixed(1)}°C`,
            `${session.airTemp.toFixed(1)}°C`,
            `${session.humidity.toFixed(1)}%`,
            session.timestamp
        ]);
        
        autoTable(doc, {
            head: [['Kit ID', 'UID', 'Type', 'pH', 'TDS', 'Water Temp', 'Air Temp', 'Humidity', 'Timestamp']],
            body: sessionTableData,
            startY: yPosition,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [76, 175, 80] },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        
        if (sensorSessions.length > 15) {
            yPosition = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.text(`* Showing first 15 of ${sensorSessions.length} total sensor readings`, margin, yPosition);
        }
        
        yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Add Insights & Recommendations Section
    doc.setFontSize(16);
    doc.text('Insights & Recommendations', 20, yPosition);
    yPosition += 15;
    
    if (sensorKits && sensorKits.length > 0) {
        doc.setFontSize(11);
        const insights = [
            '• Monitor sensor kit utilization rates to optimize deployment',
            '• Regular maintenance scheduling for inactive sensor kits',
            '• Analyze sensor data trends to identify environmental patterns',
            '• Review sensor performance metrics for system optimization',
            '• Maintain sensor calibration schedules for accurate readings'
        ];
        
        insights.forEach(insight => {
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 30;
            }
            doc.text(`• ${insight}`, 20, yPosition);
            yPosition += 8;
        });
    } else {
        doc.setFontSize(11);
        doc.text('• Continue monitoring sensor performance for optimal system operation', 20, yPosition);
        yPosition += 8;
        doc.text('• Maintain current sensor management practices for data accuracy', 20, yPosition);
        yPosition += 8;
        doc.text('• Consider expanding sensor coverage based on usage patterns', 20, yPosition);
    }
    
    yPosition += 20;

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

const SensorLogsPage = () => {
  const [activeTab, setActiveTab] = useState('kits');
  const [showModal, setShowModal] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);

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

  const handlePrintConfirm = async () => {
    // Log the print action
    if (uid && adminName) {
      await adminAuditActions.custom(uid, adminName, 'click', 'Admin printed sensor logs summary');
    }
    
    // Calculate sensor metrics
    const totalKits = sensorKits.length;
    const activeKits = sensorKits.filter(kit => kit.isActive).length;
    const inactiveKits = sensorKits.filter(kit => !kit.isActive).length;
    const totalSessions = sensorSessions.length;
    
    exportSensorLogsPDF({
      sensorKits,
      sensorSessions,
      totalKits,
      activeKits,
      inactiveKits,
      totalSessions
    });
    setShowPrintConfirmModal(false);
  };

  const handlePrintCancel = () => {
    setShowPrintConfirmModal(false);
  };

  const handlePrintSummary = () => {
    setShowPrintConfirmModal(true);
  };

  return (
    <div className="user-records-container">
      <Navbar role={role} adminName={adminName} adminId={uid} onPrintSummary={handlePrintSummary} />

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

      {/* Print Confirmation Modal */}
      {showPrintConfirmModal && (
        <div className="modal-overlay" onClick={handlePrintCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Print Sensor Logs Summary</h3>
              <button className="close-modal-btn" onClick={handlePrintCancel}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to print the sensor logs summary?</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                This will generate a PDF file with all sensor kit and session data.
              </p>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={handlePrintCancel}>
                Cancel
              </button>
              <button 
                className="save-btn" 
                onClick={handlePrintConfirm}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  marginLeft: '10px'
                }}
              >
                Print Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorLogsPage;
