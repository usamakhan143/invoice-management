import React from "react";
import { useNetworkStatus } from "../hooks/usePerformanceMonitor";

const NetworkStatus: React.FC = () => {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-2 px-4">
      <div className="flex items-center justify-center space-x-2">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728"
          />
        </svg>
        <span className="text-sm font-medium">
          No internet connection. Please check your network.
        </span>
      </div>
    </div>
  );
};

export default NetworkStatus;
