import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import cropifyLogo from "../assets/images/cropifylogo.png";
import { isAdmin2FAEnabled, verifyAdmin2FA } from "../Authentication";
import { app } from "../firebase";
import "../styles/LoginPage.css";
import SecurityUtils from "../utils/security.jsx";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [adminId, setAdminId] = useState("");
  const [adminName, setAdminName] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
    document.body.classList.add("login-page");
    
    // Check if user is already authenticated and redirect
    const checkExistingAuth = async () => {
      const session = await SecurityUtils.validateSession();
      if (session.isValid) {
        // User is already authenticated, redirect to dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    };
    
    checkExistingAuth();
    
    return () => {
      document.body.classList.remove("login-page");
    };
  }, [navigate, location]);

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

      // ✅ Step 3: Get admin data from Firestore
      const adminData = querySnapshot.docs[0].data();
      const currentAdminId = querySnapshot.docs[0].id;
      
      // Store admin data for potential 2FA verification
      setAdminId(currentAdminId);
      setAdminName(adminData.name);

      // ✅ Step 4: Check if 2FA is enabled for this admin
      const is2FAEnabled = await isAdmin2FAEnabled(currentAdminId);
      
      if (is2FAEnabled) {
        // Show 2FA verification step
        setShow2FA(true);
        setMessage("Please enter the 6-digit code from your authenticator app.");
        setLoading(false);
      } else {
        // No 2FA enabled, proceed to dashboard
        localStorage.setItem("adminName", adminData.name);
        
        // Log successful login
        SecurityUtils.logSecurityEvent('successful_login', {
          userId: currentAdminId,
          adminName: adminData.name,
          role: adminData.role
        });
        
        setMessage("Login successful! Redirecting to dashboard...");
        
        // Redirect to intended page or dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }

    } catch (error) {
      console.error("Login error:", error.code, error.message);

      // Log failed login attempt
      SecurityUtils.logSecurityEvent('failed_login_attempt', {
        email,
        errorCode: error.code,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      });

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

  const handle2FAVerification = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!twoFACode || twoFACode.length !== 6) {
      setMessage("Please enter a valid 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      // Verify the 2FA code
      const isValid = await verifyAdmin2FA(adminId, twoFACode);
      
      if (isValid) {
        // 2FA verification successful, proceed to dashboard
        localStorage.setItem("adminName", adminName);
        
        // Log successful 2FA login
        SecurityUtils.logSecurityEvent('successful_2fa_login', {
          userId: adminId,
          adminName: adminName
        });
        
        setMessage("2FA verification successful! Redirecting to dashboard...");
        
        // Redirect to intended page or dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        // Log failed 2FA attempt
        SecurityUtils.logSecurityEvent('failed_2fa_attempt', {
          userId: adminId,
          adminName: adminName
        });
        
        setMessage("Invalid 2FA code. Please try again.");
        setTwoFACode("");
      }
    } catch (error) {
      console.error("2FA verification error:", error);
      setMessage("2FA verification failed. Please try again.");
      setTwoFACode("");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShow2FA(false);
    setTwoFACode("");
    setMessage("");
    setAdminId("");
    setAdminName("");
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
          {!show2FA ? (
            /* Login Form */
            <>
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
            </>
          ) : (
            /* 2FA Verification Form */
            <>
              <div className="login-welcome">Two-Factor Authentication</div>
              <div className="login-instruction">Enter the 6-digit code from your authenticator app.</div>
              <form className="login-form" onSubmit={handle2FAVerification}>
                <div className="twofa-input-container">
                  <input
                    type="text"
                    placeholder="000000"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={loading}
                    className="twofa-code-input"
                    maxLength="6"
                  />
                  <div className="twofa-help-text">
                    Open your authenticator app and enter the 6-digit code
                  </div>
                </div>
                <div className="twofa-buttons">
                  <button type="button" className="back-btn" onClick={handleBackToLogin} disabled={loading}>
                    Back to Login
                  </button>
                  <button type="submit" className="login-btn" disabled={loading || twoFACode.length !== 6}>
                    {loading ? "Verifying..." : "VERIFY"}
                  </button>
                </div>
                {message && <div className="login-message error">{message}</div>}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
