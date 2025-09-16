import { collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FaPlus, FaSave, FaTimes, FaTrashAlt, FaUserEdit, FaUserShield } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import LogoutButton from '../../components/LogoutButton';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import '../../styles/AdminRecordsPage.css';

const ManageAdmin = () => {
  const [admins, setAdmins] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
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

  const toggleExpand = (id, admin) => {
    if (expandedRow === id) {
      setExpandedRow(null);
    } else {
      setExpandedRow(id);
      setEditedData({
        name: admin.name || '',
        email: admin.email || '',
        role: admin.role || ''
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

  const handleChange = (e) => {
    setEditedData({ ...editedData, [e.target.name]: e.target.value });
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
        <Navbar role={role} />
        <p>Access denied. Only Super Admin can view this page.</p>
      </div>
    );
  }

  return (
    <div className="user-records-container">
      <Navbar role={role} />
      <header className="dashboard-topbar">
        <h2 className="manage-admin-main-title">
          <FaUserShield style={{ color: "#4CAF50" }} /> Manage Admin
        </h2>
        <div className="dashboard-profile-actions">
          <span className="dashboard-admin-name">{adminName}</span>
          <LogoutButton />
        </div>
      </header>
      <div className="header">
        <div className="header-buttons">
          <button className="add-btn" onClick={() => navigate('/register')}>
            <FaPlus style={{ marginRight: 4 }} /> Add Admin
          </button>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="records-table">
          <thead>
            <tr>
              <th>Admin ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(admin => (
              <React.Fragment key={admin.id}>
                <tr onClick={() => toggleExpand(admin.id, admin)} className="hoverable-row">
                  <td>
                    <span className="menu-icon">⋮</span> {admin.id}
                  </td>
                  <td>{admin.name || 'N/A'}</td>
                  <td>{admin.role || 'N/A'}</td>
                  <td>
                    <button
                      className="edit-btn"
                      title="Edit"
                      onClick={(e) => { e.stopPropagation(); toggleExpand(admin.id, admin); }}
                    >
                      <FaUserEdit />
                    </button>
                    <button
                      className="delete-btn"
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); handleDelete(admin.id); }}
                    >
                      <FaTrashAlt />
                    </button>
                  </td>
                </tr>
                {expandedRow === admin.id && (
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

                        <label>Edit Role</label>
                        <input
                          type="text"
                          name="role"
                          value={editedData.role}
                          onChange={handleChange}
                        />

                        <div className="action-buttons">
                          <button className="save-btn" onClick={() => handleSave(admin.id)}>
                            <FaSave style={{ marginRight: 4 }} /> Save
                          </button>
                          <button className="cancel-btn" onClick={() => setExpandedRow(null)}>
                            <FaTimes style={{ marginRight: 4 }} /> Cancel
                          </button>
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
    </div>
  );
};

export default ManageAdmin;