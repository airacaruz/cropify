import { useEffect, useState } from 'react';
import adminStatusTracker from '../utils/adminStatusTracker';

/**
 * Custom hook to get real-time online status for all admins
 * @returns {Object} - Object containing onlineStatus and loading state
 */
export const useAdminOnlineStatus = () => {
  const [onlineStatus, setOnlineStatus] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    const loadInitialStatus = async () => {
      try {
        const status = await adminStatusTracker.getAllAdminsOnlineStatus();
        setOnlineStatus(status);
        setLoading(false);
      } catch (error) {
        console.error('Error loading initial admin status:', error);
        setLoading(false);
      }
    };

    loadInitialStatus();

    // Subscribe to real-time updates
    const handleStatusUpdate = (newStatus) => {
      setOnlineStatus(newStatus);
    };

    adminStatusTracker.subscribeToOnlineStatus(handleStatusUpdate);

    // Cleanup subscription on unmount
    return () => {
      adminStatusTracker.unsubscribeFromOnlineStatus(handleStatusUpdate);
    };
  }, []);

  return { onlineStatus, loading };
};

export default useAdminOnlineStatus;

