import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Logs admin actions to the audit trail
 * @param {string} adminId - The admin's Firebase UID
 * @param {string} adminName - The admin's display name
 * @param {string} action - The action performed (login, logout, create, update, delete, view, click)
 * @param {string} details - Additional details about the action
 */
export const logAdminAction = async (adminId, adminName, action, details) => {
  try {
    await addDoc(collection(db, 'admin_audit_logs'), {
      adminId: adminId,
      adminName: adminName,
      action: action,
      details: details,
      timestamp: serverTimestamp()
    });
    console.log('Admin action logged successfully');
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
};

/**
 * Predefined action loggers for common admin actions
 */
export const adminAuditActions = {
  // Authentication actions
  login: (adminId, adminName) => 
    logAdminAction(adminId, adminName, 'login', 'Admin logged into the system'),
  
  logout: (adminId, adminName) => 
    logAdminAction(adminId, adminName, 'logout', 'Admin logged out of the system'),
  
  // Dashboard actions
  viewDashboard: (adminId, adminName) => 
    logAdminAction(adminId, adminName, 'view', 'Admin viewed the dashboard'),
  
  printDashboard: (adminId, adminName) => 
    logAdminAction(adminId, adminName, 'click', 'Admin printed dashboard summary'),
  
  // User management actions
  viewUserLogs: (adminId, adminName) => 
    logAdminAction(adminId, adminName, 'view', 'Admin viewed user logs'),
  
  viewSensorLogs: (adminId, adminName) => 
    logAdminAction(adminId, adminName, 'view', 'Admin viewed sensor logs'),
  
  viewManageUsers: (adminId, adminName) => 
    logAdminAction(adminId, adminName, 'view', 'Admin viewed manage users page'),
  
  editUser: (adminId, adminName, userName) => 
    logAdminAction(adminId, adminName, 'update', `Admin edited user: ${userName}`),
  
  // Admin management actions
  viewManageAdmin: (adminId, adminName) => 
    logAdminAction(adminId, adminName, 'view', 'Admin viewed manage admin page'),
  
  addAdmin: (adminId, adminName, newAdminName) => 
    logAdminAction(adminId, adminName, 'create', `Admin added new admin: ${newAdminName}`),
  
  createAdmin: (adminId, adminName, newAdminName) => 
    logAdminAction(adminId, adminName, 'create', `Admin created new admin: ${newAdminName}`),
  
  editAdmin: (adminId, adminName, targetAdminName) => 
    logAdminAction(adminId, adminName, 'update', `Admin edited admin: ${targetAdminName}`),
  
  // App management actions
  viewManageApp: (adminId, adminName) => 
    logAdminAction(adminId, adminName, 'view', 'Admin viewed manage app page'),
  
  addNews: (adminId, adminName) => 
    logAdminAction(adminId, adminName, 'create', 'Admin added news article'),
  
  addTutorial: (adminId, adminName) => 
    logAdminAction(adminId, adminName, 'create', 'Admin added tutorial'),
  
  // Analytics actions
  viewAnalytics: (adminId, adminName) => 
    logAdminAction(adminId, adminName, 'view', 'Admin viewed analytics page'),
  
  printAnalytics: (adminId, adminName) => 
    logAdminAction(adminId, adminName, 'click', 'Admin printed analytics summary'),
  
  // Report actions
  viewReports: (adminId, adminName) => 
    logAdminAction(adminId, adminName, 'view', 'Admin viewed report tickets'),
  
  resolveReport: (adminId, adminName, reportId) => 
    logAdminAction(adminId, adminName, 'update', `Admin resolved report ticket: ${reportId}`),
  
  // Custom action
  custom: (adminId, adminName, action, details) => 
    logAdminAction(adminId, adminName, action, details)
};

export default adminAuditActions;
