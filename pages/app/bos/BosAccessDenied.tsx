import React from "react";

const BosAccessDenied: React.FC<{ message?: string }> = ({
  message = "You do not have permission to access the Business Operating System module.",
}) => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="max-w-md text-center">
      <div className="mb-4 text-5xl" aria-hidden>
        🔒
      </div>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Access denied</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{message}</p>
    </div>
  </div>
);

export default BosAccessDenied;
