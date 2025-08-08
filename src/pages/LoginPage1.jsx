import React, { useState } from 'react';
import { getAuth, sendSignInLinkToEmail } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../firebase';
import '../styles/LoginPage1.css';

import backgroundImage from '../assets/images/background.jpg';
import cropifyLogo from '../assets/images/logo.png';

const LoginPage = () => {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showMagicLinkSentMessage, setShowMagicLinkSentMessage] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = getAuth(app);
  const db = getFirestore(app);

  const actionCodeSettings = {
    url: '', // ✅ Make sure this matches your router for LoginLinkPage
    handleCodeInApp: true,
    // dynamicLinkDomain: 'cropifymobileapp.page.link'
  };

  const sendMagicLink = async (targetEmail) => {
    setLoading(true);
    setMessage('');

    try {
      const q = query(collection(db, 'admins'), where('email', '==', targetEmail));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMessage('Access denied: This email is not registered as an admin.');
        setShowMagicLinkSentMessage(false);
        setLoading(false);
        return;
      }

      await sendSignInLinkToEmail(auth, targetEmail, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', targetEmail);

      setMessage('');
      setShowMagicLinkSentMessage(true);
    } catch (error) {
      console.error('Error during sign-in process:', error);
      setMessage(`Error: ${error.message}`);
      setShowMagicLinkSentMessage(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    await sendMagicLink(email);
  };

  const handleLogInButtonClick = () => {
    setShowLoginForm(true);
    setShowMagicLinkSentMessage(false);
    setEmail('');
    setMessage('');
  };

  const handleCloseButtonClick = () => {
    setShowLoginForm(false);
    setShowMagicLinkSentMessage(false);
    setEmail('');
    setMessage('');
  };

  const handleTryDifferentEmail = () => {
    setShowMagicLinkSentMessage(false);
    setEmail('');
    setMessage('');
  };

  const handleResendLink = async () => {
    setMessage('Resending link...');
    await sendMagicLink(email);
  };

  return (
    <div
      className="login-page-wrapper"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Initial view */}
      {!showLoginForm && !showMagicLinkSentMessage && (
        <div className="initial-login-view">
          <div className="initial-top-bar">
            <img src={cropifyLogo} alt="Cropify Logo" className="initial-logo" />
            <button className="log-in-button" onClick={handleLogInButtonClick}>
              Log In
            </button>
          </div>
        </div>
      )}

      {/* Email input form */}
      {showLoginForm && !showMagicLinkSentMessage && (
        <>
          <div className="full-screen-overlay"></div>
          <div className="login-top-bar">
            <img src={cropifyLogo} alt="Cropify Logo" className="login-logo" />
            <button className="close-button" onClick={handleCloseButtonClick} disabled={loading}>X</button>
          </div>
          <div className="login-modal-overlay">
            <div className="login-card1">
              <h3>Login With Email</h3>
              <form onSubmit={handleLogin}>
                <div className="input-group">
                  <input
                    type="email"
                    className="email-input"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <button type="submit" className="next-button" disabled={loading}>
                  {loading ? 'Checking...' : 'Next'}
                </button>
              </form>
              {message && <p className="login-message error">{message}</p>}
            </div>
          </div>
        </>
      )}

      {/* Magic link sent confirmation */}
      {showMagicLinkSentMessage && (
        <>
          <div className="full-screen-overlay"></div>
          <div className="login-top-bar">
            <img src={cropifyLogo} alt="Cropify Logo" className="login-logo" />
            <button className="close-button" onClick={handleCloseButtonClick} disabled={loading}>X</button>
          </div>
          <div className="login-modal-overlay">
            <div className="magic-link-sent-card login-card">
              <h4>We sent you a magic link</h4>
              <p className="magic-link-instruction">
                To sign in, click on the link we sent to <br />
                <span className="sent-email">{email}</span> <br />
                or <a href="#" onClick={handleTryDifferentEmail} className="try-different-email-link">Try a different email</a>
              </p>
              <button className="resend-button next-button" onClick={handleResendLink} disabled={loading}>
                {loading ? 'Resending...' : 'Resend link'}
              </button>
              {message && <p className="login-message">{message}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LoginPage;
