import React, { useState, useEffect } from 'react';
import '../../../styles/UserRecordsPage.css';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase'; // adjust path as needed

const UserReportLogPage = () => {
  const navigate = useNavigate();
  const [expandedRow, setExpandedRow] = useState(null);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const fetchReports = async () => {
      const querySnapshot = await getDocs(collection(db, 'reports'));
      const reportList = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        reportList.push({
          id: doc.id,
          uid: data.uid || 'Unknown User',
          problemType: data.type || 'Unknown Type',
          message: data.message || '',
          imageUrl: data.imageUrl || null,
          status: 'Pending' // default since it's not in Firestore yet
        });
      });
      setReports(reportList);
    };

    fetchReports();
  }, []);

  const toggleExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleDelete = (id) => {
    alert(`Pretending to delete report with ID: ${id}`);
  };

  const handleMarkAsSolved = (id) => {
    setReports(prev =>
      prev.map(report =>
        report.id === id ? { ...report, status: 'Solved' } : report
      )
    );
    alert(`Marked report ${id} as solved.`);
  };

  return (
    <div className="user-records-container">
      <div className="back-button" onClick={() => navigate(-1)}>← Back</div>
      <div className="header">
        <h2>User Reports</h2>
      </div>
      <div className="table-wrapper">
        <table className="records-table">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>User ID</th>
              <th>Problem Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(report => (
              <React.Fragment key={report.id}>
                <tr onClick={() => toggleExpand(report.id)} className="hoverable-row">
                  <td><span className="menu-icon">⋮</span> {report.id}</td>
                  <td>{report.uid}</td>
                  <td>{report.problemType}</td>
                  <td style={{ fontWeight: 'bold', color: report.status === 'Solved' ? 'green' : '#e65100' }}>
                    {report.status}
                  </td>
                </tr>
                {expandedRow === report.id && (
                  <tr className="expanded-row">
                    <td colSpan="4">
                      <div className="edit-form">
                        <label>Description / Message:</label>
                        <p>{report.message}</p>

                        {report.imageUrl && (
                          <>
                            <label>Uploaded Image:</label>
                            <img
                              src={report.imageUrl}
                              alt="Report Screenshot"
                              style={{ maxWidth: '100%', borderRadius: '10px', marginTop: '10px' }}
                            />
                          </>
                        )}

                        <div className="action-buttons">
                          <div className="left-buttons">
                            {report.status === 'Pending' && (
                              <button className="save-btn" onClick={() => handleMarkAsSolved(report.id)}>
                                Mark as Solved
                              </button>
                            )}
                            <button onClick={() => setExpandedRow(null)}>Close</button>
                          </div>
                          <button className="delete-btn" onClick={() => handleDelete(report.id)}>Delete Report</button>
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

export default UserReportLogPage;
