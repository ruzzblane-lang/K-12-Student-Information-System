import React, { useState, useEffect } from 'react';

const SyncStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    const handleConnectionChange = (event) => {
      setIsOnline(event.detail.isOnline);
    };

    window.addEventListener('connectionChange', handleConnectionChange);

    return () => {
      window.removeEventListener('connectionChange', handleConnectionChange);
    };
  }, []);

  useEffect(() => {
    const checkPendingActions = async () => {
      try {
        const offlineStorage = (await import('../services/offlineStorage')).default;
        const actions = await offlineStorage.getPendingActions();
        setPendingActions(actions);
      } catch (error) {
        console.error('Failed to check pending actions:', error);
      }
    };

    const checkLastSync = async () => {
      try {
        const offlineStorage = (await import('../services/offlineStorage')).default;
        const lastSyncTime = await offlineStorage.getCacheMetadata('last_sync');
        setLastSync(lastSyncTime);
      } catch (error) {
        console.error('Failed to check last sync:', error);
      }
    };

    checkPendingActions();
    checkLastSync();

    const interval = setInterval(() => {
      checkPendingActions();
      checkLastSync();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleSyncNow = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      // Trigger background sync
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('background-sync');
      }

      // Update last sync time
      const offlineStorage = (await import('../services/offlineStorage')).default;
      await offlineStorage.setCacheMetadata('last_sync', new Date().toISOString());
      setLastSync(new Date().toISOString());

      // Refresh pending actions
      const actions = await offlineStorage.getPendingActions();
      setPendingActions(actions);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (isOnline && pendingActions.length === 0) {
    return null; // Don't show when everything is synced
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          }`} />
          
          <div>
            <p className="text-sm font-medium text-gray-900">
              {isOnline ? 'Online' : 'Offline Mode'}
            </p>
            <p className="text-xs text-gray-500">
              Last sync: {formatLastSync(lastSync)}
            </p>
          </div>
        </div>

        {pendingActions.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {pendingActions.length} pending
            </span>
            {isOnline && (
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        )}
      </div>

      {pendingActions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Pending actions:</p>
          <div className="space-y-1">
            {pendingActions.slice(0, 3).map((action, index) => (
              <div key={index} className="flex items-center space-x-2 text-xs">
                <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                <span className="text-gray-600">
                  {action.type} - {action.timestamp ? new Date(action.timestamp).toLocaleTimeString() : 'Unknown time'}
                </span>
              </div>
            ))}
            {pendingActions.length > 3 && (
              <p className="text-xs text-gray-400">
                +{pendingActions.length - 3} more...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncStatus;
