import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import '../../styles/AdminRecordsPage.css';
import { useNavigate } from 'react-router-dom';

const UserRecordsPage = () => {
  const [users, setUsers] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(data);
    });

    return () => unsubscribe();
  }, []);

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

  const handleChange = (e) => {
    setEditedData({ ...editedData, [e.target.name]: e.target.value });
  };

  return (
    <div className="user-records-container">
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
    </div>
  );
};

export default UserRecordsPage;
