import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { adminAuditActions } from '../utils/adminAuditLogger';
import SecurityUtils from '../utils/security.jsx';
import sessionTracker from '../utils/sessionTracker';
import Navbar from './Navbar';

function Layout() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [adminName, setAdminName] = useState('');
  const [adminId, setAdminId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // User not authenticated, redirect to login
        SecurityUtils.logSecurityEvent('unauthorized_layout_access', {
          path: window.location.pathname
        });
        navigate('/', { replace: true });
        return;
      }

      try {
        // Verify user is an admin
        const adminCheck = await SecurityUtils.verifyAdminAccess(user.uid);
        
        if (!adminCheck.isAuthorized) {
          SecurityUtils.logSecurityEvent('unauthorized_admin_access', {
            userId: user.uid,
            path: window.location.pathname
          });
          navigate('/', { replace: true });
          return;
        }

        setUserRole(adminCheck.role);
        setAdminId(user.uid);
        
        if (adminCheck.adminData) {
          const cleanName = (adminCheck.adminData.name || "Admin").replace(/\s*\(superadmin\)|\s*\(admin\)/gi, "");
          setAdminName(cleanName);
          
          // Start session tracking for the authenticated admin
          sessionTracker.startTracking(user.uid, cleanName);
          
          // Log the login action
          await adminAuditActions.login(user.uid, cleanName);
        }

      } catch (error) {
        console.error("Layout security check failed:", error);
        SecurityUtils.logSecurityEvent('layout_security_error', {
          error: error.message,
          userId: user.uid
        });
        navigate('/', { replace: true });
        return;
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      // Stop session tracking when component unmounts
      sessionTracker.stopTracking();
    };
  }, [navigate]);

  if (loading) {
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
        <p style={{ color: "#666", fontSize: "16px" }}>Verifying access...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="layout-container">
      <Navbar 
        role={userRole} 
        adminName={adminName} 
        adminId={adminId}
      />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
