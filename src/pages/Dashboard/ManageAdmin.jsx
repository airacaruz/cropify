import { collection, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import React, { useEffect, useState } from 'react';
import { FaPlus, FaSave, FaTimes, FaUserEdit } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import '../../styles/AdminRecordsPage.css';
import { adminAuditActions } from '../../utils/adminAuditLogger';

const ManageAdmin = () => {
  const [admins, setAdmins] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
  const [uid, setUid] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = auth && auth.onAuthStateChanged
        ? auth.onAuthStateChanged(async (user) => {
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
                // Remove (superadmin) and (admin) from the name
                const cleanName = (data.name || "Admin").replace(/\s*\(superadmin\)|\s*\(admin\)/gi, "");
                setAdminName(cleanName);
              });
            } else {
              setRole("unknown");
            }
            setLoading(false);
          }
        })
      : () => {};

    const unsubscribeAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAdmins(data);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeAdmins();
    };
  }, [navigate]);

  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setEditedData({
      name: admin.name || '',
      email: admin.email || '',
      role: admin.role || '',
      username: admin.username || '',
      password: '' // Always start with empty password for security
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedAdmin(null);
    setEditedData({});
  };

  const handleSave = async () => {
    if (!selectedAdmin) return;
    try {
      // Prepare update data - only include password if it's not empty
      const updateData = {
        name: editedData.name,
        email: editedData.email,
        role: editedData.role,
        username: editedData.username
      };
      
      // Only update password if a new one is provided
      if (editedData.password && editedData.password.trim() !== '') {
        updateData.password = editedData.password;
      }
      
      await updateDoc(doc(db, 'admins', selectedAdmin.id), updateData);
      
      // Log the edit admin action
      if (uid && adminName) {
        await adminAuditActions.editAdmin(uid, adminName, editedData.name);
      }
      
      alert('User updated successfully!');
      closeEditModal();
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user.");
    }
  };

  const handleChange = (e) => {
    setEditedData({ ...editedData, [e.target.name]: e.target.value });
  };

  const handlePrintConfirm = async () => {
    console.log('Print confirm clicked');
    try {
      // Log the print action
      if (uid && adminName) {
        await adminAuditActions.custom(uid, adminName, 'click', 'Admin printed manage admin summary');
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
      doc.text('Manage Admin Report', margin, yPosition);
      yPosition += 10;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Comprehensive admin management and role information', margin, yPosition);
      yPosition += 15;

      // Statistics
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Statistics', margin, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Admins: ${admins.length}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Super Admins: ${admins.filter(admin => admin.role === 'superadmin').length}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Regular Admins: ${admins.filter(admin => admin.role === 'admin').length}`, margin, yPosition);
      yPosition += 10;

      // Admins Table
      checkPageBreak(40);
      const tableData = admins.map(admin => [
        admin.adminId || 'N/A',
        admin.name || 'N/A',
        admin.email || 'N/A',
        admin.role || 'N/A'
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
        doc.text('Cropify Manage Admin Report', pageWidth - 80, pageHeight - 10);
        doc.text(generatedDateTime, margin, pageHeight - 20);
      }

      console.log('Saving PDF...');
      doc.save('Cropify_Manage_Admin_Report.pdf');
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

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  // Optional: restrict access to only superadmin
  if (role !== "superadmin") {
    return (
      <div className="loading-container">
        <Navbar role={role} adminName={adminName} adminId={uid} />
        <p>Access denied. Only Super Admin can view this page.</p>
      </div>
    );
  }

  return (
    <div className="user-records-container">
      <Navbar role={role} adminName={adminName} onPrintSummary={handlePrintSummary} />
      <div className="header">
        <div className="header-buttons">
          {role === "superadmin" && (
            <button className="add-btn" onClick={() => navigate('/register')}>
              <FaPlus style={{ marginRight: 4 }} /> Add Admin
            </button>
          )}
        </div>
      </div>
      <div className="table-wrapper">
        <table className="records-table">
          <thead>
            <tr>
              <th style={{ width: "120px" }}>Admin ID</th>
              <th style={{ width: "200px" }}>UID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Password</th>
              <th style={{ width: "120px" }}>Roles</th>
              <th style={{ width: "50px" }}>Edit</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin, index) => (
              <tr key={admin.id}>
                <td>
                  <span style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '16px', 
                    color: '#2e7d32',
                    fontWeight: 'bold'
                  }}>
                    ADMIN-{String(index + 1).padStart(3, '0')}
                  </span>
                </td>
                <td>
                  <span style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '12px', 
                    color: '#666' 
                  }}>
                    {admin.id}
                  </span>
                </td>
                <td>{admin.name || 'N/A'}</td>
                <td>{admin.username || admin.email || 'N/A'}</td>
                <td>
                  <span style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '12px', 
                    color: '#666' 
                  }}>
                    ••••••••
                  </span>
                </td>
                <td>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: admin.role === 'superadmin' ? '#e8f5e8' : '#fff3e0',
                    color: admin.role === 'superadmin' ? '#2e7d32' : '#f57c00'
                  }}>
                    {admin.role || 'N/A'}
                  </span>
                </td>
                <td>
                  {role === "superadmin" && (
                    <button
                      className="edit-btn"
                      title="Edit"
                      onClick={() => openEditModal(admin)}
                    >
                      <FaUserEdit />
                    </button>
                  )}
                  {role !== "superadmin" && (
                    <span style={{ color: '#999', fontSize: '12px' }}>
                      No Access
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Admin</h3>
              <button className="close-modal-btn" onClick={closeEditModal}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={editedData.name}
                  onChange={handleChange}
                  placeholder="Enter admin name"
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={editedData.username}
                  onChange={handleChange}
                  placeholder="Enter username"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={editedData.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={editedData.password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  name="role"
                  value={editedData.role}
                  onChange={handleChange}
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="save-btn" onClick={handleSave}>
                <FaSave style={{ marginRight: 4 }} /> Save Changes
              </button>
              <button className="cancel-btn" onClick={closeEditModal}>
                <FaTimes style={{ marginRight: 4 }} /> Cancel
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
              <h3>Confirm Print Manage Admin Summary</h3>
              <button className="close-modal-btn" onClick={handlePrintCancel}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to print the manage admin summary?</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                This will generate a PDF file with all admin management data and information.
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

export default ManageAdmin;