import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase"; // import Firebase auth and database
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import "../styles/LoginPage.css";

function RegisterPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add("login-page");
    return () => {
      document.body.classList.remove("login-page");
    };
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      // Step 1: Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Step 2: Save extra info to Firestore under "admins" collection
      await setDoc(doc(db, "admins", user.uid), {
        adminId: user.uid, // <-- Add this line
        name: name,
        role: role,
        email: email,
        createdAt: new Date()
      });
      

      alert("Admin registered successfully!");

      // Clear form
      setName("");
      setRole("");
      setEmail("");
      setPassword("");

      // Redirect to dashboard
      navigate("/dashboard");

    } catch (error) {
      console.error(error);
      alert("Failed to register admin: " + error.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Admin Register</h1>
        <p className="login-subtitle">where the plant begins.</p>

        <form className="login-form" onSubmit={handleRegister}>
          <label>Name</label>
          <input
            type="text"
            placeholder="Juan Dela Cruz"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label>Role</label>
          <input
            type="text"
            placeholder="Admin, Accounting, etc."
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />

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

          <button type="submit" className="login-button">
            Register
          </button>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
