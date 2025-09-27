import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Admin Status Tracker - Tracks online/offline status for all admin types
 */
class AdminStatusTracker {
  constructor() {
    this.adminId = null;
    this.adminName = null;
    this.isTracking = false;
    this.heartbeatInterval = null;
    this.lastSeenInterval = null;
    this.visibilityHandler = null;
    this.beforeUnloadHandler = null;
    this.onlineStatusInterval = null;
    this.onlineStatusCallbacks = new Set();
  }

  /**
   * Start tracking admin status
   * @param {string} adminId - The admin's Firebase UID
   * @param {string} adminName - The admin's display name
   */
  startTracking(adminId, adminName) {
    if (this.isTracking) {
      this.stopTracking();
    }

    this.adminId = adminId;
    this.adminName = adminName;
    this.isTracking = true;

    // Update last seen immediately
    this.updateLastSeen();

    // Set up event listeners
    this.setupEventListeners();

    // Start heartbeat to update last seen every 30 seconds
    this.startHeartbeat();

    // Start periodic online status updates
    this.startOnlineStatusUpdates();

    console.log(`Admin status tracking started for: ${adminName} (${adminId})`);
  }

  /**
   * Stop tracking admin status
   */
  stopTracking() {
    if (!this.isTracking) return;

    this.isTracking = false;

    // Mark as offline
    this.markOffline();

    // Clear intervals
    this.stopHeartbeat();
    this.stopOnlineStatusUpdates();

    // Remove event listeners
    this.removeEventListeners();

    console.log(`Admin status tracking stopped for: ${this.adminName}`);
  }

  /**
   * Update last seen timestamp in Firestore
   */
  async updateLastSeen() {
    if (!this.adminId) return;

    try {
      // Find the admin document
      const adminQuery = query(collection(db, "admins"), where("adminId", "==", this.adminId));
      const adminSnapshot = await getDocs(adminQuery);

      if (!adminSnapshot.empty) {
        const adminDoc = adminSnapshot.docs[0];
        await updateDoc(doc(db, "admins", adminDoc.id), {
          lastSeen: new Date()
        });
      }
    } catch (error) {
      console.error("Error updating last seen:", error);
    }
  }

  /**
   * Mark admin as offline
   */
  async markOffline() {
    if (!this.adminId) return;

    try {
      // Find the admin document
      const adminQuery = query(collection(db, "admins"), where("adminId", "==", this.adminId));
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
      console.error("Error marking admin offline:", error);
    }
  }

  /**
   * Check if an admin is online based on lastSeen timestamp
   * @param {Object} admin - Admin document data
   * @returns {boolean} - True if online, false if offline
   */
  checkOnlineStatus(admin) {
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
  }

  /**
   * Get online status for all admins
   * @returns {Promise<Object>} - Object with adminId as key and online status as value
   */
  async getAllAdminsOnlineStatus() {
    try {
      const adminsRef = collection(db, "admins");
      const adminsSnapshot = await getDocs(adminsRef);
      const onlineStatus = {};

      adminsSnapshot.forEach((doc) => {
        const adminData = doc.data();
        onlineStatus[adminData.adminId] = this.checkOnlineStatus(adminData);
      });

      return onlineStatus;
    } catch (error) {
      console.error("Error getting all admins online status:", error);
      return {};
    }
  }

  /**
   * Subscribe to online status updates
   * @param {Function} callback - Callback function to receive status updates
   */
  subscribeToOnlineStatus(callback) {
    this.onlineStatusCallbacks.add(callback);
  }

  /**
   * Unsubscribe from online status updates
   * @param {Function} callback - Callback function to remove
   */
  unsubscribeFromOnlineStatus(callback) {
    this.onlineStatusCallbacks.delete(callback);
  }

  /**
   * Notify all subscribers of online status updates
   */
  async notifyOnlineStatusSubscribers() {
    const onlineStatus = await this.getAllAdminsOnlineStatus();
    this.onlineStatusCallbacks.forEach(callback => {
      try {
        callback(onlineStatus);
      } catch (error) {
        console.error("Error in online status callback:", error);
      }
    });
  }

  /**
   * Start heartbeat to update last seen timestamp
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isTracking) {
        this.updateLastSeen();
      }
    }, 30000); // Update every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Start periodic online status updates
   */
  startOnlineStatusUpdates() {
    this.onlineStatusInterval = setInterval(() => {
      if (this.isTracking) {
        this.notifyOnlineStatusSubscribers();
      }
    }, 10000); // Update every 10 seconds
  }

  /**
   * Stop online status updates
   */
  stopOnlineStatusUpdates() {
    if (this.onlineStatusInterval) {
      clearInterval(this.onlineStatusInterval);
      this.onlineStatusInterval = null;
    }
  }

  /**
   * Set up event listeners for page visibility and unload
   */
  setupEventListeners() {
    // Handle page visibility change
    this.visibilityHandler = () => {
      if (document.hidden) {
        console.log('Page hidden - admin might be offline');
      } else {
        // Page is visible again, update last seen
        this.updateLastSeen();
      }
    };

    // Handle page unload
    this.beforeUnloadHandler = () => {
      if (this.adminId) {
        this.markOffline();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
  }

  /**
   * Get current tracking info
   * @returns {Object} - Current tracking information
   */
  getTrackingInfo() {
    return {
      adminId: this.adminId,
      adminName: this.adminName,
      isTracking: this.isTracking
    };
  }
}

// Create and export a singleton instance
const adminStatusTracker = new AdminStatusTracker();
export default adminStatusTracker;

