import { getAuth, signOut } from "firebase/auth";
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/images/cropifytextlogo.png';
import { app } from "../firebase";
import '../styles/Navbar.css';
import { adminAuditActions } from '../utils/adminAuditLogger';

// Accept role, adminName, and adminId as props
function Navbar({ role, adminName, adminId }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
        return 'Sensor Logs';
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
      
      const auth = getAuth(app);
      await signOut(auth);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to logout.");
    }
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };


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
        <h2 className="header-title" style={{ fontWeight: 'bold' }}>{getPageTitle()}</h2>
        <div className="header-right">
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
            <li className={location.pathname === '/analytics' ? 'active' : ''}>
              <Link to="/analytics" onClick={handleLinkClick}>ANALYTICS</Link>
            </li>
            <li className={location.pathname === '/userlogs' ? 'active' : ''}>
              <Link to="/userlogs" onClick={handleLinkClick}>USER LOGS</Link>
            </li>
            <li className={location.pathname === '/sensorlogs' ? 'active' : ''}>
              <Link to="/sensorlogs" onClick={handleLinkClick}>SENSOR LOGS</Link>
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