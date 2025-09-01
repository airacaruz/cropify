import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import "../styles/RegisterPage.css";

function RegisterPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add("register-page");
    return () => {
      document.body.classList.remove("register-page");
    };
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, "admins", user.uid), {
        adminId: user.uid,
        name: name,
        role: role,
        email: email,
        createdAt: new Date()
      });
      alert("Admin registered successfully!");
      setName("");
      setRole("");
      setEmail("");
      setPassword("");
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Failed to register admin: " + error.message);
    }
  };

  return (
    
    <div className="register-main-container">
      <div className="register-card">
        <div className="back-button" onClick={() => navigate(-1)}>← Back</div>
        <h1 className="register-title">Admin Register</h1>
        <p className="register-subtitle">Create a new admin account below.</p>
        <form className="register-form" onSubmit={handleRegister}>
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
          <button type="submit" className="register-btn">
            Register
          </button>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;