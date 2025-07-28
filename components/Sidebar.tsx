import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { usePermissions } from "../hooks/usePermissions";
import { PAGES } from "../config/permissions";
import {
  DashboardIcon,
  InvoiceIcon,
  CustomerIcon,
  ProductIcon,
  BankIcon,
  ExpenseIcon,
  LogoutIcon,
  MenuIcon,
  CloseIcon,
} from "../constants";

const Sidebar: React.FC = () => {
  const { logout, userProfile } = useAuth();
  const { hasPageAccess, isOwner, isAdmin } = usePermissions();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const allNavItems = [
    {
      to: "/",
      icon: <DashboardIcon />,
      label: "Dashboard",
      page: PAGES.DASHBOARD,
    },
    {
      to: "/invoices",
      icon: <InvoiceIcon />,
      label: "Invoices",
      page: PAGES.INVOICES,
    },
    {
      to: "/customers",
      icon: <CustomerIcon />,
      label: "Customers",
      page: PAGES.CUSTOMERS,
    },
    {
      to: "/products",
      icon: <ProductIcon />,
      label: "Products",
      page: PAGES.PRODUCTS,
    },
    {
      to: "/bank-accounts",
      icon: <BankIcon />,
      label: "Bank Accounts",
      page: PAGES.BANK_ACCOUNTS,
    },
    {
      to: "/expenses",
      icon: <ExpenseIcon />,
      label: "Expenses",
      page: PAGES.EXPENSES,
    },
    {
      to: "/activity",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m0 0h2m-2 0v4a2 2 0 002 2h2a2 2 0 002-2v-4m-6 0a2 2 0 002-2V9a2 2 0 00-2-2H9z"
          />
        </svg>
      ),
      label: "My Activity",
      page: PAGES.DASHBOARD,
    },
    {
      to: "/company-activity",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      label: "Company Activity",
      page: PAGES.DASHBOARD,
      adminOnly: true,
    },
    {
      to: "/users",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
          />
        </svg>
      ),
      label: "User Management",
      page: PAGES.USER_MANAGEMENT,
      adminOnly: true,
    },
  ];

  // Filter navigation items based on permissions
  const navItems = allNavItems.filter((item) => {
    // For user management, check specific permission instead of adminOnly
    if (item.to === "/users") {
      return hasPageAccess(item.page);
    }
    // Show other admin-only items to owners and admins
    if (item.adminOnly && !isOwner && !isAdmin) {
      return false;
    }
    // Check page access permission
    return hasPageAccess(item.page);
  });

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white dark:bg-gray-800 shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
          {userProfile?.companyName || "Invoicer"}
        </h1>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden text-gray-500 dark:text-gray-400"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="flex flex-col justify-between flex-1 overflow-hidden">
        <nav className="mt-4 flex-1 overflow-y-auto custom-scrollbar sidebar-scrollbar">
          <ul>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      isActive
                        ? "bg-primary-50 dark:bg-gray-700 border-r-4 border-primary-500 text-primary-600 dark:text-white"
                        : ""
                    }`
                  }
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">
                {userProfile?.displayName || userProfile?.companyName || "User"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {userProfile?.email}
              </p>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/profile");
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Edit Profile"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <LogoutIcon />
            <span className="ml-2">Logout</span>
          </button>
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              © 2024{" "}
              <a
                href="https://itveins.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                IT Veins LLC
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden fixed bottom-4 left-4 z-20">
        <button
          onClick={() => setIsOpen(true)}
          className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg transition-colors"
        >
          <MenuIcon />
        </button>
      </div>
      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 z-30 transform transition-transform duration-300 ease-in-out lg:hidden ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="w-64 h-full">{sidebarContent}</div>
        <div
          className="flex-1 bg-black opacity-50"
          onClick={() => setIsOpen(false)}
        ></div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 h-screen">{sidebarContent}</div>
    </>
  );
};

export default Sidebar;
