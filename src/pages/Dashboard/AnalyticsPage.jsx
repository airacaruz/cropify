import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffect, useState } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import {
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import '../../styles/Dashboard/AnalyticsPage.css';

function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null); 
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState(null); 
  const [isAdminUid, setIsAdminUid] = useState(false);
  const navigate = useNavigate();

  // Sensor data state
  const [sensorSessions, setSensorSessions] = useState([]);
  // Plant type pie chart state
  const [plantTypeData, setPlantTypeData] = useState([]);
  
  // Print modal state
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
  const [showDownloadSuccessModal, setShowDownloadSuccessModal] = useState(false);

  // ✅ Hardcoded sensor data fallback
  const hardcodedSessions = [
    {
      id: 'demo1',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      ph: 6.8,
      tds: 750,
      waterTemp: 22,
      airTemp: 27,
      humidity: 60,
    },
    {
      id: 'demo2',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      ph: 7.0,
      tds: 800,
      waterTemp: 23,
      airTemp: 28,
      humidity: 65,
    },
    {
      id: 'demo3',
      timestamp: new Date(Date.now() - 259200000).toISOString(),
      ph: 6.7,
      tds: 780,
      waterTemp: 21,
      airTemp: 26,
      humidity: 63,
    },
  ];

  // ✅ Hardcoded plant types fallback
  const hardcodedPlantTypes = [
    { name: "Lettuce", value: 4 },
    { name: "Tomato", value: 1 }
  ];

  useEffect(() => {
    const storedName = localStorage.getItem("adminName");
    setAdminName(storedName || "Admin");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/", { replace: true });
      } else {
        setUid(user.uid);
        // Fetch role from Firestore
        const adminsRef = collection(db, "admins");
        const adminsSnapshot = await getDocs(adminsRef);
        let found = false;
        adminsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.adminId === user.uid) {
            setRole(data.role || "unknown");
            const cleanName = (data.name || "Admin").replace(/\s*\(superadmin\)|\s*\(admin\)/gi, "");
            setAdminName(cleanName);
            found = true;
            if (data.role === "admin") setIsAdminUid(true);
          }
        });
        if (!found) setRole("unknown");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (role !== "superadmin" && !isAdminUid) return;

    // Fetch sensor logs
    const fetchSensorSessions = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'sensor_sessions'));
        const sessions = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            timestamp: data.timestamp?.toDate
              ? data.timestamp.toDate().toISOString()
              : data.timestamp,
            ph: data.ph,
            tds: data.tds,
            waterTemp: data.waterTemp,
            airTemp: data.airTemp,
            humidity: data.humidity,
          };
        });
        const allSessions = [...sessions, ...hardcodedSessions];
        allSessions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setSensorSessions(allSessions);
      } catch (error) {
        setSensorSessions(hardcodedSessions);
      }
    };

    // Fetch plant types
    const fetchPlantTypes = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'user_logs_PlantLogs'));
        const typeCounts = {};
        snapshot.forEach(doc => {
          const plantType = doc.data().plantType || 'Unknown';
          typeCounts[plantType] = (typeCounts[plantType] || 0) + 1;
        });

        let pieData = Object.entries(typeCounts).map(([type, count]) => ({
          name: type,
          value: count,
        }));

        // ✅ fallback if empty
        if (pieData.length === 0) {
          pieData = hardcodedPlantTypes;
        }

        setPlantTypeData(pieData);
      } catch (err) {
        setPlantTypeData(hardcodedPlantTypes);
      }
    };

    fetchSensorSessions();
    fetchPlantTypes();
  }, [role, isAdminUid]);

  // PDF Export function
  const exportAnalyticsPDF = async () => {
    try {
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
      
      // Add title
      doc.setFontSize(20);
      doc.text('Cropify Sensor Analytics Report', margin, yPosition);
      yPosition += 15;
      
      // Add date
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition);
      yPosition += 20;
      
      // Calculate KPIs
      const totalSessions = sensorSessions.length;
      const avgPH = sensorSessions.length > 0 ? (sensorSessions.reduce((sum, s) => sum + s.ph, 0) / sensorSessions.length).toFixed(2) : 0;
      const avgTDS = sensorSessions.length > 0 ? (sensorSessions.reduce((sum, s) => sum + s.tds, 0) / sensorSessions.length).toFixed(0) : 0;
      const avgWaterTemp = sensorSessions.length > 0 ? (sensorSessions.reduce((sum, s) => sum + s.waterTemp, 0) / sensorSessions.length).toFixed(1) : 0;
      const avgAirTemp = sensorSessions.length > 0 ? (sensorSessions.reduce((sum, s) => sum + s.airTemp, 0) / sensorSessions.length).toFixed(1) : 0;
      const avgHumidity = sensorSessions.length > 0 ? (sensorSessions.reduce((sum, s) => sum + s.humidity, 0) / sensorSessions.length).toFixed(1) : 0;
      
      // Add KPIs Section
      checkPageBreak(40);
      doc.setFontSize(16);
      doc.text('Key Performance Indicators (KPIs)', margin, yPosition);
      yPosition += 15;
      
      const kpiData = [
        ['Metric', 'Average Value', 'Status'],
        ['Total Sensor Logs', totalSessions.toString(), totalSessions > 0 ? 'Good' : 'No Data'],
        ['Average pH Level', avgPH, (avgPH >= 5.5 && avgPH <= 7.5) ? 'Optimal' : 'Needs Attention'],
        ['Average TDS (ppm)', avgTDS, (avgTDS >= 500 && avgTDS <= 1500) ? 'Optimal' : 'Needs Attention'],
        ['Average Water Temp (°C)', avgWaterTemp, (avgWaterTemp >= 18 && avgWaterTemp <= 24) ? 'Optimal' : 'Needs Attention'],
        ['Average Air Temp (°C)', avgAirTemp, (avgAirTemp >= 20 && avgAirTemp <= 26) ? 'Optimal' : 'Needs Attention'],
        ['Average Humidity (%)', avgHumidity, (avgHumidity >= 40 && avgHumidity <= 70) ? 'Optimal' : 'Needs Attention']
      ];
      
      autoTable(doc, {
        head: [kpiData[0]],
        body: kpiData.slice(1),
        startY: yPosition,
        styles: { 
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'left'
        },
        headStyles: { 
          fillColor: [76, 175, 80],
          fontSize: 9,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 40, halign: 'center' }
        },
        margin: { left: margin, right: margin }
      });
      
      yPosition = doc.lastAutoTable.finalY + 20;
      
      // Add Prescriptive Insights Section
      checkPageBreak(50);
      doc.setFontSize(16);
      doc.text('Prescriptive Insights & Recommendations', margin, yPosition);
      yPosition += 15;
      
      const insights = [];
      
      // pH insights
      if (avgPH < 5.5) {
        insights.push('• pH Level is too low. Consider adding pH up solution to raise pH to optimal range (5.5-7.5)');
      } else if (avgPH > 7.5) {
        insights.push('• pH Level is too high. Consider adding pH down solution to lower pH to optimal range (5.5-7.5)');
      } else {
        insights.push('• pH Level is within optimal range. Continue current pH management practices');
      }
      
      // TDS insights
      if (avgTDS < 500) {
        insights.push('• TDS is low. Consider increasing nutrient concentration for better plant growth');
      } else if (avgTDS > 1500) {
        insights.push('• TDS is high. Consider diluting nutrient solution to prevent nutrient burn');
      } else {
        insights.push('• TDS is within optimal range. Current nutrient levels are appropriate');
      }
      
      // Temperature insights
      if (avgWaterTemp < 18) {
        insights.push('• Water temperature is low. Consider using a water heater to maintain optimal temperature');
      } else if (avgWaterTemp > 24) {
        insights.push('• Water temperature is high. Consider cooling measures to prevent root stress');
      } else {
        insights.push('• Water temperature is optimal for plant growth');
      }
      
      if (avgAirTemp < 20) {
        insights.push('• Air temperature is low. Consider increasing ambient temperature for better growth');
      } else if (avgAirTemp > 26) {
        insights.push('• Air temperature is high. Consider ventilation or cooling to prevent heat stress');
      } else {
        insights.push('• Air temperature is within optimal range');
      }
      
      // Humidity insights
      if (avgHumidity < 40) {
        insights.push('• Humidity is low. Consider using a humidifier to increase moisture levels');
      } else if (avgHumidity > 70) {
        insights.push('• Humidity is high. Consider improving ventilation to prevent mold and disease');
      } else {
        insights.push('• Humidity levels are optimal for plant health');
      }
      
      // Add insights as text with proper line wrapping
      doc.setFontSize(10);
      insights.forEach(insight => {
        checkPageBreak(15);
        
        // Split long lines
        const lines = doc.splitTextToSize(insight, contentWidth - 20);
        lines.forEach(line => {
          checkPageBreak(8);
          doc.text(line, margin + 10, yPosition);
          yPosition += 6;
        });
        yPosition += 3;
      });
      
      yPosition += 10;
      
      // Add Plant Type Distribution Section
      checkPageBreak(40);
      doc.setFontSize(16);
      doc.text('Hydroponic Plant Type Distribution', margin, yPosition);
      yPosition += 15;
      
      if (plantTypeData.length > 0) {
        const totalPlants = plantTypeData.reduce((sum, p) => sum + p.value, 0);
        const plantTableData = plantTypeData.map(plant => [
          plant.name,
          plant.value.toString(),
          `${((plant.value / totalPlants) * 100).toFixed(1)}%`
        ]);
        
        autoTable(doc, {
          head: [['Plant Type', 'Count', 'Percentage']],
          body: plantTableData,
          startY: yPosition,
          styles: { 
            fontSize: 9,
            cellPadding: 3
          },
          headStyles: { 
            fillColor: [76, 175, 80],
            fontSize: 9,
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 40, halign: 'center' }
          },
          margin: { left: margin, right: margin }
        });
        
        yPosition = doc.lastAutoTable.finalY + 15;
        
        // Add plant type insights
        checkPageBreak(30);
        doc.setFontSize(12);
        doc.text('Plant Type Analysis:', margin, yPosition);
        yPosition += 10;
        
        const mostPopular = plantTypeData.reduce((max, plant) => plant.value > max.value ? plant : max, plantTypeData[0]);
        doc.setFontSize(9);
        
        const analysisLines = [
          `• Most popular plant type: ${mostPopular.name} (${mostPopular.value} plants, ${((mostPopular.value / totalPlants) * 100).toFixed(1)}%)`,
          `• Total plants tracked: ${totalPlants}`,
          `• Number of different plant types: ${plantTypeData.length}`
        ];
        
        analysisLines.forEach(line => {
          checkPageBreak(8);
          doc.text(line, margin, yPosition);
          yPosition += 6;
        });
      } else {
        doc.setFontSize(10);
        doc.text('No plant type data available', margin, yPosition);
        yPosition += 10;
      }
      
      yPosition += 15;
      
      // Add Detailed Sensor Data Section
      checkPageBreak(40);
      doc.setFontSize(16);
      doc.text('Detailed Sensor Data', margin, yPosition);
      yPosition += 15;
      
      if (sensorSessions.length > 0) {
        const tableData = sensorSessions.slice(0, 15).map(session => [
          session.id.substring(0, 6) + '...',
          new Date(session.timestamp).toLocaleDateString(),
          session.ph.toFixed(1),
          session.tds.toString(),
          session.waterTemp.toFixed(1),
          session.airTemp.toFixed(1),
          session.humidity.toFixed(1)
        ]);
        
        autoTable(doc, {
          head: [['ID', 'Date', 'pH', 'TDS', 'W.Temp', 'A.Temp', 'Humidity']],
          body: tableData,
          startY: yPosition,
          styles: { 
            fontSize: 7,
            cellPadding: 2,
            overflow: 'linebreak'
          },
          headStyles: { 
            fillColor: [76, 175, 80],
            fontSize: 7,
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 25 },
            2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 20, halign: 'center' }
          },
          margin: { left: margin, right: margin }
        });
        
        if (sensorSessions.length > 15) {
          yPosition = doc.lastAutoTable.finalY + 10;
          checkPageBreak(10);
          doc.setFontSize(8);
          doc.text(`* Showing first 15 of ${sensorSessions.length} total sessions`, margin, yPosition);
        }
      } else {
        doc.setFontSize(10);
        doc.text('No sensor data available', margin, yPosition);
      }
      
      // Add footer to all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, margin, pageHeight - 10);
        doc.text('Cropify Analytics Report', pageWidth - 60, pageHeight - 10);
      }
      
      // Save the PDF
      doc.save('Cropify_Sensor_Analytics_Report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report');
    }
  };

  const handlePrintConfirm = async () => {
    // Log the print analytics action
    if (uid && adminName) {
      await adminAuditActions.printAnalytics(uid, adminName);
    }
    
    exportAnalyticsPDF();
    setShowPrintConfirmModal(false);
    
    // Show download success modal
    setShowDownloadSuccessModal(true);
    
    // Auto-hide success modal after 3 seconds
    setTimeout(() => {
      setShowDownloadSuccessModal(false);
    }, 3000);
  };

  const handlePrintCancel = () => {
    setShowPrintConfirmModal(false);
  };

  if (loading) {
    return <div className="loading-container"><p>Loading...</p></div>;
  }

  if (role !== "superadmin" && !isAdminUid) {
    return (
      <div className="loading-container">
        <Navbar role={role} adminName={adminName} adminId={uid} />
        <p>Access denied. Only Super Admin and Admin can view this page.</p>
      </div>
    );
  }

  const chartData = sensorSessions.map(session => ({
    timestamp: session.timestamp,
    ph: session.ph,
    tds: session.tds,
    waterTemp: session.waterTemp,
    airTemp: session.airTemp,
    humidity: session.humidity,
  }));


  const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#009688', '#9C27B0'];

  return (
    <div className="analytics-page-container">
      <Navbar role={role} adminName={adminName} />

      <div style={{ textAlign: 'right', marginBottom: '2rem' }}>
        <button
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            color: '#2e7d32',
            border: '2px solid #2e7d32',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
          onClick={() => setShowPrintConfirmModal(true)}
        >
          Print Analytics Summary
        </button>
      </div>

      <div className="charts-container">
        <div className="chart-card pie-chart-main-card">
          <h2 className="chart-title">Hydroponic Plant Types Distribution</h2>
          <p className="chart-summary">
            Distribution of hydroponic plant types input by users.
          </p>
          <div className="pie-chart-container">
            <div className="pie-chart-wrapper">
              <PieChart width={300} height={300}>
                <Pie
                  data={plantTypeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {plantTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </div>
            <div className="plant-types-card">
              <div className="plant-types-header">
                <h3>Plant Types</h3>
                <span className="total-count">
                  Total: {plantTypeData.reduce((sum, item) => sum + item.value, 0)}
                </span>
              </div>
              <div className="plant-types-list">
                {plantTypeData.map((entry, idx) => (
                  <div key={entry.name} className="plant-type-item">
                    <div className="plant-type-info">
                      <span
                        className="plant-type-color"
                        style={{
                          background: COLORS[idx % COLORS.length],
                        }}
                      ></span>
                      <span className="plant-type-name">{entry.name}</span>
                    </div>
                    <span className="plant-type-count">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Line charts */}
        <div className="chart-card">
          <h2 className="chart-title">pH Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="ph" stroke="#4CAF50" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-summary">Historical pH readings from sensors.</p>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">TDS (ppm) Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="tds" stroke="#2196F3" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-summary">Historical TDS readings from sensors.</p>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">Water Temperature (°C) Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="waterTemp" stroke="#FF9800" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-summary">Historical water temperature readings from sensors.</p>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">Air Temperature (°C) Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="airTemp" stroke="#F44336" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-summary">Historical air temperature readings from sensors.</p>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">Humidity (%) Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="humidity" stroke="#009688" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-summary">Historical humidity readings from sensors.</p>
        </div>
      </div>

      {/* Print Confirmation Modal */}
      {showPrintConfirmModal && (
        <div className="modal-overlay" onClick={handlePrintCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Print Analytics Summary</h3>
              <button className="close-modal-btn" onClick={handlePrintCancel}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to print the analytics summary?</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                This will generate a PDF file with all sensor analytics data and charts.
              </p>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={handlePrintCancel}>
                <FaTimes style={{ marginRight: 4 }} /> Cancel
              </button>
              <button 
                className="submit-btn" 
                onClick={handlePrintConfirm}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: '10px'
                }}
              >
                Print Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Success Modal */}
      {showDownloadSuccessModal && (
        <div className="success-popup-overlay">
          <div className="success-popup">
            <div className="success-icon">
              <FaCheck />
            </div>
            <h3>Download Successful!</h3>
            <p>Analytics summary has been downloaded successfully.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsPage;
