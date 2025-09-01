import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/images/cropifytextlogo.png';
import '../styles/Navbar.css';

function Navbar() {
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleLinkClick = () => {
    closeDrawer();
  };

  return (
    <>
      <button 
        className="hamburger-menu" 
        onClick={toggleDrawer}
        aria-label="Toggle navigation"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      <div className={`sidebar drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className='logo'>
          <img src={logo} alt="Logo" />
          <button 
            className="close-drawer" 
            onClick={closeDrawer}
            aria-label="Close navigation"
          >
            ×
          </button>
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
            <li className={location.pathname === '/manageadmin' ? 'active' : ''}>
              <Link to="/manageadmin" onClick={handleLinkClick}>MANAGE ADMIN</Link>
            </li>
            <li className={location.pathname === '/manageapp' ? 'active' : ''}>
              <Link to="/manageapp" onClick={handleLinkClick}>MANAGE APP</Link>
            </li>
          </ul>
        </nav>
      </div>
      
      {isDrawerOpen && (
        <div className="drawer-overlay" onClick={closeDrawer}></div>
      )}
    </>
  );
}

export default Navbar;
