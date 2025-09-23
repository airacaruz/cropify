import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import '../../styles/UserRecordsPage.css';
import { adminAuditActions } from '../../utils/adminAuditLogger';

const exportUserManagementPDF = async ({
    users,
    totalUsers,
    usersWithNames,
    usersWithUsernames,
    usersWithContacts,
    profileCompletionRate
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
    doc.text('Cropify User Management Report', margin, yPosition);
    yPosition += 15;
    
    doc.setFontSize(12);
    doc.text('Comprehensive user management and profile information for Cropify platform', margin, yPosition);
    yPosition += 30;

    // Add Executive Summary
    doc.setFontSize(16);
    doc.text('Executive Summary', 20, yPosition);
    yPosition += 15;
    
    doc.setFontSize(11);
    const summaryText = [
        'This report provides a comprehensive analysis of user management within the Cropify platform,',
        'including user profiles, contact information, and account management activities.',
        'Key findings include user registration patterns, profile completion rates,',
        'and detailed user information for administrative oversight and support.'
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
        ['Total Users', totalUsers.toString(), 'Growing', 'Active'],
        ['Users with Names', usersWithNames.toString(), usersWithNames > 0 ? 'Good' : 'Needs Attention', usersWithNames > 0 ? 'Good' : 'Needs Attention'],
        ['Users with Usernames', usersWithUsernames.toString(), usersWithUsernames > 0 ? 'Good' : 'Needs Attention', usersWithUsernames > 0 ? 'Good' : 'Needs Attention'],
        ['Users with Contacts', usersWithContacts.toString(), usersWithContacts > 0 ? 'Good' : 'Needs Attention', usersWithContacts > 0 ? 'Good' : 'Needs Attention'],
        ['Profile Completion Rate', `${profileCompletionRate}%`, parseFloat(profileCompletionRate) > 70 ? 'Excellent' : 'Needs Improvement', parseFloat(profileCompletionRate) > 70 ? 'Excellent' : 'Needs Improvement']
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

    // Add User Analytics Section
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.text('User Analytics & Profile Management', margin, yPosition);
    yPosition += 15;
    
    if (users && users.length > 0) {
        // Calculate user analytics
        const incompleteProfiles = users.filter(user => !user.name || !user.username || !user.contact).length;
        const completeProfiles = totalUsers - incompleteProfiles;
        const recentUsers = users.filter(user => {
            if (user.createdAt) {
                const createdDate = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return createdDate > thirtyDaysAgo;
            }
            return false;
        }).length;
        
        doc.setFontSize(12);
        doc.text('User Profile Analysis:', margin, yPosition);
        yPosition += 10;
        
        const userMetrics = [
            `• Total registered users: ${totalUsers}`,
            `• Complete profiles: ${completeProfiles} (${totalUsers > 0 ? ((completeProfiles / totalUsers) * 100).toFixed(1) : 0}%)`,
            `• Incomplete profiles: ${incompleteProfiles} (${totalUsers > 0 ? ((incompleteProfiles / totalUsers) * 100).toFixed(1) : 0}%)`,
            `• Recent registrations (30 days): ${recentUsers}`,
            `• Users with contact info: ${usersWithContacts} (${totalUsers > 0 ? ((usersWithContacts / totalUsers) * 100).toFixed(1) : 0}%)`
        ];
        
        userMetrics.forEach(metric => {
            checkPageBreak(8);
            doc.text(metric, margin + 5, yPosition);
            yPosition += 7;
        });
        
        yPosition += 15;
        
        // Enhanced user data table (showing first 20 records)
        const userTableData = users.slice(0, 20).map(user => [
            user.uid.substring(0, 12) + '...',
            user.name || 'N/A',
            user.username || 'N/A',
            user.contact || 'N/A',
            user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : new Date(user.createdAt).toLocaleDateString()) : 'N/A'
        ]);
        
        autoTable(doc, {
            head: [['User ID', 'Name', 'Username', 'Phone Number', 'Registration Date']],
            body: userTableData,
            startY: yPosition,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [76, 175, 80] },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        
        if (users.length > 20) {
            yPosition = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.text(`* Showing first 20 of ${users.length} total users`, margin, yPosition);
        }
        
        yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Add Insights & Recommendations Section
    doc.setFontSize(16);
    doc.text('Insights & Recommendations', 20, yPosition);
    yPosition += 15;
    
    if (users && users.length > 0) {
        doc.setFontSize(11);
        const insights = [
            '• Monitor profile completion rates to identify users needing support',
            '• Implement profile completion incentives to improve data quality',
            '• Regular user data validation to ensure contact information accuracy',
            '• User engagement tracking to identify active vs inactive accounts',
            '• Data privacy compliance review for user information management'
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
        doc.text('• Continue monitoring user registration trends for optimal resource allocation', 20, yPosition);
        yPosition += 8;
        doc.text('• Maintain current user management practices for system health', 20, yPosition);
        yPosition += 8;
        doc.text('• Consider expanding user engagement features based on usage patterns', 20, yPosition);
    }
    
    yPosition += 20;

    // Add footer to all pages
    const pageCount = doc.internal.getNumberOfPages();
    const generatedDateTime = `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
    
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, margin, pageHeight - 10);
        doc.text('Cropify User Management Report', pageWidth - 80, pageHeight - 10);
        doc.text(generatedDateTime, margin, pageHeight - 20);
    }

    doc.save('Cropify_User_Management_Report.pdf');
};

const UserRecordsPage = () => {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', contact: '' });
  const [showEditModal, setShowEditModal] = useState(false);
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

  const handlePrintConfirm = async () => {
    // Log the print action
    if (uid && adminName) {
      await adminAuditActions.custom(uid, adminName, 'click', 'Admin printed manage users summary');
    }
    
    // Calculate user metrics
    const totalUsers = users.length;
    const usersWithNames = users.filter(user => user.name && user.name.trim() !== '').length;
    const usersWithUsernames = users.filter(user => user.username && user.username.trim() !== '').length;
    const usersWithContacts = users.filter(user => user.contact && user.contact.trim() !== '').length;
    const profileCompletionRate = totalUsers > 0 ? ((usersWithNames + usersWithUsernames + usersWithContacts) / (totalUsers * 3) * 100).toFixed(1) : 0;
    
    exportUserManagementPDF({
      users,
      totalUsers,
      usersWithNames,
      usersWithUsernames,
      usersWithContacts,
      profileCompletionRate
    });
    setShowPrintConfirmModal(false);
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

      {/* Print Confirmation Modal */}
      {showPrintConfirmModal && (
        <div className="modal-overlay" onClick={handlePrintCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Print Manage Users Summary</h3>
              <button className="close-modal-btn" onClick={handlePrintCancel}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to print the manage users summary?</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                This will generate a PDF file with all user data and information.
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

export default UserRecordsPage;
