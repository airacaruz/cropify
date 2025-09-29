import Navbar from './Navbar';
import SessionTimeout from './SessionTimeout';

function Layout({ children }) {
  return (
    <div>
      <SessionTimeout timeoutMinutes={30} />
      <Navbar />
      <div style={{ marginLeft: '0px', padding: '20px' }}>
        {children}
      </div>
    </div>
  );
}

export default Layout;