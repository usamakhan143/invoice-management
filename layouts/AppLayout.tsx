import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ImpersonationBanner from "../components/ImpersonationBanner";

const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          <ImpersonationBanner />
          <Outlet />
        </main>
        <footer className="bg-white dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-4 py-2">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © 2024{" "}
              <a
                href="https://itveins.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                IT Veins LLC
              </a>{" "}
              - All Rights Reserved
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
