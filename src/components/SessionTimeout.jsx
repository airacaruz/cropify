import { getAuth, signOut } from 'firebase/auth';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { app } from '../firebase';

const SessionTimeout = ({ timeoutMinutes = 30 }) => {
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const resetTimeout = () => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Set warning timeout (5 minutes before actual timeout)
    const warningTime = (timeoutMinutes - 5) * 60 * 1000;
    warningTimeoutRef.current = setTimeout(() => {
      showTimeoutWarning();
    }, warningTime);

    // Set actual timeout
    const timeoutTime = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      handleTimeout();
    }, timeoutTime);
  };

  const showTimeoutWarning = () => {
    const remainingTime = 5; // 5 minutes remaining
    const shouldContinue = window.confirm(
      `Your session will expire in ${remainingTime} minutes due to inactivity. Click OK to continue your session, or Cancel to logout now.`
    );

    if (shouldContinue) {
      // Reset the timeout if user chooses to continue
      resetTimeout();
    } else {
      // Logout immediately if user chooses to logout
      handleTimeout();
    }
  };

  const handleTimeout = async () => {
    try {
      // Clear all timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }

      // Clear sensitive data
      localStorage.removeItem('adminName');
      localStorage.removeItem('userRole');

      // Sign out from Firebase
      const auth = getAuth(app);
      await signOut(auth);

      // Show timeout message
      alert('Your session has expired due to inactivity. Please login again.');

      // Navigate to login page
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error during session timeout:', error);
      // Force redirect even if signOut fails
      navigate('/', { replace: true });
    }
  };

  const handleActivity = () => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Only reset timeout if there's been significant activity (more than 1 minute)
    if (timeSinceLastActivity > 60000) {
      resetTimeout();
    }
  };

  useEffect(() => {
    // Set up activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initial timeout setup
    resetTimeout();

    // Cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [timeoutMinutes]);

  // This component doesn't render anything
  return null;
};

export default SessionTimeout;
