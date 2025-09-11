import React, { useState } from 'react';
import '../../../styles/UserRecordsPage.css'; // Reusing styles

const SensorLogsPage = () => {
  const [activeTab, setActiveTab] = useState('kits');
  const [expandedKitRow, setExpandedKitRow] = useState(null);
  const [expandedSessionRow, setExpandedSessionRow] = useState(null);

  // Hardcoded Sensor Kits
  const sensorKits = [
    { id: 'SK-001', isActive: true, uid: 'user123' },
    { id: 'SK-002', isActive: false, uid: 'user456' },
  ];

  // Hardcoded Sensor Sessions
  const sensorSessions = [
    {
      skid: 'SK-001',
      uid: 'user123',
      sensorType: 'All',
      ph: 6.4,
      tds: 800,
      waterTemp: 22.5,
      airTemp: 26.1,
      humidity: 60,
      timestamp: '2025-05-15 14:30',
    },
    {
      skid: 'SK-002',
      uid: 'user456',
      sensorType: 'All',
      ph: 6.9,
      tds: 900,
      waterTemp: 23.0,
      airTemp: 25.7,
      humidity: 55,
      timestamp: '2025-05-15 13:45',
    },
  ];

  const toggleKitExpand = (index) => {
    setExpandedKitRow(expandedKitRow === index ? null : index);
  };

  const toggleSessionExpand = (index) => {
    setExpandedSessionRow(expandedSessionRow === index ? null : index);
  };

  return (
    <div className="user-records-container">
      <h2>Sensor Logs</h2>

      <div className="tab-buttons">
        <button
          className={activeTab === 'kits' ? 'active' : ''}
          onClick={() => setActiveTab('kits')}
        >
          Sensor Kits
        </button>
        <button
          className={activeTab === 'sessions' ? 'active' : ''}
          onClick={() => setActiveTab('sessions')}
        >
          Sensor Sessions
        </button>
      </div>

      {/* Sensor Kits Table */}
      {activeTab === 'kits' && (
        <table className="records-table">
          <thead>
            <tr>
              <th>Sensor Kit ID</th>
              <th>Is Active</th>
              <th>UID</th>
            </tr>
          </thead>
          <tbody>
            {sensorKits.map((kit, index) => (
              <React.Fragment key={index}>
                <tr onClick={() => toggleKitExpand(index)} className="hoverable-row">
                  <td><span className="menu-icon">⋮</span> {kit.id}</td>
                  <td>{kit.isActive ? 'Yes' : 'No'}</td>
                  <td>{kit.uid}</td>
                </tr>
                {expandedKitRow === index && (
                  <tr className="expanded-row">
                    <td colSpan="3">
                      <div className="view-only-details">
                        <p><strong>Sensor Kit ID:</strong> {kit.id}</p>
                        <p><strong>Active:</strong> {kit.isActive ? 'Yes' : 'No'}</p>
                        <p><strong>UID:</strong> {kit.uid}</p>
                        <button onClick={() => setExpandedKitRow(null)}>Close</button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      {/* Sensor Sessions Table */}
      {activeTab === 'sessions' && (
        <table className="records-table">
          <thead>
            <tr>
              <th>Sensor Kit ID</th>
              <th>UID</th>
              <th>Sensor Type</th>
              <th>pH</th>
              <th>TDS (ppm)</th>
              <th>Water Temp (°C)</th>
              <th>Air Temp (°C)</th>
              <th>Humidity (%)</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {sensorSessions.map((session, index) => (
              <React.Fragment key={index}>
                <tr onClick={() => toggleSessionExpand(index)} className="hoverable-row">
                  <td><span className="menu-icon">⋮</span> {session.skid}</td>
                  <td>{session.uid}</td>
                  <td>{session.sensorType}</td>
                  <td>{session.ph}</td>
                  <td>{session.tds}</td>
                  <td>{session.waterTemp}</td>
                  <td>{session.airTemp}</td>
                  <td>{session.humidity}</td>
                  <td>{session.timestamp}</td>
                </tr>
                {expandedSessionRow === index && (
                  <tr className="expanded-row">
                    <td colSpan="9">
                      <div className="view-only-details">
                        <p><strong>Sensor Kit ID:</strong> {session.skid}</p>
                        <p><strong>User ID:</strong> {session.uid}</p>
                        <p><strong>Sensor Type:</strong> {session.sensorType}</p>
                        <p><strong>pH:</strong> {session.ph}</p>
                        <p><strong>TDS:</strong> {session.tds} ppm</p>
                        <p><strong>Water Temp:</strong> {session.waterTemp} °C</p>
                        <p><strong>Air Temp:</strong> {session.airTemp} °C</p>
                        <p><strong>Humidity:</strong> {session.humidity} %</p>
                        <p><strong>Timestamp:</strong> {session.timestamp}</p>
                        <button onClick={() => setExpandedSessionRow(null)}>Close</button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SensorLogsPage;