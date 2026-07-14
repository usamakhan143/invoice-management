import React from "react";
import { Outlet, useLocation } from "react-router-dom";

const AuthLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex h-full min-h-0 overflow-y-auto items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div key={location.key} className="app-route-transition">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
