import { createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, doc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { FaSave, FaTimes, FaUserEdit, FaUserPlus } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import '../../styles/AdminRecordsPage.css';
import { adminAuditActions } from '../../utils/adminAuditLogger';

const ManageAdmin = () => {
  const [admins, setAdmins] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
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
  const [role, setRole] = useState(null);
  const [uid, setUid] = useState(null);
  const [onlineStatus, setOnlineStatus] = useState({});
  const [registerMessage, setRegisterMessage] = useState('');
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

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
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

  // Function to update current user's last seen timestamp
  const updateLastSeen = useCallback(async () => {
    if (!uid) return;
    
    try {
      // Find the admin document for current user
      const adminQuery = query(collection(db, "admins"), where("adminId", "==", uid));
      const adminSnapshot = await getDocs(adminQuery);
      
      if (!adminSnapshot.empty) {
        const adminDoc = adminSnapshot.docs[0];
        await updateDoc(doc(db, "admins", adminDoc.id), {
          lastSeen: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error updating last seen:", error);
    }
  }, [uid]);

  // Function to mark user as offline
  const markUserOffline = useCallback(async () => {
    if (!uid) return;
    
    try {
      // Find the admin document for current user
      const adminQuery = query(collection(db, "admins"), where("adminId", "==", uid));
      const adminSnapshot = await getDocs(adminQuery);
      
      if (!adminSnapshot.empty) {
        const adminDoc = adminSnapshot.docs[0];
        // Set lastSeen to a timestamp that's older than 2 minutes to mark as offline
        const offlineTime = new Date(Date.now() - 3 * 60 * 1000); // 3 minutes ago
        await updateDoc(doc(db, "admins", adminDoc.id), {
          lastSeen: offlineTime
        });
      }
    } catch (error) {
      console.error("Error marking user offline:", error);
    }
  }, [uid]);

  // Function to check if admin is online based on lastSeen timestamp
  const checkOnlineStatus = (admin) => {
    if (!admin.lastSeen) return false;
    
    try {
      const lastSeen = admin.lastSeen.toDate ? admin.lastSeen.toDate() : new Date(admin.lastSeen);
      const now = new Date();
      const diffInMinutes = (now - lastSeen) / (1000 * 60);
      return diffInMinutes < 2; // Consider online if last seen within 2 minutes
    } catch (error) {
      console.error("Error checking online status:", error);
      return false;
    }
  };

  // Function to update online status for all admins
  const updateOnlineStatus = useCallback(() => {
    const status = {};
    admins.forEach(admin => {
      // Use adminId (Firebase Auth UID) as the key instead of document ID
      status[admin.adminId] = checkOnlineStatus(admin);
    });
    setOnlineStatus(status);
  }, [admins]);

  // Update online status when admins data changes
  useEffect(() => {
    updateOnlineStatus();
  }, [updateOnlineStatus]);

  // Update last seen timestamp every 30 seconds for current user
  useEffect(() => {
    if (!uid) return;
    
    // Update immediately
    updateLastSeen();
    
    // Then update every 30 seconds
    const interval = setInterval(updateLastSeen, 30000);
    return () => clearInterval(interval);
  }, [uid, updateLastSeen]);

  // Update online status every 10 seconds
  useEffect(() => {
    const interval = setInterval(updateOnlineStatus, 10000);
    return () => clearInterval(interval);
  }, [updateOnlineStatus]);

  // Handle page visibility change to update online status
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, user might be offline
        console.log('Page hidden - user might be offline');
      } else {
        // Page is visible again, update last seen
        updateLastSeen();
      }
    };

    const handleBeforeUnload = () => {
      // Mark user as offline when leaving the page
      if (uid) {
        markUserOffline();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [uid, updateLastSeen, markUserOffline]);

  // Cleanup: Mark user as offline when component unmounts
  useEffect(() => {
    return () => {
      if (uid) {
        markUserOffline();
      }
    };
  }, [uid, markUserOffline]);


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

    </div>
  );
};

export default ManageAdmin;