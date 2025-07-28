import React, { useState, useEffect } from 'react';
import { FirebaseHealth, FirebaseHealthChecker } from '../services/firebaseHealth';

const FirebaseDebugPanel: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking...');
  const [lastCheck, setLastCheck] = useState<string>('');
  const [cacheInfo, setCacheInfo] = useState<string>('');
  const [networkStatus, setNetworkStatus] = useState<string>('');

  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(navigator.onLine ? '🌐 Online' : '📱 Offline');
    };

    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  const checkConnection = async () => {
    setConnectionStatus('🔄 Checking...');

    try {
      const isReachable = await FirebaseHealth.isFirebaseReachable();
      const healthCheck = await FirebaseHealthChecker.checkConnection();

      setConnectionStatus(
        isReachable
          ? '✅ Connected'
          : '🔄 Offline Mode'
      );

      setLastCheck(new Date().toLocaleTimeString());

      // Show cache info
      const testData = await FirebaseHealth.safeGetCollection('invoices');
      setCacheInfo(`Invoices: ${testData.length} items loaded`);

      console.log('Firebase Debug:', {
        reachable: isReachable,
        health: healthCheck,
        cached: testData.length
      });

    } catch (error) {
      setConnectionStatus('❌ Error');
      console.error('Connection check failed:', error);
    }
  };

  const clearCache = () => {
    FirebaseHealth.clearCache();
    setCacheInfo('Cache cleared');
    setTimeout(() => setCacheInfo(''), 2000);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg text-sm max-w-xs">
      <div className="font-bold mb-2">🔥 Firebase Debug</div>
      <div className="space-y-1">
        <div>Network: {networkStatus}</div>
        <div>Firebase: {connectionStatus}</div>
        {lastCheck && <div>Last check: {lastCheck}</div>}
        {cacheInfo && <div>{cacheInfo}</div>}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={checkConnection}
          className="bg-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-700"
        >
          Test
        </button>
        <button
          onClick={clearCache}
          className="bg-red-600 px-2 py-1 rounded text-xs hover:bg-red-700"
        >
          Clear Cache
        </button>
      </div>
    </div>
  );
};

export default FirebaseDebugPanel;
