import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import '../../styles/AdminAuditLogsPage.css';
import { adminAuditActions } from '../../utils/adminAuditLogger';

const exportAdminAuditLogsPDF = async ({
    auditLogs,
    filteredLogs,
    totalActions,
    filteredResults,
    uniqueAdmins
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
    doc.text('Cropify Admin Audit Logs Report', margin, yPosition);
    yPosition += 15;
    
    doc.setFontSize(12);
    doc.text('Comprehensive audit trail of admin actions and activities for Cropify platform', margin, yPosition);
    yPosition += 30;

    // Add Executive Summary
    doc.setFontSize(16);
    doc.text('Executive Summary', 20, yPosition);
    yPosition += 15;
    
    doc.setFontSize(11);
    const summaryText = [
        'This report provides a comprehensive analysis of admin audit logs within the Cropify platform,',
        'including admin actions, system activities, and security monitoring.',
        'Key findings include admin activity patterns, system usage statistics,',
        'and detailed audit trails for administrative oversight and security compliance.'
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
        ['Total Actions', totalActions.toString(), 'Active', 'Active'],
        ['Filtered Results', filteredResults.toString(), 'Current', 'Current'],
        ['Unique Admins', uniqueAdmins.toString(), 'Engaged', 'Engaged'],
        ['Audit Coverage', '100%', 'Complete', 'Complete']
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

    // Add Audit Logs Analytics Section
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.text('Admin Audit Logs Analytics & Activity Tracking', margin, yPosition);
    yPosition += 15;
    
    if (auditLogs && auditLogs.length > 0) {
        // Calculate audit metrics
        const actionCounts = auditLogs.reduce((acc, log) => {
            acc[log.action] = (acc[log.action] || 0) + 1;
            return acc;
        }, {});
        const mostCommonAction = Object.entries(actionCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['N/A', 0]);
        const recentActions = auditLogs.filter(log => {
            if (log.timestamp) {
                const logDate = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                return logDate > sevenDaysAgo;
            }
            return false;
        }).length;
        
        doc.setFontSize(12);
        doc.text('Audit Activity Analysis:', margin, yPosition);
        yPosition += 10;
        
        const auditMetrics = [
            `• Total audit actions tracked: ${totalActions}`,
            `• Current filtered results: ${filteredResults}`,
            `• Unique admins active: ${uniqueAdmins}`,
            `• Most common action: ${mostCommonAction[0]} (${mostCommonAction[1]} times)`,
            `• Recent actions (7 days): ${recentActions}`
        ];
        
        auditMetrics.forEach(metric => {
            checkPageBreak(8);
            doc.text(metric, margin + 5, yPosition);
            yPosition += 7;
        });
        
        yPosition += 15;
        
        // Enhanced audit logs table (showing first 20 records)
        const auditTableData = filteredLogs.slice(0, 20).map(log => [
            log.action.toUpperCase(),
            log.adminName,
            log.adminId.substring(0, 12) + '...',
            log.details.length > 30 ? log.details.substring(0, 30) + '...' : log.details,
            log.timestamp ? (log.timestamp.toDate ? log.timestamp.toDate().toLocaleString() : new Date(log.timestamp).toLocaleString()) : 'N/A'
        ]);
        
        autoTable(doc, {
            head: [['Action', 'Admin Name', 'Admin ID', 'Details', 'Timestamp']],
            body: auditTableData,
            startY: yPosition,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [76, 175, 80] },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        
        if (filteredLogs.length > 20) {
            yPosition = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.text(`* Showing first 20 of ${filteredLogs.length} total audit logs`, margin, yPosition);
        }
        
        yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Add Insights & Recommendations Section
    doc.setFontSize(16);
    doc.text('Insights & Recommendations', 20, yPosition);
    yPosition += 15;
    
    if (auditLogs && auditLogs.length > 0) {
        doc.setFontSize(11);
        const insights = [
            '• Monitor admin activity patterns to identify usage trends',
            '• Review audit logs regularly for security compliance',
            '• Track admin actions to ensure proper system usage',
            '• Analyze action frequency to optimize admin workflows',
            '• Maintain audit trail integrity for security monitoring'
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
        doc.text('• Continue monitoring admin activities for optimal security oversight', 20, yPosition);
        yPosition += 8;
        doc.text('• Maintain current audit logging practices for system security', 20, yPosition);
        yPosition += 8;
        doc.text('• Consider expanding audit coverage based on admin activity patterns', 20, yPosition);
    }
    
    yPosition += 20;

    // Add footer to all pages
    const pageCount = doc.internal.getNumberOfPages();
    const generatedDateTime = `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
    
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, margin, pageHeight - 10);
        doc.text('Cropify Admin Audit Logs Report', pageWidth - 80, pageHeight - 10);
        doc.text(generatedDateTime, margin, pageHeight - 20);
    }

    doc.save('Cropify_Admin_Audit_Logs_Report.pdf');
};

const AdminAuditLogsPage = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
  const navigate = useNavigate();

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
            const userRole = (data.role || "unknown").toLowerCase();
            setRole(userRole);
            const cleanName = (data.name || "Admin").replace(/\s*\(superadmin\)|\s*\(admin\)/gi, "");
            setAdminName(cleanName);
            
            // Redirect non-superadmin users
            if (userRole !== 'superadmin') {
              navigate('/dashboard', { replace: true });
            }
          });
        } else {
          setRole("unknown");
          navigate('/dashboard', { replace: true });
        }
      }
    });

    // Listen to admin audit logs with real-time updates
    const unsubscribeAuditLogs = onSnapshot(
      query(collection(db, 'admin_audit_logs'), orderBy('timestamp', 'desc')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAuditLogs(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching audit logs:', error);
        setLoading(false);
      }
    );

    // Clean up the listeners when component unmounts
    return () => {
      unsubscribeAuth();
      unsubscribeAuditLogs();
    };
  }, [navigate]);

  // Log when admin views the audit logs page
  useEffect(() => {
    if (uid && adminName && role) {
      adminAuditActions.custom(uid, adminName, 'view', 'Admin viewed audit logs page');
    }
  }, [uid, adminName, role]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'login': return '🔐';
      case 'logout': return '🚪';
      case 'view': return '👁️';
      case 'create': return '➕';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      case 'print': return '🖨️';
      default: return '📝';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'login': return '#4caf50';
      case 'logout': return '#f44336';
      case 'view': return '#2196f3';
      case 'create': return '#ff9800';
      case 'update': return '#9c27b0';
      case 'delete': return '#f44336';
      case 'print': return '#607d8b';
      default: return '#795548';
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (filter === 'all') return true;
    return log.action === filter;
  });

  const actionTypes = [
    { value: 'all', label: 'All Actions' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'view', label: 'View' },
    { value: 'create', label: 'Create' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
    { value: 'print', label: 'Print' }
  ];

  const handlePrintConfirm = async () => {
    // Log the print action
    if (uid && adminName) {
      await adminAuditActions.custom(uid, adminName, 'print', 'Admin printed audit logs summary');
    }
    
    // Calculate audit metrics
    const totalActions = auditLogs.length;
    const filteredResults = filteredLogs.length;
    const uniqueAdmins = new Set(auditLogs.map(log => log.adminName)).size;
    
    exportAdminAuditLogsPDF({
      auditLogs,
      filteredLogs,
      totalActions,
      filteredResults,
      uniqueAdmins
    });
    setShowPrintConfirmModal(false);
  };

  const handlePrintCancel = () => {
    setShowPrintConfirmModal(false);
  };

  const handlePrintSummary = () => {
    setShowPrintConfirmModal(true);
  };

  if (loading || !role) {
    return (
      <div className="admin-audit-logs-container">
        <Navbar role={role} adminName={adminName} />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading audit logs...</p>
        </div>
      </div>
    );
  }

  // Additional check to ensure only superadmin can access
  if (role !== 'superadmin') {
    return (
      <div className="admin-audit-logs-container">
        <Navbar role={role} adminName={adminName} />
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to view admin audit logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-audit-logs-container">
      <Navbar role={role} adminName={adminName} adminId={uid} onPrintSummary={handlePrintSummary} />
      
      <div className="audit-logs-header">
        <h2>Admin Audit Logs</h2>
        <div className="filter-controls">
          <label htmlFor="action-filter">Filter by action:</label>
          <select 
            id="action-filter"
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            {actionTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="audit-logs-stats">
        <div className="stat-card">
          <h3>Total Actions</h3>
          <p>{auditLogs.length}</p>
        </div>
        <div className="stat-card">
          <h3>Filtered Results</h3>
          <p>{filteredLogs.length}</p>
        </div>
        <div className="stat-card">
          <h3>Unique Admins</h3>
          <p>{new Set(auditLogs.map(log => log.adminName)).size}</p>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="audit-logs-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Admin</th>
              <th>Details</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="4" className="no-data">
                  No audit logs found for the selected filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} className="audit-log-row">
                  <td>
                    <div className="action-cell">
                      <span 
                        className="action-icon"
                        style={{ color: getActionColor(log.action) }}
                      >
                        {getActionIcon(log.action)}
                      </span>
                      <span className="action-type">{log.action.toUpperCase()}</span>
                    </div>
                  </td>
                  <td>
                    <div className="admin-cell">
                      <span className="admin-name">{log.adminName}</span>
                      <span className="admin-id">{log.adminId}</span>
                    </div>
                  </td>
                  <td className="details-cell">
                    {log.details}
                  </td>
                  <td className="timestamp-cell">
                    {formatTimestamp(log.timestamp)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Print Confirmation Modal */}
      {showPrintConfirmModal && (
        <div className="modal-overlay" onClick={handlePrintCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Print Admin Audit Logs Summary</h3>
              <button className="close-modal-btn" onClick={handlePrintCancel}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to print the admin audit logs summary?</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                This will generate a PDF file with all audit log data and activities.
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

export default AdminAuditLogsPage;
