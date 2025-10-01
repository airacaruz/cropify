import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import { auth, db } from '../../../firebase';
import '../../../styles/Dashboard/UserRecords.css';
import { adminAuditActions } from '../../../utils/adminAuditLogger';

const UserReportLogPage = () => {
  const navigate = useNavigate();
  const [expandedRow, setExpandedRow] = useState(null);
  const [reports, setReports] = useState([]);
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState(null);

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

    const fetchReports = async () => {
      const querySnapshot = await getDocs(collection(db, 'reports'));
      const reportList = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        reportList.push({
          id: doc.id,
          uid: data.uid || 'Unknown User',
          problemType: data.type || 'Unknown Type',
          message: data.message || '',
          imageUrl: data.imageUrl || null,
          status: 'Pending' // default since it's not in Firestore yet
        });
      });
      setReports(reportList);
    };

    fetchReports();

    return () => {
      unsubscribeAuth();
    };
  }, [navigate]);

  const toggleExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleDelete = (id) => {
    alert(`Pretending to delete report with ID: ${id}`);
  };

  const handleMarkAsSolved = (id) => {
    setReports(prev =>
      prev.map(report =>
        report.id === id ? { ...report, status: 'Solved' } : report
      )
    );
    alert(`Marked report ${id} as solved.`);
  };

  const handlePrintConfirm = async () => {
    console.log('Print confirm clicked');
    try {
      // Log the print action
      if (uid && adminName) {
        await adminAuditActions.custom(uid, adminName, 'click', 'Admin printed user report logs summary');
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
      doc.text('User Report Logs Report', margin, yPosition);
      yPosition += 10;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Comprehensive user report and issue tracking', margin, yPosition);
      yPosition += 15;

      // Statistics
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Statistics', margin, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Reports: ${reports.length}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Pending Reports: ${reports.filter(report => report.status === 'Pending').length}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Solved Reports: ${reports.filter(report => report.status === 'Solved').length}`, margin, yPosition);
      yPosition += 10;

      // Reports Table
      checkPageBreak(40);
      const tableData = reports.map(report => [
        report.id,
        report.uid,
        report.problemType,
        report.message.length > 50 ? report.message.substring(0, 50) + '...' : report.message,
        report.status
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['Report ID', 'User ID', 'Problem Type', 'Message', 'Status']],
        body: tableData,
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 50 },
          4: { cellWidth: 20 }
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
        doc.text('Cropify User Report Logs Report', pageWidth - 80, pageHeight - 10);
        doc.text(generatedDateTime, margin, pageHeight - 20);
      }

      console.log('Saving PDF...');
      doc.save('Cropify_User_Report_Logs_Report.pdf');
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
      
      <div className="back-button" onClick={() => navigate(-1)}>← Back</div>
      <div className="header">
        <h2>User Reports</h2>
      </div>
      <div className="table-wrapper">
        <table className="records-table">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>User ID</th>
              <th>Problem Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(report => (
              <React.Fragment key={report.id}>
                <tr onClick={() => toggleExpand(report.id)} className="hoverable-row">
                  <td><span className="menu-icon">⋮</span> {report.id}</td>
                  <td>{report.uid}</td>
                  <td>{report.problemType}</td>
                  <td style={{ fontWeight: 'bold', color: report.status === 'Solved' ? 'green' : '#e65100' }}>
                    {report.status}
                  </td>
                </tr>
                {expandedRow === report.id && (
                  <tr className="expanded-row">
                    <td colSpan="4">
                      <div className="edit-form">
                        <label>Description / Message:</label>
                        <p>{report.message}</p>

                        {report.imageUrl && (
                          <>
                            <label>Uploaded Image:</label>
                            <img
                              src={report.imageUrl}
                              alt="Report Screenshot"
                              style={{ maxWidth: '100%', borderRadius: '10px', marginTop: '10px' }}
                            />
                          </>
                        )}

                        <div className="action-buttons">
                          <div className="left-buttons">
                            {report.status === 'Pending' && (
                              <button className="save-btn" onClick={() => handleMarkAsSolved(report.id)}>
                                Mark as Solved
                              </button>
                            )}
                            <button onClick={() => setExpandedRow(null)}>Close</button>
                          </div>
                          <button className="delete-btn" onClick={() => handleDelete(report.id)}>Delete Report</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Print Confirmation Modal */}
      {showPrintConfirmModal && (
        <div className="modal-overlay" onClick={handlePrintCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Print User Report Logs Summary</h3>
              <button className="close-modal-btn" onClick={handlePrintCancel}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to print the user report logs summary?</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                This will generate a PDF file with all user report data and information.
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

export default UserReportLogPage;
