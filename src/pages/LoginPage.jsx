import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import cropifyLogo from "../assets/images/cropifylogo.png"; // Make sure this path is correct
import { app } from "../firebase";
import "../styles/LoginPage.css";

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
    } catch (error) {
      console.error("Login error message:", error.message);
      alert(error.message);
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
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" className="login-btn">LOGIN</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;