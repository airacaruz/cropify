  import { useNavigate } from "react-router-dom";
  import React, { useState, useEffect } from "react";
  import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
  import { app } from "../firebase"; // 👈 make sure this is correct
  import "../styles/LoginPage.css";
  import { getFirestore, doc, getDocs } from "firebase/firestore";
  import { collection, query, where } from "firebase/firestore";

  function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const auth = getAuth(app);

    useEffect(() => {
      document.body.classList.add("login-page");
      return () => {
        document.body.classList.remove("login-page");
      };
    }, []);

    const handleLogin = async (e) => {
      e.preventDefault();
    
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
    
        const db = getFirestore(app);
    
        // ✅ Query the correct collection ("admins") by email
        const q = query(collection(db, "admins"), where("email", "==", user.email));
        const querySnapshot = await getDocs(q);
    


        if (!querySnapshot.empty) {
          const adminData = querySnapshot.docs[0].data();
          const name = adminData.name;
          alert("Login successful!");
          navigate("/dashboard");

          localStorage.setItem("adminName", name);
        } else {
          alert("Access denied: Not an admin.");
          await auth.signOut();
        }
      }catch (error) {
        // console.error("Login error code:", error.code);
        console.error("Login error message:", error.message);
        alert(error.message); // more helpful than a generic alert
      }
      
    };
    

    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">Admin Login</h1>
          <p className="login-subtitle">where the plant begins.</p>

          <form className="login-form" onSubmit={handleLogin}>
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button type="submit" className="login-button">Log In</button>
          </form>
        </div>
      </div>
    );
  }

  export default LoginPage;
