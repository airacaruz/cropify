import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

function Layout() {
  return (
    <div>
      <Navbar />
      <div style={{ marginLeft: '220px', padding: '20px' }}>
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
