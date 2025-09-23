import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import '../../styles/AdminAuditLogsPage.css';
import { adminAuditActions } from '../../utils/adminAuditLogger';

const AdminAuditLogsPage = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
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
      case 'click': return '👆';
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
      case 'click': return '#607d8b';
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
    { value: 'click', label: 'Click' }
  ];

  const exportToPDF = () => {
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
    doc.text('Admin Audit Logs Report', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Comprehensive audit trail of admin actions and activities', margin, yPosition);
    yPosition += 15;

    // Statistics
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Statistics', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Actions: ${auditLogs.length}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Filtered Results: ${filteredLogs.length}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Unique Admins: ${new Set(auditLogs.map(log => log.adminName)).size}`, margin, yPosition);
    yPosition += 10;

    // Audit Logs Table
    checkPageBreak(40);
    const tableData = filteredLogs.map(log => [
      log.action.toUpperCase(),
      log.adminName,
      log.adminId,
      log.details,
      formatTimestamp(log.timestamp)
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['Action', 'Admin Name', 'Admin ID', 'Details', 'Timestamp']],
      body: tableData,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 30 },
        2: { cellWidth: 35 },
        3: { cellWidth: 50 },
        4: { cellWidth: 35 }
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
      doc.text('Cropify Admin Audit Logs Report', pageWidth - 80, pageHeight - 10);
      doc.text(generatedDateTime, margin, pageHeight - 20);
    }

    doc.save('Cropify_Admin_Audit_Logs_Report.pdf');
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
      <Navbar role={role} adminName={adminName} onPrintSummary={exportToPDF} />
      
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
    </div>
  );
};

export default AdminAuditLogsPage;
