import { onAuthStateChanged } from 'firebase/auth';
import { collection, collectionGroup, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
    doc.text('User Logs Report', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Comprehensive user activity and session tracking', margin, yPosition);
    yPosition += 15;

    // Session Logs Section
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Session Logs', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Sessions: ${sessionLogs.length}`, margin, yPosition);
    yPosition += 10;

    // Session Logs Table
    checkPageBreak(40);
    const sessionTableData = sessionLogs.map(log => [
      log.sessionId,
      log.loginTime?.toDate ? log.loginTime.toDate().toLocaleDateString() : '—',
      log.loginTime?.seconds ? new Date(log.loginTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—',
      log.logoutTime?.toDate ? log.logoutTime.toDate().toLocaleDateString() : '—',
      log.logoutTime?.seconds ? new Date(log.logoutTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['Session ID', 'Login Date', 'Login Time', 'Logout Date', 'Logout Time']],
      body: sessionTableData,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 }
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

    // Screen Logs Section
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Screen Logs', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Screen Visits: ${screenLogs.length}`, margin, yPosition);
    yPosition += 10;

    // Screen Logs Table
    checkPageBreak(40);
    const screenTableData = screenLogs.map(log => [
      log.visitId,
      log.userId,
      log.screenName,
      log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '—'
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['Visit ID', 'User ID', 'Screen Name', 'Timestamp']],
      body: screenTableData,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 }
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

    // Plant Logs Section
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Plant Logs', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Growers: ${plantLogs.length}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Total Plants: ${plantLogs.reduce((total, grower) => total + grower.plants.length, 0)}`, margin, yPosition);
    yPosition += 10;

    // Plant Logs Table
    checkPageBreak(40);
    const plantTableData = [];
    plantLogs.forEach(grower => {
      grower.plants.forEach(plant => {
        plantTableData.push([
          grower.growerId,
          plant.name || 'N/A',
          plant.type || 'N/A',
          plant.id,
          plant.sensorId || 'N/A',
          plant.timestamp?.toDate ? plant.timestamp.toDate().toLocaleDateString() : 'N/A'
        ]);
      });
    });

    doc.autoTable({
      startY: yPosition,
      head: [['Grower ID', 'Plant Name', 'Plant Type', 'Plant ID', 'Sensor ID', 'Date Added']],
      body: plantTableData,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 25 }
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
      <Navbar role={role} adminName={adminName} onPrintSummary={exportToPDF} />
    
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