import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useScreenLock } from "../contexts/ScreenLockContext";
import { usePermissions } from "../hooks/usePermissions";
import { PAGES } from "../config/permissions";
import {
  DashboardIcon,
  InvoiceIcon,
  CustomerIcon,
  WorkspaceIcon,
  ProductIcon,
  BankIcon,
  ExpenseIcon,
  LogoutIcon,
  MenuIcon,
  CloseIcon,
  ActivityLogIcon,
} from "../constants";
import { BRAND_LOGO_ALT, BRAND_LOGO_DARK } from "../config/brand";

const Sidebar: React.FC = () => {
  const { logout, userProfile } = useAuth();
  const { hasScreenPin, lockScreen } = useScreenLock();
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
      to: "/leads",
      icon: (
        <svg
          className="h-6 w-6 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
      ),
      label: "Leads",
      page: PAGES.LEADS,
    },
    {
      to: "/leads/my-assigned",
      icon: <WorkspaceIcon />,
      label: "My workspace",
      page: PAGES.MY_ASSIGNED_LEADS,
    },
    {
      to: "/campaigns",
      icon: (
        <svg
          className="h-6 w-6 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
          />
        </svg>
      ),
      label: "Campaigns",
      page: "campaigns",
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
      icon: <ActivityLogIcon />,
      label: "My Activity",
      page: PAGES.DASHBOARD,
    },
    {
      to: "/company-activity",
      icon: (
        <svg
          className="h-6 w-6 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 21h19.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
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
          className="h-6 w-6 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
          />
        </svg>
      ),
      label: "User Management",
      page: PAGES.USER_MANAGEMENT,
      adminOnly: true,
    },
    {
      to: "/data-management",
      icon: (
        <svg
          className="h-6 w-6 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      ),
      label: "Data Management",
      page: PAGES.DASHBOARD,
      adminOnly: true,
    },
    {
      to: "/super-admin",
      icon: (
        <svg
          className="h-6 w-6 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      ),
      label: "Super Admin",
      page: PAGES.DASHBOARD,
      superAdminOnly: true,
    },
  ];

  // Check if user is super admin (IT VEINS LLC owner)
  const isSuperAdmin = isOwner && userProfile?.companyName?.toLowerCase().includes('it veins');

  // Filter navigation items based on permissions
  const navItems = allNavItems.filter((item) => {
    // For super admin items, only show to IT VEINS LLC owners
    if ((item as any).superAdminOnly && !isSuperAdmin) {
      return false;
    }
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
    <div className="flex h-full flex-col border-r-2 border-slate-200/90 bg-gradient-to-b from-slate-100 to-slate-50 shadow-[4px_0_24px_-12px_rgba(15,23,42,0.25)] dark:border-gray-700 dark:from-gray-950 dark:to-gray-900 dark:shadow-[4px_0_32px_-8px_rgba(0,0,0,0.65)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/70 p-4 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/60">
        <div className="min-w-0 flex-1">
          <img
            src={BRAND_LOGO_DARK}
            alt={BRAND_LOGO_ALT}
            className="h-10 w-auto max-w-[200px] object-contain object-left"
          />
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-lg p-2 text-slate-500 hover:bg-white/80 hover:text-slate-800 lg:hidden dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="flex flex-col justify-between flex-1 overflow-hidden">
        <nav className="mt-3 flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar sidebar-scrollbar">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white text-primary-700 shadow-sm ring-1 ring-primary-500/20 dark:bg-gray-800 dark:text-white dark:ring-primary-400/25"
                        : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-800/80 dark:hover:text-white"
                    }`
                  }
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-slate-200/90 bg-white/50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
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
          {hasScreenPin ? (
            <button
              type="button"
              onClick={lockScreen}
              className="mb-2 w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
              title="Lock screen (enter PIN to continue)"
            >
              <svg
                className="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span className="ml-2">Lock screen</span>
            </button>
          ) : null}
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
      <div className="lg:hidden fixed bottom-4 left-4 z-20">
        <button
          onClick={() => setIsOpen(true)}
          className="p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-xl transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
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
