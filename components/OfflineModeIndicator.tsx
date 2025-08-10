import React from 'react';
import { isEmergencyOfflineMode, disableEmergencyOfflineMode } from '../services/offlineMode';

const OfflineModeIndicator: React.FC = () => {
  const isOffline = isEmergencyOfflineMode();

  if (!isOffline) return null;

  const handleExitOfflineMode = () => {
    if (window.confirm('Exit offline mode and try to reconnect to Firebase?')) {
      disableEmergencyOfflineMode();
      window.location.reload();
    }
  };

  return (
    <div className="bg-orange-500 text-white px-4 py-2 text-center text-sm">
      <div className="flex items-center justify-center space-x-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span>Emergency Offline Mode - Using sample data</span>
        <button
          onClick={handleExitOfflineMode}
          className="ml-2 px-2 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30"
        >
          Try Reconnect
        </button>
      </div>
    </div>
  );
};

export default OfflineModeIndicator;
