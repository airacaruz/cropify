import { onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import '../../styles/AdminRecordsPage.css';
import { adminAuditActions } from '../../utils/adminAuditLogger';

const AdminRecordsPage = () => {
  const [users, setUsers] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState(null);
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
            setRole((data.role || "unknown").toLowerCase());
            const cleanName = (data.name || "Admin").replace(/\s*\(superadmin\)|\s*\(admin\)/gi, "");
            setAdminName(cleanName);
          });
        } else {
          setRole("unknown");
        }
      }
    });

    const unsubscribe = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(data);
    });

    return () => {
      unsubscribeAuth();
      unsubscribe();
    };
  }, [navigate]);

  const toggleExpand = (id, user) => {
    if (expandedRow === id) {
      setExpandedRow(null);
    } else {
      setExpandedRow(id);
      setEditedData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || ''
      });
    }
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("Are you sure you want to delete this user?");
    if (!confirm) return;
    try {
      await deleteDoc(doc(db, 'admins', id));
      alert('User deleted successfully!');
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user.");
    }
  };

  const handleSave = async (id) => {
    try {
      await updateDoc(doc(db, 'admins', id), editedData);
      alert('User updated successfully!');
      setExpandedRow(null);
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user.");
    }
  };

  const handlePrintConfirm = async () => {
    console.log('Print confirm clicked');
    try {
      // Log the print action
      if (uid && adminName) {
        await adminAuditActions.custom(uid, adminName, 'click', 'Admin printed admin records summary');
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
      doc.text('Admin Records Report', margin, yPosition);
      yPosition += 10;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Comprehensive admin management and profile information', margin, yPosition);
      yPosition += 15;

      // Statistics
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Statistics', margin, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Admins: ${users.length}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Super Admins: ${users.filter(user => user.role === 'superadmin').length}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Regular Admins: ${users.filter(user => user.role === 'admin').length}`, margin, yPosition);
      yPosition += 10;

      // Admins Table
      checkPageBreak(40);
      const tableData = users.map(user => [
        user.adminId || 'N/A',
        user.name || 'N/A',
        user.email || 'N/A',
        user.role || 'N/A'
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['Admin ID', 'Name', 'Email', 'Role']],
        body: tableData,
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 40 },
          2: { cellWidth: 50 },
          3: { cellWidth: 30 }
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
        doc.text('Cropify Admin Records Report', pageWidth - 80, pageHeight - 10);
        doc.text(generatedDateTime, margin, pageHeight - 20);
      }

      console.log('Saving PDF...');
      doc.save('Cropify_Admin_Records_Report.pdf');
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

  const handleChange = (e) => {
    setEditedData({ ...editedData, [e.target.name]: e.target.value });
  };

  return (
    <div className="user-records-container">
      <Navbar role={role} adminName={adminName} adminId={uid} onPrintSummary={handlePrintSummary} />
      
      <div className="back-button" onClick={() => navigate(-1)}>← Back</div>
      <div className="header">
        <h2>Admin Records</h2>
        <div className="header-buttons">
          <button className="add-btn" onClick={() => navigate('/register')}>Add User</button>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="records-table">
          <thead>
            <tr>
              <th>Admin ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th> {/* NEW */}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <React.Fragment key={user.id}>
                <tr onClick={() => toggleExpand(user.id, user)} className="hoverable-row">
                  <td><span className="menu-icon">⋮</span> {user.id}</td>
                  <td>{user.name || 'N/A'}</td>
                  <td>{user.email || 'N/A'}</td>
                  <td>{user.role || 'N/A'}</td> {/* NEW */}
                </tr>
                {expandedRow === user.id && (
                  <tr className="expanded-row">
                    <td colSpan="4">
                      <div className="edit-form">
                        <label>Edit Name</label>
                        <input
                          type="text"
                          name="name"
                          value={editedData.name}
                          onChange={handleChange}
                        />

                        <label>Edit Email</label>
                        <input
                          type="email"
                          name="email"
                          value={editedData.email}
                          onChange={handleChange}
                        />

                        <label>Edit Role</label>
                        <input
                          type="text"
                          name="role"
                          value={editedData.role}
                          onChange={handleChange}
                        />

                        <div className="action-buttons">
                        <div className="left-buttons">
                            <button className="save-btn" onClick={() => handleSave(user.id)}>Save</button>
                            <button onClick={() => setExpandedRow(null)}>Cancel</button>
                        </div>
                        <button className="delete-btn" onClick={() => handleDelete(user.id)}>Delete User</button>
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
              <h3>Confirm Print Admin Records Summary</h3>
              <button className="close-modal-btn" onClick={handlePrintCancel}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to print the admin records summary?</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                This will generate a PDF file with all admin data and information.
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

export default AdminRecordsPage;
