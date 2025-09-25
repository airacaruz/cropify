import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";

function ProtectedRoute({ children, requiredRole = null }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setUserRole(null);
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      try {
        setUser(currentUser);
        
        // Verify user is an admin in the database
        const q = query(collection(db, "admins"), where("adminId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          // User is not in admin collection - unauthorized
          console.warn("User not found in admin collection:", currentUser.uid);
          setUserRole(null);
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        // Get user role from admin collection
        let role = null;
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          role = (data.role || "unknown").toLowerCase();
        });

        setUserRole(role);
        
        // Check if user has required role (if specified)
        if (requiredRole) {
          const hasRequiredRole = role === requiredRole.toLowerCase() || 
                                 (requiredRole.toLowerCase() === 'admin' && role === 'superadmin');
          setIsAuthorized(hasRequiredRole);
        } else {
          // Any admin role is authorized
          setIsAuthorized(role === 'admin' || role === 'superadmin');
        }
        
      } catch (error) {
        console.error("Error verifying user role:", error);
        setUserRole(null);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [requiredRole]);

  // Show loading spinner while checking authentication
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

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Redirect to login if not authorized (not an admin or wrong role)
  if (!isAuthorized) {
    console.warn("Unauthorized access attempt:", {
      userId: user.uid,
      userRole,
      requiredRole,
      path: location.pathname
    });
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // User is authenticated and authorized
  return children;
}

export default ProtectedRoute;
