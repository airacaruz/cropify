import React, { useEffect, useState } from 'react';
import { collection, collectionGroup, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import '../../../styles/UserRecordsPage.css';

const UserSessionsPage = () => {
  const [activeTab, setActiveTab] = useState('sessions');
  const [logs, setLogs] = useState([]);
  const [screenLogs, setScreenLogs] = useState([]);

  // Fetch login/logout sessions
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'userlogs'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      const sessions = data.filter(log => log.type === 'login' || log.type === 'logout');
      setLogs(sessions);
    });

    return () => unsubscribe();
  }, []);

  // Fetch screen visit logs
  useEffect(() => {
    const fetchScreenLogs = async () => {
      const snapshot = await getDocs(collectionGroup(db, 'screenVisited'));
      const screenData = snapshot.docs.map(doc => {
        const pathParts = doc.ref.path.split('/');
        const userId = pathParts[1];
        return {
          visitId: doc.id,
          userId,
          ...doc.data(),
        };
      });
      setScreenLogs(screenData);
    };

    fetchScreenLogs();
  }, []);

  return (
    <div className="user-records-container">
      <h2>User Logs</h2>

      {/* Tab Switcher */}
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setActiveTab('sessions')} style={{ marginRight: 10 }}>
          User Sessions
        </button>
        <button onClick={() => setActiveTab('screens')}>
          Screen Logs
        </button>
      </div>

      {/* User Sessions Table */}
      {activeTab === 'sessions' && (
        <table className="records-table">
          <thead>
            <tr>
              <th>UID</th>
              <th>Email</th>
              <th>Timestamp</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td>{log.uid}</td>
                <td>{log.email}</td>
                <td>{new Date(log.timestamp?.seconds * 1000).toLocaleString()}</td>
                <td>{log.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Screen Visit Logs Table */}
      {activeTab === 'screens' && (
        <table className="records-table">
          <thead>
            <tr>
              <th>Visit ID</th>
              <th>User ID</th>
              <th>Screen Name</th>
              <th>Visited At</th>
            </tr>
          </thead>
          <tbody>
            {screenLogs.map(log => (
              <tr key={log.visitId}>
                <td>{log.visitId}</td>
                <td>{log.userId}</td>
                <td>{log.screenName}</td>
                <td>{new Date(log.visitedAt?.seconds * 1000).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserSessionsPage;
