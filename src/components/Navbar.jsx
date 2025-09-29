import { getAuth, signOut } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/images/cropifytextlogo.png';
import {
    complete2FASetup,
    disableAdmin2FA,
    enable2FA,
    generateCurrentToken,
    getTimeRemaining,
    isAdmin2FAEnabled,
    mfaManager
} from '../Authentication';
import { app } from "../firebase";
import '../styles/Navbar.css';
import { adminAuditActions } from '../utils/adminAuditLogger';
import adminStatusTracker from '../utils/adminStatusTracker';
import SecurityUtils from '../utils/security.jsx';

// Accept role, adminName, adminId, and onPrintSummary as props
function Navbar({ role, adminName, adminId, onPrintSummary }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [_timeRemaining, setTimeRemaining] = useState(0);
  const dropdownRef = useRef(null);

  // Function to get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/analytics':
        return 'Sensor Analytics';
      case '/userlogs':
        return 'User Logs';
      case '/sensorlogs':
        return 'Manage Sensors';
      case '/userreportlogs':
        return 'User Report Logs';
      case '/usersessions':
        return 'User Sessions';
      case '/userrecords':
        return 'Manage Users';
      case '/manageadmin':
        return 'Manage Admin';
      case '/manageapp':
        return 'Manage App';
      case '/adminrecords':
        return 'Admin Records';
      case '/adminauditlogs':
        return 'Admin Audit Logs';
      default:
        return 'Dashboard';
    }
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleLinkClick = () => {
    closeDrawer();
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    setIsDropdownOpen(false);
  };

  const confirmLogout = async () => {
    try {
      // Log the logout action before signing out
      if (adminId && adminName) {
        await adminAuditActions.logout(adminId, adminName);
      }
      
      // Log security event
      SecurityUtils.logSecurityEvent('user_logout', {
        userId: adminId,
        adminName: adminName,
        timestamp: new Date().toISOString()
      });
      
      // Clear sensitive data
      SecurityUtils.clearSensitiveData();
      
      // Stop admin status tracking
      adminStatusTracker.stopTracking();
      
      const auth = getAuth(app);
      await signOut(auth);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      SecurityUtils.logSecurityEvent('logout_error', {
        error: error.message,
        userId: adminId
      });
      alert("Failed to logout.");
    }
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleSettingsClick = () => {
    setIsDropdownOpen(false);
    setShowSettingsModal(true);
  };

  const closeSettingsModal = () => {
    setShowSettingsModal(false);
    setCurrentStep(1);
    setVerificationCode('');
    setIsVerified(false);
    setCopySuccess(false);
  };

  // Generate 2FA secret and QR code
  const generate2FASecret = async () => {
    try {
      if (!adminId || !adminName) {
        alert('Admin information not available. Please try again.');
        return;
      }

      console.log('Starting 2FA generation for:', adminName);
      console.log('MFA Manager available:', mfaManager);
      
      // Use the directly imported MFA manager
      const setupData = mfaManager.initialize2FA(adminName, 'Cropify Admin');
      
      console.log('Setup data generated:', setupData);
      
      // Validate setup data
      if (!setupData || !setupData.secret || !setupData.qrCodeURL) {
        throw new Error('Invalid setup data generated from MFA Manager');
      }
      
      setSecret(setupData.secret);
      setQrCodeUrl(setupData.qrCodeURL);
      
      console.log('✅ Generated 2FA secret for:', adminName);
      console.log('Secret:', setupData.secret);
      console.log('QR URL:', setupData.qrCodeURL);
      console.log('Backup Codes:', setupData.backupCodes);
      
    } catch (error) {
      console.error('❌ Error generating 2FA secret:', error);
      alert('Failed to generate 2FA secret. Please try again.');
    }
  };

  // Copy secret to clipboard
  const copySecretToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy secret:', err);
    }
  };

  // Verify the entered code
  const verifyCode = async () => {
    try {
      if (!verificationCode || verificationCode.length !== 6) {
        alert('Please enter a valid 6-digit code.');
        return;
      }

      if (!adminId || !secret) {
        alert('Setup data not found. Please restart the setup process.');
        return;
      }

      // Verify the token locally first using MFA manager
      const isValid = await mfaManager.verify2FAToken(verificationCode, secret);
      
      if (isValid) {
        try {
          // Get backup codes from the manager
          const setupData = mfaManager.getSetupData();
          
          // Save to Firebase
          await enable2FA(adminId, secret, setupData.backupCodes, adminName, 'Cropify Admin');
          
          // Mark as completed
          await complete2FASetup(adminId);
          
          setIsVerified(true);
          setCurrentStep(4);
          console.log('2FA verification and setup completed for:', adminName);
        } catch (firebaseError) {
          console.error('Firebase save error:', firebaseError);
          alert('Verification successful but failed to save to database. Please try again.');
        }
      } else {
        alert('Invalid verification code. Please check your authenticator app and try again.');
        setVerificationCode(''); // Clear the input
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('Error verifying code. Please try again.');
      setVerificationCode(''); // Clear the input
    }
  };

  // Complete 2FA setup
  const complete2FASetupLocal = async () => {
    try {
      if (!isVerified) {
        alert('2FA setup is not complete. Please verify your code first.');
        return;
      }

      if (!adminId) {
        alert('Admin ID not found. Please try again.');
        return;
      }

      // Update the 2FA status in component state
      setIs2FAEnabled(true);
      
      console.log('2FA setup completed for:', adminName);
      console.log('2FA setup completed for admin:', adminId);
      
      alert('🎉 Two-Factor Authentication has been successfully enabled!\n\nYour account is now secured with 2FA.');
      closeSettingsModal();
    } catch (error) {
      console.error('Error completing 2FA setup:', error);
      alert('Failed to complete 2FA setup. Please try again.');
    }
  };

  // Reset 2FA setup
  const reset2FASetup = () => {
    setCurrentStep(1);
    setSecret('');
    setQrCodeUrl('');
    setVerificationCode('');
    setIsVerified(false);
    setCopySuccess(false);
  };

  // Check if 2FA is already enabled for this admin
  const check2FAStatus = useCallback(async () => {
    if (!adminId) return false;
    
    try {
      return await isAdmin2FAEnabled(adminId);
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      return false;
    }
  }, [adminId]);

  // Generate a test token for verification (useful for debugging)
  const _generateTestToken = () => {
    if (!secret) return null;
    try {
      return generateCurrentToken(secret);
    } catch (error) {
      console.error('Error generating test token:', error);
      return null;
    }
  };

  // Get time remaining for current token
  const getTimeRemainingForToken = () => {
    try {
      return getTimeRemaining();
    } catch (error) {
      console.error('Error getting time remaining:', error);
      return 0;
    }
  };

  // Disable 2FA for the current admin
  const disable2FA = async () => {
    if (!adminId) return;
    
    try {
      const success = await disableAdmin2FA(adminId);
      
      if (success) {
        setIs2FAEnabled(false);
        console.log('2FA disabled for:', adminName);
        alert('2FA has been disabled for your account.');
      } else {
        alert('Failed to disable 2FA. Please try again.');
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      alert('Failed to disable 2FA. Please try again.');
    }
  };


  // Check 2FA status on component mount
  useEffect(() => {
    const load2FAStatus = async () => {
      if (adminId) {
        const twoFAStatus = await check2FAStatus();
        setIs2FAEnabled(twoFAStatus);
      }
    };
    
    load2FAStatus();
  }, [adminId, check2FAStatus]);

  // Update time remaining every second when 2FA is enabled
  useEffect(() => {
    let interval;
    if (is2FAEnabled && secret) {
      interval = setInterval(() => {
        setTimeRemaining(getTimeRemainingForToken());
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [is2FAEnabled, secret]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Start/stop admin status tracking
  useEffect(() => {
    if (adminId && adminName) {
      // Start tracking when admin info is available
      adminStatusTracker.startTracking(adminId, adminName);
    }

    // Cleanup function to stop tracking when component unmounts
    return () => {
      if (adminId) {
        adminStatusTracker.stopTracking();
      }
    };
  }, [adminId, adminName]);

  return (
    <>
      {/* Top Header */}
      <div className="top-header">
        <div className="header-left">
          <button 
            className="hamburger-menu" 
            onClick={toggleDrawer}
            aria-label="Toggle navigation"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <img src={logo} alt="Cropify Logo" className="header-logo" />
        </div>
        <h2 className="header-title">{getPageTitle()}</h2>
        <div className="header-right">
          {/* Print Summary Button - only show for specific pages */}
          {onPrintSummary && (location.pathname === '/dashboard' || location.pathname === '/userrecords' || location.pathname === '/userlogs' || location.pathname === '/sensorlogs' || location.pathname === '/adminauditlogs') && (
            <button 
              onClick={onPrintSummary}
              className="print-summary-btn"
              style={{
                background: 'transparent',
                color: 'white',
                border: '0.5px solid white',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginRight: '10px'
              }}
            >
              Print {getPageTitle()} Summary
            </button>
          )}
          <div className="admin-dropdown" ref={dropdownRef}>
            <button 
              className="admin-dropdown-button"
              onClick={toggleDropdown}
            >
              {adminName || "Admin"}
              <span className="dropdown-arrow">▼</span>
            </button>
            {isDropdownOpen && (
              <div className="dropdown-menu">
                <button 
                  className="dropdown-item"
                  onClick={handleSettingsClick}
                >
                  Settings
                </button>
                <button 
                  className="dropdown-item logout-item"
                  onClick={handleLogoutClick}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className={`sidebar drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className='logo'>
        </div>
        <nav>
          <ul className="navlist">
            <li className={location.pathname === '/dashboard' ? 'active' : ''}>
              <Link to="/dashboard" onClick={handleLinkClick}>DASHBOARD</Link>
            </li>
            <li className={location.pathname === '/userlogs' ? 'active' : ''}>
              <Link to="/userlogs" onClick={handleLinkClick}>USER LOGS</Link>
            </li>
            <li className={location.pathname === '/sensorlogs' ? 'active' : ''}>
              <Link to="/sensorlogs" onClick={handleLinkClick}>MANAGE SENSORS</Link>
            </li>
            {/* Show user management for admin and superadmin */}
            {(role === 'admin' || role === 'superadmin') && (
              <li className={location.pathname === '/userrecords' ? 'active' : ''}>
                <Link to="/userrecords" onClick={handleLinkClick}>MANAGE USERS</Link>
              </li>
            )}
            {/* Only show these links for superadmin */}
            {role === 'superadmin' && (
              <>
                <li className={location.pathname === '/manageadmin' ? 'active' : ''}>
                  <Link to="/manageadmin" onClick={handleLinkClick}>MANAGE ADMIN</Link>
                </li>
                <li className={location.pathname === '/adminauditlogs' ? 'active' : ''}>
                  <Link to="/adminauditlogs" onClick={handleLinkClick}>AUDIT LOGS</Link>
                </li>
                <li className={location.pathname === '/manageapp' ? 'active' : ''}>
                  <Link to="/manageapp" onClick={handleLinkClick}>MANAGE APP</Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
      {isDrawerOpen && (
        <div className="drawer-overlay" onClick={closeDrawer}></div>
      )}
      
      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="settings-modal-overlay" onClick={closeSettingsModal}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h3>Settings</h3>
              <button 
                className="close-settings-btn"
                onClick={closeSettingsModal}
                aria-label="Close settings"
              >
                ×
              </button>
            </div>
            <div className="settings-modal-content">
              <div className="twofa-setup-container">
                <div className="setup-header">
                  <h4>🔐 Two-Factor Authentication</h4>
                  <p>Secure your admin account with 2FA</p>
                  {is2FAEnabled ? (
                    <div className="twofa-status-enabled">
                      ✅ 2FA is currently enabled for your account
                    </div>
                  ) : (
                    <div className="twofa-status-disabled">
                      ⚠️ 2FA hasn't been setup in your account
                    </div>
                  )}
                </div>

                {/* Show different content based on 2FA status */}
                {is2FAEnabled ? (
                  /* 2FA Enabled - Show Status and Disable Option */
                  <div className="twofa-enabled-content">
                    <div className="status-panel">
                      <h5>🛡️ Two-Factor Authentication Active</h5>
                      <p>Your account is protected with two-factor authentication.</p>
                      <div className="security-info">
                        <div className="info-item">
                          <strong>Status:</strong> <span className="status-active">Active</span>
                        </div>
                        <div className="info-item">
                          <strong>Protection:</strong> Enhanced security enabled
                        </div>
                        <div className="info-item">
                          <strong>Last Verified:</strong> Recently active
                        </div>
                      </div>
                      <div className="warning-message">
                        <p><strong>⚠️ Important:</strong> Disabling 2FA will make your account less secure. Only disable if you're having trouble accessing your authenticator app.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 2FA Disabled - Show Setup Process */
                  <>
                    {/* Progress Steps */}
                    <div className="progress-steps">
                      <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                        <div className="step-number">1</div>
                        <div className="step-label">Download App</div>
                      </div>
                      <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                        <div className="step-number">2</div>
                        <div className="step-label">Scan QR Code</div>
                      </div>
                      <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
                        <div className="step-number">3</div>
                        <div className="step-label">Verify Code</div>
                      </div>
                      <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
                        <div className="step-number">4</div>
                        <div className="step-label">Complete</div>
                      </div>
                    </div>
                  </>
                )}

                {/* Step Content - Only show when 2FA is disabled */}
                {!is2FAEnabled && (
                  <div className="step-content">
                  {currentStep === 1 && (
                    <div className="step-panel">
                      <h5>📱 Step 1: Download Authenticator App</h5>
                      <p>Download one of these authenticator apps on your mobile device:</p>
                      <div className="app-options">
                        <div className="app-option">
                          <strong>Google Authenticator</strong>
                          <p>Available for iOS and Android</p>
                        </div>
                        <div className="app-option">
                          <strong>Microsoft Authenticator</strong>
                          <p>Available for iOS and Android</p>
                        </div>
                        <div className="app-option">
                          <strong>Authy</strong>
                          <p>Available for iOS, Android, and Desktop</p>
                        </div>
                      </div>
                      <div className="step-buttons">
                        <button 
                          className="next-btn"
                          onClick={async () => {
                            await generate2FASecret();
                            setCurrentStep(2);
                          }}
                        >
                          Next: Generate QR Code
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="step-panel">
                      <h5>📷 Step 2: Scan QR Code</h5>
                      <p>Open your authenticator app and scan this QR code:</p>
                      
                      <div className="qr-section">
                        <div className="qr-code-container">
                          {qrCodeUrl ? (
                            <>
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                                alt="QR Code for 2FA Setup"
                                className="qr-code"
                                onError={(e) => {
                                  console.error('QR Code failed to load:', e);
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'block';
                                }}
                              />
                              <div className="qr-error" style={{display: 'none', color: 'red', fontSize: '12px'}}>
                                QR Code failed to load. Please use manual setup.
                              </div>
                            </>
                          ) : (
                            <div className="qr-placeholder">Generating QR Code...</div>
                          )}
                        </div>
                        
                        <div className="manual-setup">
                          <p><strong>Can't scan the QR code?</strong></p>
                          <p>Enter this code manually in your authenticator app:</p>
                          <div className="secret-display">
                            <code className="secret-code">{secret}</code>
                            <button 
                              className="copy-btn"
                              onClick={copySecretToClipboard}
                            >
                              {copySuccess ? '✓ Copied!' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="step-buttons">
                        <button className="back-btn" onClick={() => setCurrentStep(1)}>
                          Back
                        </button>
                        <button 
                          className="next-btn"
                          onClick={() => setCurrentStep(3)}
                        >
                          Next: Verify Setup
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="step-panel">
                      <h5>✅ Step 3: Verify Setup</h5>
                      <p>Enter the 6-digit code from your authenticator app to verify the setup:</p>
                      
                      <div className="verification-section">
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          className="verification-input"
                          maxLength="6"
                        />
                        <button 
                          className="verify-btn"
                          onClick={verifyCode}
                          disabled={verificationCode.length !== 6}
                        >
                          Verify Code
                        </button>
                      </div>

                      <div className="step-buttons">
                        <button className="back-btn" onClick={() => setCurrentStep(2)}>
                          Back
                        </button>
                        <button 
                          className="reset-btn"
                          onClick={reset2FASetup}
                        >
                          Start Over
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="step-panel success-panel">
                      <h5>🎉 Step 4: Setup Complete!</h5>
                      <div className="success-icon">✅</div>
                      <p>Two-Factor Authentication has been successfully set up for your account.</p>
                      <p><strong>Important:</strong> Keep your authenticator app secure and don't share your backup codes.</p>
                      
                      <div className="completion-actions">
                        <button 
                          className="complete-btn"
                          onClick={complete2FASetupLocal}
                        >
                          Complete Setup
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                )}
              </div>
            </div>
            <div className="settings-modal-footer">
              {is2FAEnabled && (
                <button 
                  className="settings-btn disable-2fa-btn"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
                      disable2FA();
                    }
                  }}
                >
                  Disable 2FA
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="logout-confirm-overlay">
          <div className="logout-confirm-dialog">
            <h3>Confirm Sign Out</h3>
            <p>Are you sure you want to sign out?</p>
            <div className="confirm-buttons">
              <button 
                className="confirm-btn cancel-btn"
                onClick={cancelLogout}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn logout-btn"
                onClick={confirmLogout}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

export default Navbar;