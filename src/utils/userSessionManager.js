import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * User Session Manager
 * Handles user session tracking for proper active user counting
 */
class UserSessionManager {
  constructor() {
    this.currentSessionId = null;
    this.userId = null;
    this.heartbeatInterval = null;
    this.ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Create a new user session when user logs in
   * @param {string} userId - The user's Firebase UID
   * @returns {Promise<string>} - The session ID
   */
  async createSession(userId) {
    try {
      // End any existing sessions for this user
      await this.endAllUserSessions(userId);
      
      // Create new session
      const sessionRef = await addDoc(collection(db, 'user_logs_UserSessions'), {
        userId: userId,
        loginTime: serverTimestamp(),
        logoutTime: null,
        isActive: true,
        lastActivity: serverTimestamp(),
        sessionId: null // Will be updated after creation
      });
      
      // Update with session ID
      await updateDoc(sessionRef, { sessionId: sessionRef.id });
      
      this.currentSessionId = sessionRef.id;
      this.userId = userId;
      
      // Start heartbeat to keep session active
      this.startHeartbeat();
      
      console.log(`User session created: ${userId} -> ${sessionRef.id}`);
      return sessionRef.id;
      
    } catch (error) {
      console.error('Error creating user session:', error);
      throw error;
    }
  }

  /**
   * End the current user session when user logs out
   * @param {string} sessionId - The session ID to end
   */
  async endSession(sessionId = null) {
    try {
      const targetSessionId = sessionId || this.currentSessionId;
      
      if (!targetSessionId) {
        console.warn('No session ID provided for ending session');
        return;
      }
      
      // Stop heartbeat
      this.stopHeartbeat();
      
      // Update session as inactive
      await updateDoc(doc(db, 'user_logs_UserSessions', targetSessionId), {
        logoutTime: serverTimestamp(),
        isActive: false
      });
      
      console.log(`User session ended: ${targetSessionId}`);
      
      // Clear current session
      this.currentSessionId = null;
      this.userId = null;
      
    } catch (error) {
      console.error('Error ending user session:', error);
    }
  }

  /**
   * End all active sessions for a user
   * @param {string} userId - The user ID
   */
  async endAllUserSessions(userId) {
    try {
      const sessionsQuery = query(
        collection(db, 'user_logs_UserSessions'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );
      
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      const updatePromises = sessionsSnapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          logoutTime: serverTimestamp(),
          isActive: false
        })
      );
      
      await Promise.all(updatePromises);
      
      console.log(`Ended ${sessionsSnapshot.docs.length} sessions for user: ${userId}`);
      
    } catch (error) {
      console.error('Error ending all user sessions:', error);
    }
  }

  /**
   * Update user activity timestamp
   * @param {string} sessionId - The session ID
   */
  async updateActivity(sessionId = null) {
    try {
      const targetSessionId = sessionId || this.currentSessionId;
      
      if (!targetSessionId) return;
      
      await updateDoc(doc(db, 'user_logs_UserSessions', targetSessionId), {
        lastActivity: serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error updating user activity:', error);
    }
  }

  /**
   * Start heartbeat to keep session active
   */
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatInterval = setInterval(() => {
      this.updateActivity();
    }, 5 * 60 * 1000); // Update every 5 minutes
    
    console.log('User session heartbeat started');
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('User session heartbeat stopped');
    }
  }

  /**
   * Clean up expired sessions (sessions inactive for more than timeout period)
   */
  async cleanupExpiredSessions() {
    try {
      const now = new Date();
      const sessionsSnapshot = await getDocs(collection(db, 'user_logs_UserSessions'));
      
      const expiredSessions = [];
      
      sessionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Skip if already inactive
        if (data.isActive === false || data.logoutTime) return;
        
        let lastActivityTime = null;
        
        if (data.lastActivity) {
          lastActivityTime = data.lastActivity.toDate ? data.lastActivity.toDate() : new Date(data.lastActivity);
        } else if (data.loginTime) {
          lastActivityTime = data.loginTime.toDate ? data.loginTime.toDate() : new Date(data.loginTime);
        }
        
        if (lastActivityTime) {
          const timeSinceActivity = now - lastActivityTime;
          if (timeSinceActivity > this.ACTIVITY_TIMEOUT) {
            expiredSessions.push(doc.ref);
          }
        }
      });
      
      // Update expired sessions
      const updatePromises = expiredSessions.map(ref => 
        updateDoc(ref, {
          logoutTime: serverTimestamp(),
          isActive: false
        })
      );
      
      await Promise.all(updatePromises);
      
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
      
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Get current session info
   */
  getCurrentSession() {
    return {
      sessionId: this.currentSessionId,
      userId: this.userId,
      isActive: !!this.currentSessionId
    };
  }
}

// Create singleton instance
const userSessionManager = new UserSessionManager();

export default userSessionManager;
