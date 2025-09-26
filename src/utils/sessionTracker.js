import { adminAuditActions } from './adminAuditLogger';

/**
 * Session tracking utility for admin activities
 * Tracks browser exit, page unload, and session timeouts
 */
class SessionTracker {
  constructor() {
    this.adminId = null;
    this.adminName = null;
    this.sessionStartTime = null;
    this.isTracking = false;
    this.heartbeatInterval = null;
    this.lastActivity = null;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
  }

  /**
   * Initialize session tracking for an admin
   * @param {string} adminId - The admin's Firebase UID
   * @param {string} adminName - The admin's display name
   */
  startTracking(adminId, adminName) {
    if (this.isTracking) {
      this.stopTracking();
    }

    this.adminId = adminId;
    this.adminName = adminName;
    this.sessionStartTime = new Date();
    this.lastActivity = new Date();
    this.isTracking = true;

    // Set up event listeners
    this.setupEventListeners();
    
    // Start heartbeat to track session activity
    this.startHeartbeat();

    console.log(`Session tracking started for admin: ${adminName}`);
  }

  /**
   * Stop session tracking
   */
  stopTracking() {
    if (!this.isTracking) return;

    this.isTracking = false;
    this.removeEventListeners();
    this.stopHeartbeat();

    console.log(`Session tracking stopped for admin: ${this.adminName}`);
  }

  /**
   * Set up event listeners for browser exit and page unload
   */
  setupEventListeners() {
    // Track browser exit/close
    this.handleBeforeUnload = (event) => {
      if (this.isTracking && this.adminId && this.adminName) {
        // Use sendBeacon for reliable logging even when page is unloading
        this.logBrowserExit();
      }
    };

    // Track page visibility changes (tab switching, minimizing)
    this.handleVisibilityChange = () => {
      if (document.hidden) {
        this.lastActivity = new Date();
      }
    };

    // Track page unload
    this.handleUnload = () => {
      if (this.isTracking && this.adminId && this.adminName) {
        this.logBrowserExit();
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('unload', this.handleUnload);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Track user activity
    this.handleActivity = () => {
      this.lastActivity = new Date();
    };

    // Track various user activities
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, this.handleActivity, true);
    });
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    if (this.handleBeforeUnload) {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    if (this.handleUnload) {
      window.removeEventListener('unload', this.handleUnload);
    }
    if (this.handleVisibilityChange) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (this.handleActivity) {
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
        document.removeEventListener(event, this.handleActivity, true);
      });
    }
  }

  /**
   * Start heartbeat to monitor session activity
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (!this.isTracking) return;

      const now = new Date();
      const timeSinceLastActivity = now - this.lastActivity;

      // Check for session timeout
      if (timeSinceLastActivity > this.sessionTimeout) {
        this.logSessionTimeout();
        this.stopTracking();
      }
    }, 60000); // Check every minute
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
   * Log browser exit using sendBeacon for reliability
   */
  logBrowserExit() {
    try {
      // Create a simple log entry for browser exit
      const logData = {
        adminId: this.adminId,
        adminName: this.adminName,
        action: 'browser_exit',
        details: 'Admin exited browser or closed tab',
        timestamp: new Date().toISOString(),
        sessionDuration: this.getSessionDuration()
      };

      // Use sendBeacon for reliable delivery even during page unload
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(logData)], { type: 'application/json' });
        navigator.sendBeacon('/api/log-browser-exit', blob);
      }

      // Also try to log through the normal audit system
      adminAuditActions.browserExit(this.adminId, this.adminName);
    } catch (error) {
      console.error('Error logging browser exit:', error);
    }
  }

  /**
   * Log session timeout
   */
  logSessionTimeout() {
    try {
      adminAuditActions.sessionTimeout(this.adminId, this.adminName);
    } catch (error) {
      console.error('Error logging session timeout:', error);
    }
  }

  /**
   * Get session duration in minutes
   */
  getSessionDuration() {
    if (!this.sessionStartTime) return 0;
    return Math.round((new Date() - this.sessionStartTime) / (1000 * 60));
  }

  /**
   * Update admin info (useful when admin info changes)
   */
  updateAdminInfo(adminId, adminName) {
    this.adminId = adminId;
    this.adminName = adminName;
  }

  /**
   * Get current session info
   */
  getSessionInfo() {
    return {
      adminId: this.adminId,
      adminName: this.adminName,
      sessionStartTime: this.sessionStartTime,
      lastActivity: this.lastActivity,
      sessionDuration: this.getSessionDuration(),
      isTracking: this.isTracking
    };
  }
}

// Create a singleton instance
const sessionTracker = new SessionTracker();

export default sessionTracker;
