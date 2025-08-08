import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase'; // Make sure this import is correct
import '../../styles/UserRecordsPage.css';

const UserRecordsPage = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(data);
    });

    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, []);

  return (
    <div className="user-records-container">
      <h2>User Records</h2>
      <div className="table-wrapper">
        <table className="records-table">
          <thead>
            <tr>
              <th>UID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone Number</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.uid}>
                <td>{user.uid}</td>
                <td>{user.name || 'N/A'}</td>
                <td>{user.username || 'N/A'}</td>
                <td>{user.email || 'N/A'}</td>
                <td>{user.contact || 'N/A'}</td>
                
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserRecordsPage;
