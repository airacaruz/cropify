import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../firebase';

// Security utility functions
export const SecurityUtils = {
  // Check if user is authenticated and has admin privileges
  async verifyAdminAccess(userId) {
    try {
      if (!userId) return { isAuthorized: false, role: null };
      
      const q = query(collection(db, "admins"), where("adminId", "==", userId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { isAuthorized: false, role: null };
      }
      
      let role = null;
      let adminData = null;
      
      querySnapshot.forEach((doc) => {
        adminData = doc.data();
        role = (adminData.role || "unknown").toLowerCase();
      });
      
      const isAuthorized = role === 'admin' || role === 'superadmin';
      
      return {
        isAuthorized,
        role,
        adminData,
        adminId: querySnapshot.docs[0].id
      };
    } catch (error) {
      console.error("Error verifying admin access:", error);
      return { isAuthorized: false, role: null, error };
    }
  },

  // Check if user has specific role
  async hasRole(userId, requiredRole) {
    const { isAuthorized, role } = await this.verifyAdminAccess(userId);
    
    if (!isAuthorized) return false;
    
    if (requiredRole.toLowerCase() === 'admin') {
      return role === 'admin' || role === 'superadmin';
    }
    
    return role === requiredRole.toLowerCase();
  },

  // Get current user's role
  async getCurrentUserRole() {
    const user = auth.currentUser;
    if (!user) return null;
    
    const { role } = await this.verifyAdminAccess(user.uid);
    return role;
  },

  // Log security events
  logSecurityEvent(event, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.warn("Security Event:", logEntry);
    
    // In a production app, you might want to send this to a logging service
    // or store it in a secure audit log collection
  },

  // Validate session and redirect if unauthorized
  async validateSession() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        
        if (!user) {
          this.logSecurityEvent('session_validation_failed', { reason: 'no_user' });
          resolve({ isValid: false, user: null });
          return;
        }
        
        const adminCheck = await this.verifyAdminAccess(user.uid);
        
        if (!adminCheck.isAuthorized) {
          this.logSecurityEvent('session_validation_failed', { 
            reason: 'not_admin', 
            userId: user.uid 
          });
          resolve({ isValid: false, user: null });
          return;
        }
        
        resolve({ 
          isValid: true, 
          user, 
          role: adminCheck.role,
          adminData: adminCheck.adminData
        });
      });
    });
  },

  // Clear sensitive data from localStorage
  clearSensitiveData() {
    const sensitiveKeys = ['adminName', 'userRole', 'adminData'];
    sensitiveKeys.forEach(key => {
      localStorage.removeItem(key);
    });
  },

  // Check for suspicious activity
  detectSuspiciousActivity(userId, action) {
    // Basic suspicious activity detection
    const suspiciousPatterns = [
      'admin', 'superadmin', 'root', 'test', 'demo'
    ];
    
    const isSuspicious = suspiciousPatterns.some(pattern => 
      action.toLowerCase().includes(pattern)
    );
    
    if (isSuspicious) {
      this.logSecurityEvent('suspicious_activity_detected', {
        userId,
        action,
        timestamp: new Date().toISOString()
      });
    }
    
    return isSuspicious;
  },

  // Force logout and clear session
  async forceLogout(reason = 'security_violation') {
    this.logSecurityEvent('forced_logout', { reason });
    this.clearSensitiveData();
    
    try {
      await auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error("Error during forced logout:", error);
      window.location.href = '/';
    }
  }
};

// Higher-order component for additional security checks
export const withSecurity = (WrappedComponent, options = {}) => {
  return function SecuredComponent(props) {
    const [securityCheck, setSecurityCheck] = React.useState({
      loading: true,
      authorized: false,
      role: null
    });

    React.useEffect(() => {
      const checkSecurity = async () => {
        try {
          const session = await SecurityUtils.validateSession();
          
          if (!session.isValid) {
            setSecurityCheck({
              loading: false,
              authorized: false,
              role: null
            });
            return;
          }

          // Check role requirements if specified
          if (options.requiredRole) {
            const hasRequiredRole = await SecurityUtils.hasRole(
              session.user.uid, 
              options.requiredRole
            );
            
            if (!hasRequiredRole) {
              SecurityUtils.logSecurityEvent('unauthorized_role_access', {
                userId: session.user.uid,
                userRole: session.role,
                requiredRole: options.requiredRole,
                path: window.location.pathname
              });
              
              setSecurityCheck({
                loading: false,
                authorized: false,
                role: session.role
              });
              return;
            }
          }

          setSecurityCheck({
            loading: false,
            authorized: true,
            role: session.role
          });

        } catch (error) {
          console.error("Security check failed:", error);
          setSecurityCheck({
            loading: false,
            authorized: false,
            role: null
          });
        }
      };

      checkSecurity();
    }, []);

    if (securityCheck.loading) {
      return (
        <div style={{ 
          display: "flex", 
          height: "100vh", 
          justifyContent: "center", 
          alignItems: "center",
          flexDirection: "column",
          gap: "20px"
        }}>
          <div style={{
            width: "40px",
            height: "40px",
            border: "4px solid #f3f3f3",
            borderTop: "4px solid #2e7d32",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }}></div>
          <p style={{ color: "#666", fontSize: "16px" }}>Security verification...</p>
        </div>
      );
    }

    if (!securityCheck.authorized) {
      return <Navigate to="/" replace />;
    }

    return <WrappedComponent {...props} userRole={securityCheck.role} />;
  };
};

export default SecurityUtils;
