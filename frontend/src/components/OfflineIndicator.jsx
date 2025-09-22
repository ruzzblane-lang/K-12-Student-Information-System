import React, { useState, useEffect } from 'react';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);
  const [pendingActions, setPendingActions] = useState(0);

  useEffect(() => {
    const handleConnectionChange = (event) => {
      const { isOnline: online } = event.detail;
      setIsOnline(online);
      
      // Show indicator when going offline or coming back online
      if (!online) {
        setShowIndicator(true);
      } else {
        // Show briefly when coming back online
        setShowIndicator(true);
        setTimeout(() => setShowIndicator(false), 3000);
      }
    };

    // Listen for custom connection change events
    window.addEventListener('connectionChange', handleConnectionChange);

    // Also listen for native events as backup
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('connectionChange', handleConnectionChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Check for pending actions periodically
    const checkPendingActions = async () => {
      try {
        const offlineStorage = (await import('../services/offlineStorage')).default;
        const actions = await offlineStorage.getPendingActions();
        setPendingActions(actions.length);
      } catch (error) {
        console.error('Failed to check pending actions:', error);
      }
    };

    checkPendingActions();
    const interval = setInterval(checkPendingActions, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!showIndicator) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isOnline ? 'translate-x-0' : 'translate-x-0'
    }`}>
      <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg ${
        isOnline 
          ? 'bg-green-500 text-white' 
          : 'bg-red-500 text-white'
      }`}>
        <div className="flex items-center space-x-2">
          <span className="text-lg">
            {isOnline ? '🟢' : '🔴'}
          </span>
          <span className="text-sm font-medium">
            {isOnline ? 'Back Online' : 'Offline Mode'}
          </span>
        </div>
        
        {!isOnline && (
          <div className="text-xs opacity-90">
            {pendingActions > 0 && (
              <span className="bg-white bg-opacity-20 px-2 py-1 rounded">
                {pendingActions} pending
              </span>
            )}
          </div>
        )}
        
        <button
          onClick={() => setShowIndicator(false)}
          className="ml-2 text-white hover:text-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default OfflineIndicator;
