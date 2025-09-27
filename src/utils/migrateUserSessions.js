import { collection, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Migration script to fix existing user session data
 * This will add missing fields to existing session documents
 */
export const migrateUserSessions = async () => {
  try {
    console.log('🔄 Starting user sessions migration...');
    
    const sessionsCollection = collection(db, 'user_logs_UserSessions');
    const sessionsSnapshot = await getDocs(sessionsCollection);
    
    console.log(`Found ${sessionsSnapshot.docs.length} session documents to migrate`);
    
    const batch = writeBatch(db);
    let updateCount = 0;
    
    sessionsSnapshot.docs.forEach((sessionDoc) => {
      const data = sessionDoc.data();
      
      // Check if migration is needed
      const needsMigration = !data.hasOwnProperty('isActive') || 
                           !data.hasOwnProperty('logoutTime') || 
                           !data.hasOwnProperty('lastActivity');
      
      if (needsMigration) {
        const updates = {};
        
        // Add missing fields
        if (!data.hasOwnProperty('isActive')) {
          updates.isActive = true; // Assume active if not set
        }
        
        if (!data.hasOwnProperty('logoutTime')) {
          updates.logoutTime = null; // No logout time means still active
        }
        
        if (!data.hasOwnProperty('lastActivity')) {
          // Use loginTime as lastActivity if available
          updates.lastActivity = data.loginTime || serverTimestamp();
        }
        
        if (!data.hasOwnProperty('sessionId')) {
          updates.sessionId = sessionDoc.id;
        }
        
        batch.update(sessionDoc.ref, updates);
        updateCount++;
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully migrated ${updateCount} session documents`);
    } else {
      console.log('✅ No migration needed - all sessions already have required fields');
    }
    
    return {
      success: true,
      totalSessions: sessionsSnapshot.docs.length,
      migratedSessions: updateCount
    };
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Function to manually clean up old/inactive sessions
 */
export const cleanupOldSessions = async (daysOld = 30) => {
  try {
    console.log(`🧹 Cleaning up sessions older than ${daysOld} days...`);
    
    const sessionsCollection = collection(db, 'user_logs_UserSessions');
    const sessionsSnapshot = await getDocs(sessionsCollection);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const batch = writeBatch(db);
    let cleanupCount = 0;
    
    sessionsSnapshot.docs.forEach((sessionDoc) => {
      const data = sessionDoc.data();
      
      // Check if session is old and inactive
      if (data.logoutTime || data.isActive === false) {
        let sessionDate = null;
        
        if (data.logoutTime) {
          sessionDate = data.logoutTime.toDate ? data.logoutTime.toDate() : new Date(data.logoutTime);
        } else if (data.loginTime) {
          sessionDate = data.loginTime.toDate ? data.loginTime.toDate() : new Date(data.loginTime);
        }
        
        if (sessionDate && sessionDate < cutoffDate) {
          batch.delete(sessionDoc.ref);
          cleanupCount++;
        }
      }
    });
    
    if (cleanupCount > 0) {
      await batch.commit();
      console.log(`✅ Cleaned up ${cleanupCount} old session documents`);
    } else {
      console.log('✅ No old sessions found to clean up');
    }
    
    return {
      success: true,
      cleanedSessions: cleanupCount
    };
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Function to get current session statistics
 */
export const getSessionStats = async () => {
  try {
    const sessionsCollection = collection(db, 'user_logs_UserSessions');
    const sessionsSnapshot = await getDocs(sessionsCollection);
    
    const stats = {
      totalSessions: sessionsSnapshot.docs.length,
      activeSessions: 0,
      inactiveSessions: 0,
      sessionsWithoutLogout: 0,
      sessionsWithLogout: 0,
      uniqueUsers: new Set()
    };
    
    sessionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      
      if (data.userId) {
        stats.uniqueUsers.add(data.userId);
      }
      
      if (data.isActive === true) {
        stats.activeSessions++;
      } else if (data.isActive === false) {
        stats.inactiveSessions++;
      }
      
      if (data.logoutTime) {
        stats.sessionsWithLogout++;
      } else {
        stats.sessionsWithoutLogout++;
      }
    });
    
    stats.uniqueUsers = stats.uniqueUsers.size;
    
    console.log('📊 Session Statistics:', stats);
    return stats;
    
  } catch (error) {
    console.error('❌ Error getting session stats:', error);
    return null;
  }
};
