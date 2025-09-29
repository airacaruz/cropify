import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (!currentUser) {
        setLoading(false);
        setIsAdmin(false);
        return;
      }

      try {
        // Check if user exists in admins collection
        const q = query(collection(db, "admins"), where("adminId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          // User is authenticated but not an admin
          console.warn("User authenticated but not found in admins collection:", currentUser.uid);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Get admin data
        let adminData = null;
        querySnapshot.forEach((doc) => {
          adminData = doc.data();
        });

        // Check if user has admin or superadmin role
        const role = (adminData.role || "unknown").toLowerCase();
        const hasAdminAccess = role === 'admin' || role === 'superadmin';
        
        if (!hasAdminAccess) {
          console.warn("User does not have admin privileges:", { uid: currentUser.uid, role });
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // All checks passed - user is an admin
        setIsAdmin(true);
        
        // Store admin data in localStorage for quick access
        localStorage.setItem("adminName", adminData.name);
        localStorage.setItem("userRole", role);
        
      } catch (error) {
        console.error("Error verifying admin access:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        height: "100vh", 
        justifyContent: "center", 
        alignItems: "center",
        flexDirection: "column",
        gap: "20px",
        backgroundColor: "#f8f9fa"
      }}>
        <div style={{
          width: "50px",
          height: "50px",
          border: "4px solid #e9ecef",
          borderTop: "4px solid #4CAF50",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
        <p style={{ color: "#666", fontSize: "16px", margin: 0 }}>Verifying access...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user || !isAdmin) {
    // Clear any stored authentication data
    localStorage.removeItem('adminName');
    localStorage.removeItem('userRole');
    
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;