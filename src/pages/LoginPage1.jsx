import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import cropifyLogo from "../assets/images/cropifylogo.png";
import "../styles/LoginPage.css";

function LoginPage1() {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Get email and password from location state
  const { email, password } = location.state || {};

  useEffect(() => {
    document.body.classList.add("login-page");
    return () => {
      document.body.classList.remove("login-page");
    };
  }, []);

  useEffect(() => {
    if (!email || !password) {
      navigate("/login");
    } else {
      // Simulate successful login and redirect to dashboard
      setMessage("Login successful! Redirecting to dashboard...");
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    }
  }, [email, password, navigate]);

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
          <div className="login-welcome">Multi-Factor Authentication</div>
          <div className="login-instruction">
            MFA is temporarily disabled. You will be redirected to the dashboard.
          </div>
          {message && <div className="login-message">{message}</div>}
        </div>
      </div>
    </div>
  );
}

export default LoginPage1;