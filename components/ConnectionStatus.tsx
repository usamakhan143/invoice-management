import React, { useState, useEffect } from 'react';
import { checkNetworkConnectivity, connectToFirebase } from '../services/firebase';

interface ConnectionStatusProps {
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [firebaseStatus, setFirebaseStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [isRetrying, setIsRetrying] = useState(false);

  const checkConnectivity = async () => {
    try {
      // Check network connectivity
      const hasNetwork = await checkNetworkConnectivity();
      setNetworkStatus(hasNetwork ? 'online' : 'offline');

      if (hasNetwork) {
        // Check Firebase connectivity
        const isFirebaseConnected = await connectToFirebase(1);
        setFirebaseStatus(isFirebaseConnected ? 'connected' : 'disconnected');
      } else {
        setFirebaseStatus('disconnected');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setNetworkStatus('offline');
      setFirebaseStatus('disconnected');
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await checkConnectivity();
    setIsRetrying(false);
  };

  useEffect(() => {
    // Initial check
    checkConnectivity();

    // Periodic checks every 30 seconds
    const interval = setInterval(checkConnectivity, 30000);

    // Listen for online/offline events
    const handleOnline = () => {
      checkConnectivity();
    };

    const handleOffline = () => {
      setNetworkStatus('offline');
      setFirebaseStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't show anything if everything is working
  if (networkStatus === 'online' && firebaseStatus === 'connected') {
    return null;
  }

  const getStatusColor = () => {
    if (networkStatus === 'offline') return 'bg-red-500';
    if (firebaseStatus === 'disconnected') return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (networkStatus === 'checking' || firebaseStatus === 'checking') {
      return 'Checking connection...';
    }
    if (networkStatus === 'offline') {
      return 'No internet connection';
    }
    if (firebaseStatus === 'disconnected') {
      return 'Database connection issues';
    }
    return 'Connection issues';
  };

  const getStatusIcon = () => {
    if (networkStatus === 'offline') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M18.364 5.636l-12.728 12.728m0 0L12 12m-6.364 6.364L12 12m6.364-6.364L12 12" />
        </svg>
      );
    }
    if (firebaseStatus === 'disconnected') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className={`${getStatusColor()} text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm`}>
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        {(networkStatus === 'offline' || firebaseStatus === 'disconnected') && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="ml-2 px-2 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30 disabled:opacity-50"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
