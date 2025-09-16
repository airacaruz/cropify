import { getAuth, getMultiFactorResolver, PhoneAuthProvider, PhoneMultiFactorGenerator, RecaptchaVerifier, signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import cropifyLogo from "../assets/images/cropifylogo.png";
import { app } from "../firebase";
import "../styles/LoginPage.css";

function LoginPage1() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaResolver, setMfaResolver] = useState(null);
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Get email and password from location state
  const { email, password } = location.state || {};

  const auth = getAuth(app);

  useEffect(() => {
    document.body.classList.add("login-page");
    return () => {
      document.body.classList.remove("login-page");
    };
  }, []);

  useEffect(() => {
    const startMfa = async () => {
      if (!email || !password) {
        navigate("/login");
        return;
      }
      setLoading(true);
      setMessage("");
      try {
        // This will trigger MFA-required error for enrolled users
        await signInWithEmailAndPassword(auth, email, password);
        // If no MFA required, user is signed in; verify admin and go
        const db = getFirestore(app);
        const q = query(collection(db, "admins"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const adminData = querySnapshot.docs[0].data();
          localStorage.setItem("adminName", adminData.name || "Admin");
          navigate("/dashboard");
        } else {
          setMessage("Access denied: Not an admin.");
          await auth.signOut();
        }
      } catch (error) {
        if (error.code === 'auth/multi-factor-auth-required') {
          try {
            const resolver = getMultiFactorResolver(auth, error);
            setMfaResolver(resolver);
            await setupRecaptcha();
            await sendSmsCode(resolver);
          } catch (mfaErr) {
            setMessage(mfaErr.message || 'Failed to start multi-factor verification.');
          }
        } else {
          setMessage(error.message || 'Login failed.');
        }
      } finally {
        setLoading(false);
      }
    };
    startMfa();
  }, [auth, email, password, navigate]);

  // Mount visible reCAPTCHA (normal size) for testing SMS verification
  const setupRecaptcha = async () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'normal' });
      await window.recaptchaVerifier.render();
    }
  };

  const sendSmsCode = async (resolver) => {
    const phoneAuthProvider = new PhoneAuthProvider(auth);
    const phoneInfoOptions = {
      multiFactorHint: resolver.hints[0],
      session: resolver.session,
    };
    const vId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, window.recaptchaVerifier);
    setVerificationId(vId);
    setSmsSent(true);
    setResendCooldown(30);
    setMessage(`Verification code sent to ${resolver.hints[0]?.phoneNumber || 'your phone'}`);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!mfaResolver || !verificationId || !verificationCode) return;
    setLoading(true);
    setMessage("");
    try {
      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      const assertion = PhoneMultiFactorGenerator.assertion(cred);
      const result = await mfaResolver.resolveSignIn(assertion);
      const user = result.user;
      const db = getFirestore(app);
      const q = query(collection(db, "admins"), where("email", "==", user.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const adminData = querySnapshot.docs[0].data();
        localStorage.setItem("adminName", adminData.name || "Admin");
        navigate("/dashboard");
      } else {
        setMessage("Access denied: Not an admin.");
        await auth.signOut();
      }
    } catch (err) {
      setMessage(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

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
            Enter the verification code sent to your phone.
          </div>
          <form className="login-form" onSubmit={handleVerifyCode}>
            <div style={{ width: '100%', marginBottom: 12 }}>
              <div id="recaptcha-container"></div>
            </div>
            <input
              type="text"
              placeholder={smsSent ? "Enter 6-digit code" : (loading ? "Sending code..." : "Sending code...")}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              disabled={loading || !smsSent}
            />
            <button type="submit" className="login-btn" disabled={loading || !smsSent}>
              {loading ? "Verifying..." : "VERIFY CODE"}
            </button>
            <button
              type="button"
              className="login-btn"
              disabled={loading || resendCooldown > 0 || !mfaResolver}
              onClick={async () => {
                try {
                  setMessage("");
                  await setupRecaptcha();
                  await sendSmsCode(mfaResolver);
                } catch (e2) {
                  setMessage(e2.message || 'Failed to resend code.');
                }
              }}
            >
              {resendCooldown > 0 ? `RESEND IN ${resendCooldown}s` : 'RESEND CODE'}
            </button>
          </form>
          {message && <div className="login-message">{message}</div>}
        </div>
      </div>
    </div>
  );
}

export default LoginPage1;