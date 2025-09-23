import { onAuthStateChanged } from 'firebase/auth';
import { collection, collectionGroup, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import React, { useEffect, useState } from 'react';
import { FaBarcode, FaCalendarAlt, FaChevronDown, FaChevronUp, FaDesktop, FaIdBadge, FaLeaf, FaSeedling, FaSignInAlt, FaUser } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import { auth, db } from '../../../firebase';
import '../../../styles/UserRecordsPage.css';
import { adminAuditActions } from '../../../utils/adminAuditLogger';

const exportUserLogsPDF = async ({
    sessionLogs,
    screenLogs,
    plantLogs,
    totalSessions,
    totalScreenVisits,
    totalPlants,
    activeGrowers
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
    doc.text('Cropify User Logs Report', margin, yPosition);
    yPosition += 15;
    
    doc.setFontSize(12);
    doc.text('Comprehensive user activity and session tracking for Cropify platform', margin, yPosition);
    yPosition += 30;

    // Add Executive Summary
    doc.setFontSize(16);
    doc.text('Executive Summary', 20, yPosition);
    yPosition += 15;
    
    doc.setFontSize(11);
    const summaryText = [
        'This report provides a comprehensive analysis of user activity within the Cropify platform,',
        'including session logs, screen visit tracking, and plant management activities.',
        'Key findings include user engagement patterns, system usage statistics,',
        'and detailed activity logs for administrative oversight and optimization.'
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
        ['Total Sessions', totalSessions.toString(), 'Active', 'Active'],
        ['Screen Visits', totalScreenVisits.toString(), 'Active', 'Active'],
        ['Plant Records', totalPlants.toString(), 'Growing', 'Active'],
        ['Active Growers', activeGrowers.toString(), 'Engaged', 'Engaged']
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

    // Add Session Logs Analytics Section
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.text('User Session Analytics & Activity Tracking', margin, yPosition);
    yPosition += 15;
    
    if (sessionLogs && sessionLogs.length > 0) {
        // Calculate session metrics
        const totalSessions = sessionLogs.length;
        const sessionsWithLogout = sessionLogs.filter(log => log.logoutTime).length;
        
        doc.setFontSize(12);
        doc.text('Session Activity Analysis:', margin, yPosition);
        yPosition += 10;
        
        const sessionMetrics = [
            `• Total user sessions tracked: ${totalSessions}`,
            `• Sessions with logout data: ${sessionsWithLogout}`,
            `• Active sessions (no logout): ${totalSessions - sessionsWithLogout}`,
            `• Session completion rate: ${totalSessions > 0 ? ((sessionsWithLogout / totalSessions) * 100).toFixed(1) : 0}%`
        ];
        
        sessionMetrics.forEach(metric => {
            checkPageBreak(8);
            doc.text(metric, margin + 5, yPosition);
            yPosition += 7;
        });
        
        yPosition += 15;
        
        // Enhanced session data table (showing first 20 records)
        const sessionTableData = sessionLogs.slice(0, 20).map(log => {
            const formatTimestamp = (timestamp) => {
                if (!timestamp) return '—';
                if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                    return timestamp.toDate();
                } else if (timestamp.seconds) {
                    return new Date(timestamp.seconds * 1000);
                } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
                    return new Date(timestamp);
                }
                return null;
            };

            const loginDate = formatTimestamp(log.loginTime);
            const logoutDate = formatTimestamp(log.logoutTime);

            return [
                log.sessionId.substring(0, 12) + '...',
                loginDate ? loginDate.toLocaleDateString() : '—',
                loginDate ? loginDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—',
                logoutDate ? logoutDate.toLocaleDateString() : '—',
                logoutDate ? logoutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'
            ];
        });
        
        autoTable(doc, {
            head: [['Session ID', 'Login Date', 'Login Time', 'Logout Date', 'Logout Time']],
            body: sessionTableData,
            startY: yPosition,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [76, 175, 80] },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        
        if (sessionLogs.length > 20) {
            yPosition = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.text(`* Showing first 20 of ${sessionLogs.length} total sessions`, margin, yPosition);
        }
        
        yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Add Screen Visit Analytics Section
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.text('Screen Visit Analytics & User Navigation', margin, yPosition);
    yPosition += 15;
    
    if (screenLogs && screenLogs.length > 0) {
        // Calculate screen visit metrics
        const totalVisits = screenLogs.length;
        const uniqueUsers = new Set(screenLogs.map(log => log.userId)).size;
        const uniqueScreens = new Set(screenLogs.map(log => log.screenName)).size;
        const mostVisitedScreen = screenLogs.reduce((acc, log) => {
            acc[log.screenName] = (acc[log.screenName] || 0) + 1;
            return acc;
        }, {});
        const topScreen = Object.entries(mostVisitedScreen).reduce((a, b) => mostVisitedScreen[a[0]] > mostVisitedScreen[b[0]] ? a : b, ['N/A', 0]);
        
        doc.setFontSize(12);
        doc.text('Screen Navigation Analysis:', margin, yPosition);
        yPosition += 10;
        
        const screenMetrics = [
            `• Total screen visits tracked: ${totalVisits}`,
            `• Unique users navigating: ${uniqueUsers}`,
            `• Different screens accessed: ${uniqueScreens}`,
            `• Most visited screen: ${topScreen[0]} (${topScreen[1]} visits)`,
            `• Average visits per user: ${uniqueUsers > 0 ? (totalVisits / uniqueUsers).toFixed(1) : 0}`
        ];
        
        screenMetrics.forEach(metric => {
            checkPageBreak(8);
            doc.text(metric, margin + 5, yPosition);
            yPosition += 7;
        });
        
        yPosition += 15;
        
        // Enhanced screen visit data table (showing first 15 records)
        const screenTableData = screenLogs.slice(0, 15).map(log => {
            const formatTimestamp = (timestamp) => {
                if (!timestamp) return '—';
                if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                    return timestamp.toDate().toLocaleString();
                } else if (timestamp.seconds) {
                    return new Date(timestamp.seconds * 1000).toLocaleString();
                } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
                    return new Date(timestamp).toLocaleString();
                }
                return '—';
            };

            return [
                log.visitId.substring(0, 12) + '...',
                log.userId.substring(0, 12) + '...',
                log.screenName,
                formatTimestamp(log.timestamp)
            ];
        });
        
        autoTable(doc, {
            head: [['Visit ID', 'User ID', 'Screen Name', 'Timestamp']],
            body: screenTableData,
            startY: yPosition,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [76, 175, 80] },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        
        if (screenLogs.length > 15) {
            yPosition = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.text(`* Showing first 15 of ${screenLogs.length} total screen visits`, margin, yPosition);
        }
        
        yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Add Plant Management Analytics Section
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.text('Plant Management Analytics & Grower Activity', margin, yPosition);
    yPosition += 15;
    
    if (plantLogs && plantLogs.length > 0) {
        const totalGrowers = plantLogs.length;
        const totalPlants = plantLogs.reduce((total, grower) => total + (grower.plants || []).length, 0);
        const avgPlantsPerGrower = totalGrowers > 0 ? (totalPlants / totalGrowers).toFixed(1) : 0;
        
        // Calculate plant type distribution
        const plantTypeCounts = {};
        plantLogs.forEach(grower => {
            (grower.plants || []).forEach(plant => {
                const type = plant.type || 'Unknown';
                plantTypeCounts[type] = (plantTypeCounts[type] || 0) + 1;
            });
        });
        const mostPopularType = Object.entries(plantTypeCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['N/A', 0]);
        
        doc.setFontSize(12);
        doc.text('Plant Management Analysis:', margin, yPosition);
        yPosition += 10;
        
        const plantMetrics = [
            `• Total active growers: ${totalGrowers}`,
            `• Total plants managed: ${totalPlants}`,
            `• Average plants per grower: ${avgPlantsPerGrower}`,
            `• Most popular plant type: ${mostPopularType[0]} (${mostPopularType[1]} plants)`,
            `• Plant diversity: ${Object.keys(plantTypeCounts).length} different types`
        ];
        
        plantMetrics.forEach(metric => {
            checkPageBreak(8);
            doc.text(metric, margin + 5, yPosition);
            yPosition += 7;
        });
        
        yPosition += 15;
        
        // Enhanced plant data table (showing first 20 records)
        const plantTableData = [];
        let recordCount = 0;
        const maxRecords = 20;
        
        for (const grower of plantLogs) {
            if (recordCount >= maxRecords) break;
            for (const plant of (grower.plants || [])) {
                if (recordCount >= maxRecords) break;
                
                let dateAdded = 'N/A';
                if (plant.timestamp) {
                    if (plant.timestamp.toDate && typeof plant.timestamp.toDate === 'function') {
                        dateAdded = plant.timestamp.toDate().toLocaleDateString();
                    } else if (plant.timestamp.seconds) {
                        dateAdded = new Date(plant.timestamp.seconds * 1000).toLocaleDateString();
                    } else if (typeof plant.timestamp === 'string' || typeof plant.timestamp === 'number') {
                        dateAdded = new Date(plant.timestamp).toLocaleDateString();
                    }
                }
                
                plantTableData.push([
                    grower.growerId.substring(0, 12) + '...',
                    plant.name || 'N/A',
                    plant.type || 'N/A',
                    plant.id.substring(0, 12) + '...',
                    plant.sensorId || 'N/A',
                    dateAdded
                ]);
                recordCount++;
            }
        }
        
        autoTable(doc, {
            head: [['Grower ID', 'Plant Name', 'Plant Type', 'Plant ID', 'Sensor ID', 'Date Added']],
            body: plantTableData,
            startY: yPosition,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [76, 175, 80] },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        
        if (totalPlants > maxRecords) {
            yPosition = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.text(`* Showing first ${maxRecords} of ${totalPlants} total plant records`, margin, yPosition);
        }
        
        yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Add Insights & Recommendations Section
    doc.setFontSize(16);
    doc.text('Insights & Recommendations', 20, yPosition);
    yPosition += 15;
    
    if (sessionLogs && sessionLogs.length > 0) {
        doc.setFontSize(11);
        const insights = [
            '• Monitor session completion rates to identify user engagement patterns',
            '• Analyze screen visit patterns to optimize user interface design',
            '• Track plant management activities to understand grower behavior',
            '• Use session data to identify peak usage times for system optimization',
            '• Review screen navigation flows to improve user experience'
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
        doc.text('• Continue monitoring user activity for optimal system performance', 20, yPosition);
        yPosition += 8;
        doc.text('• Maintain current user tracking practices for engagement analysis', 20, yPosition);
        yPosition += 8;
        doc.text('• Consider expanding user activity monitoring based on usage patterns', 20, yPosition);
    }
    
    yPosition += 20;

    // Add footer to all pages
    const pageCount = doc.internal.getNumberOfPages();
    const generatedDateTime = `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
    
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, margin, pageHeight - 10);
        doc.text('Cropify User Logs Report', pageWidth - 80, pageHeight - 10);
        doc.text(generatedDateTime, margin, pageHeight - 20);
    }

    doc.save('Cropify_User_Logs_Report.pdf');
};

const UserLogsPage = () => {
  const [sessionLogs, setSessionLogs] = useState([]);
  const [screenLogs, setScreenLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('login');
  const [plantLogs, setPlantLogs] = useState([]);
  const [expandedGrowerId, setExpandedGrowerId] = useState(null);
  const [expandedPlantId, setExpandedPlantId] = useState(null);
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);

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


  const handlePrintConfirm = async () => {
    // Log the print action
    if (uid && adminName) {
      await adminAuditActions.custom(uid, adminName, 'click', 'Admin printed user logs summary');
    }
    
    // Calculate user logs metrics
    const totalSessions = sessionLogs.length;
    const totalScreenVisits = screenLogs.length;
    const totalPlants = plantLogs.reduce((total, grower) => total + (grower.plants || []).length, 0);
    const activeGrowers = plantLogs.length;
    
    exportUserLogsPDF({
      sessionLogs,
      screenLogs,
      plantLogs,
      totalSessions,
      totalScreenVisits,
      totalPlants,
      activeGrowers
    });
    setShowPrintConfirmModal(false);
  };

  const handlePrintCancel = () => {
    setShowPrintConfirmModal(false);
  };

  const handlePrintSummary = () => {
    setShowPrintConfirmModal(true);
  };

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
      <Navbar role={role} adminName={adminName} onPrintSummary={handlePrintSummary} />
    
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

      {/* Print Confirmation Modal */}
      {showPrintConfirmModal && (
        <div className="modal-overlay" onClick={handlePrintCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Print User Logs Summary</h3>
              <button className="close-modal-btn" onClick={handlePrintCancel}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to print the user logs summary?</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                This will generate a PDF file with all user activity and session data.
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


export default UserLogsPage;