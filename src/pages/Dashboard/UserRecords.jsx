import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import '../../styles/UserRecordsPage.css';
import { adminAuditActions } from '../../utils/adminAuditLogger';

const UserRecordsPage = () => {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', contact: '' });
  const [showEditModal, setShowEditModal] = useState(false);
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

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(data);
    });

    // Clean up the listeners when component unmounts
    return () => {
      unsubscribeAuth();
      unsubscribeUsers();
    };
  }, [navigate]);

  // Log when admin views the manage users page
  useEffect(() => {
    if (uid && adminName && role) {
      adminAuditActions.viewManageUsers(uid, adminName);
    }
  }, [uid, adminName, role]);

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      username: user.username || '',
      contact: user.contact || ''
    });
    setShowEditModal(true);
    
    // Log edit action
    if (uid && adminName) {
      adminAuditActions.custom(uid, adminName, 'click', `Admin clicked edit for user: ${user.name || user.username || user.uid}`);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        name: editForm.name,
        username: editForm.username,
        contact: editForm.contact
      });
      
      // Log successful user update
      if (uid && adminName) {
        adminAuditActions.editUser(uid, adminName, editForm.name || editForm.username || editingUser.uid);
      }
      
      setShowEditModal(false);
      setEditingUser(null);
      setEditForm({ name: '', username: '', contact: '' });
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    }
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingUser(null);
    setEditForm({ name: '', username: '', contact: '' });
  };

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
    doc.text('Manage Users Report', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Comprehensive user management and profile information', margin, yPosition);
    yPosition += 15;

    // Statistics
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Statistics', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Users: ${users.length}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Users with Names: ${users.filter(user => user.name).length}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Users with Phone Numbers: ${users.filter(user => user.contact).length}`, margin, yPosition);
    yPosition += 10;

    // Users Table
    checkPageBreak(40);
    const tableData = users.map(user => [
      user.uid,
      user.name || 'N/A',
      user.username || 'N/A',
      user.contact || 'N/A'
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['UID', 'Name', 'Username', 'Phone Number']],
      body: tableData,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40 },
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
      doc.text('Cropify Manage Users Report', pageWidth - 80, pageHeight - 10);
      doc.text(generatedDateTime, margin, pageHeight - 20);
    }

    doc.save('Cropify_Manage_Users_Report.pdf');
  };

  return (
    <div className="user-records-container">
      <Navbar role={role} adminName={adminName} onPrintSummary={exportToPDF} />
      
      <div className="table-wrapper">
        <table className="records-table">
          <thead>
            <tr>
              <th>UID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Phone Number</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.uid}>
                <td>{user.uid}</td>
                <td>{user.name || 'N/A'}</td>
                <td>{user.username || 'N/A'}</td>
                <td>{user.contact || 'N/A'}</td>
                <td>
                  <button 
                    className="edit-btn"
                    onClick={() => handleEditClick(user)}
                    title="Edit User"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit User</h3>
              <button 
                className="close-modal-btn"
                onClick={handleEditCancel}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-body">
              <div className="form-group">
                <label htmlFor="edit-name">Name:</label>
                <input
                  type="text"
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-username">Username:</label>
                <input
                  type="text"
                  id="edit-username"
                  value={editForm.username}
                  onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-contact">Phone Number:</label>
                <input
                  type="tel"
                  id="edit-contact"
                  value={editForm.contact}
                  onChange={(e) => setEditForm({...editForm, contact: e.target.value})}
                  required
                />
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={handleEditCancel}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="save-btn"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRecordsPage;
