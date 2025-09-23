import { onAuthStateChanged } from 'firebase/auth';
import { collection, collectionGroup, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import { auth, db } from '../../../firebase';
import '../../../styles/UserRecordsPage.css';
import { adminAuditActions } from '../../../utils/adminAuditLogger';

const UserSessionsPage = () => {
  const [activeTab, setActiveTab] = useState('sessions');
  const [logs, setLogs] = useState([]);
  const [screenLogs, setScreenLogs] = useState([]);
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState(null);
  const navigate = useNavigate();

  // Authentication
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/', { replace: true });
      } else {
        setUid(user.uid);
        // Fetch role from Firestore using uid reference
        const q = query(collection(db, "admins"), where("adminId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            setRole((data.role || "unknown").toLowerCase());
            const cleanName = (data.name || "Admin").replace(/\s*\(superadmin\)|\s*\(admin\)/gi, "");
            setAdminName(cleanName);
          });
        } else {
          setRole("unknown");
        }
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, [navigate]);

  // Fetch login/logout sessions
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'userlogs'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      const sessions = data.filter(log => log.type === 'login' || log.type === 'logout');
      setLogs(sessions);
    });

    return () => unsubscribe();
  }, []);

  // Fetch screen visit logs
  useEffect(() => {
    const fetchScreenLogs = async () => {
      const snapshot = await getDocs(collectionGroup(db, 'screenVisited'));
      const screenData = snapshot.docs.map(doc => {
        const pathParts = doc.ref.path.split('/');
        const userId = pathParts[1];
        return {
          visitId: doc.id,
          userId,
          ...doc.data(),
        };
      });
      setScreenLogs(screenData);
    };

    fetchScreenLogs();
  }, []);

  const handlePrintConfirm = async () => {
    console.log('Print confirm clicked');
    try {
      // Log the print action
      if (uid && adminName) {
        await adminAuditActions.custom(uid, adminName, 'click', 'Admin printed user sessions summary');
      }
      
      console.log('Starting PDF generation...');
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

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('User Sessions Report', margin, yPosition);
      yPosition += 10;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Comprehensive user session and screen visit tracking', margin, yPosition);
      yPosition += 15;

      // Session Logs Section
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Session Logs', margin, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Sessions: ${logs.length}`, margin, yPosition);
      yPosition += 10;

      // Session Logs Table
      checkPageBreak(40);
      const sessionTableData = logs.map(log => [
        log.id,
        log.type || 'N/A',
        log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A'
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['Session ID', 'Type', 'Timestamp']],
        body: sessionTableData,
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

      // Screen Logs Section
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Screen Visit Logs', margin, yPosition);
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
        log.screenName || 'N/A',
        log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A'
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

      // Add footer to all pages
      const pageCount = doc.internal.getNumberOfPages();
      const generatedDateTime = `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
      
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, margin, pageHeight - 10);
        doc.text('Cropify User Sessions Report', pageWidth - 80, pageHeight - 10);
        doc.text(generatedDateTime, margin, pageHeight - 20);
      }

      console.log('Saving PDF...');
      doc.save('Cropify_User_Sessions_Report.pdf');
      console.log('PDF saved successfully');
      setShowPrintConfirmModal(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
      setShowPrintConfirmModal(false);
    }
  };

  const handlePrintCancel = () => {
    setShowPrintConfirmModal(false);
  };

  const handlePrintSummary = () => {
    setShowPrintConfirmModal(true);
  };

  return (
    <div className="user-records-container">
      <Navbar role={role} adminName={adminName} onPrintSummary={handlePrintSummary} />
      
      <h2>User Logs</h2>

      {/* Tab Switcher */}
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setActiveTab('sessions')} style={{ marginRight: 10 }}>
          User Sessions
        </button>
        <button onClick={() => setActiveTab('screens')}>
          Screen Logs
        </button>
      </div>

      {/* User Sessions Table */}
      {activeTab === 'sessions' && (
        <table className="records-table">
          <thead>
            <tr>
              <th>UID</th>
              <th>Email</th>
              <th>Timestamp</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td>{log.uid}</td>
                <td>{log.email}</td>
                <td>{new Date(log.timestamp?.seconds * 1000).toLocaleString()}</td>
                <td>{log.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Screen Visit Logs Table */}
      {activeTab === 'screens' && (
        <table className="records-table">
          <thead>
            <tr>
              <th>Visit ID</th>
              <th>User ID</th>
              <th>Screen Name</th>
              <th>Visited At</th>
            </tr>
          </thead>
          <tbody>
            {screenLogs.map(log => (
              <tr key={log.visitId}>
                <td>{log.visitId}</td>
                <td>{log.userId}</td>
                <td>{log.screenName}</td>
                <td>{new Date(log.visitedAt?.seconds * 1000).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Print Confirmation Modal */}
      {showPrintConfirmModal && (
        <div className="modal-overlay" onClick={handlePrintCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Print User Sessions Summary</h3>
              <button className="close-modal-btn" onClick={handlePrintCancel}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to print the user sessions summary?</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                This will generate a PDF file with all user session and screen visit data.
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

export default UserSessionsPage;
