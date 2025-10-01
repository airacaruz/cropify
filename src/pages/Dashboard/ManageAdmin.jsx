import { createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FaCheck, FaSave, FaTimes, FaTrash, FaUserEdit, FaUserPlus } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import useAdminOnlineStatus from '../../hooks/useAdminOnlineStatus';
import '../../styles/Dashboard/AdminRecords.css';
import { adminAuditActions } from '../../utils/adminAuditLogger';

const ManageAdmin = () => {
  const [admins, setAdmins] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    username: ''
  });
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(true);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [role, setRole] = useState(null);
  const [uid, setUid] = useState(null);
  // Use the custom hook for real-time online status
  const { onlineStatus } = useAdminOnlineStatus();
  const [registerMessage, setRegisterMessage] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
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

  const openRegisterModal = () => {
    setRegisterData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'admin',
      username: ''
    });
    setRegisterMessage('');
    setShowRegisterModal(true);
  };

  const closeRegisterModal = () => {
    setShowRegisterModal(false);
    setRegisterData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'admin',
      username: ''
    });
    setRegisterMessage('');
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
      
      // Show success popup
      setShowSuccessPopup(true);
      closeEditModal();
      
      // Auto-hide success popup after 3 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user.");
    }
  };

  const handleChange = (e) => {
    setEditedData({ ...editedData, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  const handleDelete = () => {
    if (!selectedAdmin) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedAdmin) {
      alert('No admin selected for deletion.');
      return;
    }
    
    if (!selectedAdmin.id) {
      alert('Invalid admin data. Cannot delete admin without ID.');
      return;
    }
    
    if (deleteLoading) {
      return; // Prevent multiple deletion attempts
    }
    
    setDeleteLoading(true);
    
    try {
      console.log('Attempting to delete admin:', selectedAdmin);
      console.log('Admin ID:', selectedAdmin.id);
      
      // Delete from Firestore database
      await deleteDoc(doc(db, 'admins', selectedAdmin.id));
      console.log('Successfully deleted admin from Firestore');
      
      // Log the delete admin action
      if (uid && adminName) {
        try {
          await adminAuditActions.deleteAdmin(uid, adminName, selectedAdmin.name);
          console.log('Successfully logged delete action');
        } catch (auditError) {
          console.warn('Failed to log delete action:', auditError);
          // Don't fail the entire operation if audit logging fails
        }
      }
      
      alert('Admin deleted successfully from the database!');
      setShowDeleteModal(false);
      closeEditModal();
    } catch (error) {
      console.error("Error deleting admin:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        adminId: selectedAdmin?.id,
        adminName: selectedAdmin?.name
      });
      
      // Provide more specific error messages
      let errorMessage = "Failed to delete admin.";
      
      if (error.code === 'permission-denied') {
        errorMessage = "Permission denied. You don't have the right to delete this admin.";
      } else if (error.code === 'not-found') {
        errorMessage = "Admin not found in the database.";
      } else if (error.code === 'unavailable') {
        errorMessage = "Service temporarily unavailable. Please try again.";
      } else if (error.code === 'failed-precondition') {
        errorMessage = "Cannot delete admin. The document may have been modified.";
      } else if (error.message) {
        errorMessage = `Failed to delete admin: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterMessage('');

    try {
      // Validate form data
      if (!registerData.name || !registerData.email || !registerData.password || !registerData.username) {
        setRegisterMessage('Please fill in all required fields.');
        setRegisterLoading(false);
        return;
      }

      if (registerData.password !== registerData.confirmPassword) {
        setRegisterMessage('Passwords do not match.');
        setRegisterLoading(false);
        return;
      }

      if (registerData.password.length < 6) {
        setRegisterMessage('Password must be at least 6 characters long.');
        setRegisterLoading(false);
        return;
      }

      // Check if email already exists
      const emailQuery = query(collection(db, "admins"), where("email", "==", registerData.email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        setRegisterMessage('An admin with this email already exists.');
        setRegisterLoading(false);
        return;
      }

      // Check if username already exists
      const usernameQuery = query(collection(db, "admins"), where("username", "==", registerData.username));
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (!usernameSnapshot.empty) {
        setRegisterMessage('An admin with this username already exists.');
        setRegisterLoading(false);
        return;
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, registerData.email, registerData.password);
      const newUser = userCredential.user;

      // Add admin data to Firestore
      const adminData = {
        adminId: newUser.uid,
        name: registerData.name,
        email: registerData.email,
        username: registerData.username,
        password: registerData.password, // Note: In production, this should be hashed
        role: registerData.role,
        createdAt: new Date(),
        createdBy: uid,
        createdByName: adminName
      };

      await addDoc(collection(db, 'admins'), adminData);

      // Log the admin creation action
      if (uid && adminName) {
        await adminAuditActions.createAdmin(uid, adminName, registerData.name);
      }

      setRegisterMessage('Admin created successfully!');
      setTimeout(() => {
        closeRegisterModal();
      }, 1500);

    } catch (error) {
      console.error("Error creating admin:", error);
      
      if (error.code === 'auth/email-already-in-use') {
        setRegisterMessage('An account with this email already exists.');
      } else if (error.code === 'auth/weak-password') {
        setRegisterMessage('Password is too weak.');
      } else if (error.code === 'auth/invalid-email') {
        setRegisterMessage('Invalid email address.');
      } else {
        setRegisterMessage('Failed to create admin. Please try again.');
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  // Online status is now handled by the centralized adminStatusTracker


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
      <Navbar role={role} adminName={adminName} adminId={uid} />
      <div className="header">
        <div className="header-buttons">
          {role === "superadmin" && (
            <button className="add-btn" onClick={openRegisterModal}>
              <FaUserPlus style={{ marginRight: 4 }} /> Add Admin
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
              <th style={{ width: "100px" }}>Status</th>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: onlineStatus[admin.adminId] ? '#4CAF50' : '#f44336'
                    }}></div>
                    <span style={{
                      fontSize: '12px',
                      color: onlineStatus[admin.adminId] ? '#4CAF50' : '#f44336',
                      fontWeight: '500'
                    }}>
                      {onlineStatus[admin.adminId] ? 'Online' : 'Offline'}
                    </span>
                  </div>
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
              <div className="modal-footer-left">
                <button className="cancel-btn" onClick={closeEditModal}>
                  <FaTimes style={{ marginRight: 4 }} /> Cancel
                </button>
              </div>
              <div className="modal-footer-right">
                <button className="delete-btn" onClick={handleDelete}>
                  <FaTrash style={{ marginRight: 4 }} /> Delete Admin
                </button>
                <button className="save-btn" onClick={handleSave}>
                  <FaSave style={{ marginRight: 4 }} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={closeRegisterModal}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Admin</h3>
              <button className="close-modal-btn" onClick={closeRegisterModal}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleRegister}>
              <div className="modal-body">
                {registerMessage && (
                  <div className={`message ${registerMessage.includes('successfully') ? 'success' : 'error'}`}>
                    {registerMessage}
                  </div>
                )}
                
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={registerData.name}
                    onChange={handleRegisterChange}
                    placeholder="Enter full name"
                    required
                    disabled={registerLoading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={registerData.username}
                    onChange={handleRegisterChange}
                    placeholder="Enter username"
                    required
                    disabled={registerLoading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={registerData.email}
                    onChange={handleRegisterChange}
                    placeholder="Enter email address"
                    required
                    disabled={registerLoading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={registerData.password}
                    onChange={handleRegisterChange}
                    placeholder="Enter password (min 6 characters)"
                    required
                    disabled={registerLoading}
                    minLength={6}
                  />
                </div>
                
                <div className="form-group">
                  <label>Confirm Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={registerData.confirmPassword}
                    onChange={handleRegisterChange}
                    placeholder="Confirm password"
                    required
                    disabled={registerLoading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    name="role"
                    value={registerData.role}
                    onChange={handleRegisterChange}
                    required
                    disabled={registerLoading}
                  >
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="submit" 
                  className="save-btn" 
                  disabled={registerLoading}
                >
                  {registerLoading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #fff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginRight: '8px'
                      }}></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FaUserPlus style={{ marginRight: 4 }} /> Create Admin
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="cancel-btn" 
                  onClick={closeRegisterModal}
                  disabled={registerLoading}
                >
                  <FaTimes style={{ marginRight: 4 }} /> Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Admin</h3>
              <button className="close-modal-btn" onClick={cancelDelete}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-warning">
                <div className="warning-icon">⚠️</div>
                <h4>Are you sure you want to delete this admin?</h4>
                <p>
                  You are about to delete <strong>{selectedAdmin?.name}</strong> from the system.
                </p>
                <div className="admin-details">
                  <p><strong>Email:</strong> {selectedAdmin?.email}</p>
                  <p><strong>Role:</strong> {selectedAdmin?.role}</p>
                  <p><strong>Username:</strong> {selectedAdmin?.username || 'N/A'}</p>
                </div>
                <div className="warning-message">
                  <p><strong>⚠️ Warning:</strong> This action cannot be undone. The admin will be permanently removed from the database and will lose access to the system.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <div className="modal-footer-left">
                <button 
                  className="cancel-btn" 
                  onClick={cancelDelete}
                  disabled={deleteLoading}
                >
                  <FaTimes style={{ marginRight: 4 }} /> Cancel
                </button>
              </div>
              <div className="modal-footer-right">
                <button 
                  className="delete-btn" 
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #fff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginRight: '8px'
                      }}></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FaTrash style={{ marginRight: 4 }} /> Delete Admin
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="success-popup-overlay">
          <div className="success-popup">
            <div className="success-icon">
              <FaCheck />
            </div>
            <h3>Editing Complete!</h3>
            <p>Admin details have been successfully updated.</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageAdmin;