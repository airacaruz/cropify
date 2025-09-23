import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import cropifyLogo from "../assets/images/cropifylogo.png";
import { app } from "../firebase";
import "../styles/LoginPage.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
    document.body.classList.add("login-page");
    return () => {
      document.body.classList.remove("login-page");
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    // ✅ Empty fields check
    if (!email || !password) {
      setMessage("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      // ✅ Step 1: Check if email exists in admins collection
      const q = query(collection(db, "admins"), where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setMessage("Email not found. Please check or register first.");
        setLoading(false);
        return;
      }

      // ✅ Step 2: Email exists, now try signing in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ Step 3: If login successful, get admin name from Firestore
      const adminData = querySnapshot.docs[0].data();
      localStorage.setItem("adminName", adminData.name);

      setMessage("Login successful! Proceeding to verification...");
      navigate("/login-mfa", { state: { email, password } });

    } catch (error) {
      console.error("Login error:", error.code, error.message);

      // ✅ Differentiate password errors from other issues
      if (error.code === "auth/invalid-credential") {
        setMessage("Invalid password. Please try again.");
      } else if (error.code === "auth/invalid-email") {
        setMessage("Invalid email format.");
      } else if (error.code === "auth/too-many-requests") {
        setMessage("Too many failed attempts. Please try again later.");
      } else if (error.code === "auth/user-disabled") {
        setMessage("This account has been disabled. Contact support.");
      } else {
        setMessage("Login failed. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-main-container">
      <div className="login-left-panel">
        <div className="login-left-card">
          <div className="login-logo">
            <img src={cropifyLogo} alt="Cropify Logo" width={500} height={500} />
          </div>
        </div>
      </div>
      <div className="login-divider"></div>
      <div className="login-right-panel">
        <div className="login-card">
          <div className="login-welcome">Welcome</div>
          <div className="login-instruction">Please login to Admin Dashboard.</div>
          <form className="login-form" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Logging in..." : "LOGIN"}
            </button>
            {message && <div className="login-message error">{message}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
