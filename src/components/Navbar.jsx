import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';
import logo from '../assets/images/cropifytextlogo.png';

function Navbar() {
  const location = useLocation(); // Get current route

  return (
    <div className="sidebar">
      <div className='logo'>
        <img src={logo} alt="Logo" />
      </div>
      <nav>
        <ul className="navlist">
          <li className={location.pathname === '/dashboard' ? 'active' : ''}>
            <Link to="/dashboard">DASHBOARD</Link>
          </li>
          <li className={location.pathname === '/analytics' ? 'active' : ''}>
            <Link to="/analytics">ANALYTICS</Link>
          </li>
          <li className={location.pathname === '/userlogs' ? 'active' : ''}>
            <Link to="/userlogs">USER LOGS</Link>
          </li>
          <li className={location.pathname === '/sensorlogs' ? 'active' : ''}>
            <Link to="/sensorlogs">SENSOR LOGS</Link>
          </li>
          <li className={location.pathname === '/manageapp' ? 'active' : ''}>
            <Link to="/manageapp">MANAGE APP</Link>
          </li>
      
        </ul>
      </nav>
    </div>
  );
}

export default Navbar;
