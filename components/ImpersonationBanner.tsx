import React from "react";
import { useAuth } from "../hooks/useAuth";

const ImpersonationBanner: React.FC = () => {
  const { userProfile, logout } = useAuth();

  if (!userProfile?.isImpersonating) {
    return null;
  }

  const handleEndImpersonation = async () => {
    await logout();
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700 dark:text-yellow-200">
              <strong>🎭 Impersonation Mode Active:</strong> You are currently viewing as{" "}
              <span className="font-medium">{userProfile.email}</span>
              {userProfile.originalAdmin && (
                <span className="text-yellow-600 dark:text-yellow-300">
                  {" "}(Admin: {userProfile.originalAdmin})
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={handleEndImpersonation}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700"
          >
            End Impersonation
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
