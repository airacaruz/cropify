import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Sample function to add test audit logs
export const addSampleAuditLogs = async () => {
  const sampleLogs = [
    {
      adminId: "sample_admin_uid_1",
      adminName: "Super Admin",
      action: "login",
      details: "Super admin logged into the system"
    },
    {
      adminId: "sample_admin_uid_2", 
      adminName: "Regular Admin",
      action: "view",
      details: "Admin viewed the dashboard"
    },
    {
      adminId: "sample_admin_uid_1",
      adminName: "Super Admin", 
      action: "create",
      details: "Super admin added new admin user"
    },
    {
      adminId: "sample_admin_uid_2",
      adminName: "Regular Admin",
      action: "click", 
      details: "Admin clicked print dashboard summary"
    },
    {
      adminId: "sample_admin_uid_1",
      adminName: "Super Admin",
      action: "logout",
      details: "Super admin logged out of the system"
    }
  ];

  try {
    for (const log of sampleLogs) {
      await addDoc(collection(db, 'admin_audit_logs'), {
        ...log,
        timestamp: serverTimestamp()
      });
    }
    console.log('Sample audit logs added successfully');
  } catch (error) {
    console.error('Error adding sample audit logs:', error);
  }
};

// Call this function once to add sample data
// addSampleAuditLogs();
