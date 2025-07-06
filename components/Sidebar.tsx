import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  DashboardIcon,
  InvoiceIcon,
  CustomerIcon,
  ProductIcon,
  BankIcon,
  LogoutIcon,
  MenuIcon,
  CloseIcon,
} from "../constants";

const Sidebar: React.FC = () => {
  const { logout, userProfile } = useAuth();
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

  const navItems = [
    { to: "/", icon: <DashboardIcon />, label: "Dashboard" },
    { to: "/invoices", icon: <InvoiceIcon />, label: "Invoices" },
    { to: "/customers", icon: <CustomerIcon />, label: "Customers" },
    { to: "/products", icon: <ProductIcon />, label: "Products" },
    { to: "/bank-accounts", icon: <BankIcon />, label: "Bank Accounts" },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white dark:bg-gray-800 shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
          Invoicer
        </h1>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden text-gray-500 dark:text-gray-400"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="flex flex-col justify-between flex-1">
        <nav className="mt-4">
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
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              {userProfile?.companyName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {userProfile?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <LogoutIcon />
            <span className="ml-2">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-20">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-md"
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
