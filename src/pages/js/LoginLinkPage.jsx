// src/pages/js/LoginLinkPage.jsx

import {
  getAuth,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
} from "firebase/auth";
import {
  collection,
  getDocs,
  getFirestore,
  query,
  where,
} from "firebase/firestore";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { app } from "../../firebase";

function LoginLinkPage() {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const navigate = useNavigate();

  useEffect(() => {
    const signIn = async () => {
      const email = window.localStorage.getItem("emailForSignIn");
      if (!email) {
        alert("Missing email info. Try again.");
        navigate("/send-link"); 
        return;
      }

      if (isSignInWithEmailLink(auth, window.location.href)) {
        try {
          const result = await signInWithEmailLink(auth, email, window.location.href);
          const user = result.user;

          // Check if the signed-in user's email is in your 'admins' collection
          const q = query(collection(db, "admins"), where("email", "==", email));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const adminData = snapshot.docs[0].data();
            localStorage.setItem("adminName", adminData.name);
            alert("Welcome back!");
            navigate("/dashboard"); // Redirect to your dashboard
          } else {
            // Not an admin, sign out and redirect
            alert("Access denied: Not an admin.");
            await signOut(auth); // Sign out the non-admin user
            navigate("/"); // Redirect to a page indicating denial or main login
          }
        } catch (error) {
          console.error("Login failed:", error.message);
          alert("Login failed: " + error.message);
          // Optional: redirect to a generic error page or back to login
          navigate("/"); // Go back to the email input page on failure
        }
      }
    };

    signIn();
    // Dependencies array for useEffect
  }, [auth, db, navigate]); // Ensure all dependencies are included

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Verifying...</h1>
        <p>Please wait while we log you in.</p>
      </div>
    </div>
  );
}

export default LoginLinkPage;