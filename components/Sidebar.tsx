import React, { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useScreenLock } from "../contexts/ScreenLockContext";
import { usePermissions } from "../hooks/usePermissions";
import { PAGES } from "../config/permissions";
import {
  BOS_NAV_GROUP_LABEL,
  BOS_VERTICAL_SLICE_NAV_ITEMS,
} from "../bos/config/navigation";
import {
  AOS_NAV_GROUP_LABEL,
  AOS_NAV_ITEMS,
} from "../aos/config/navigation";
import { useAosFeatureFlags } from "../aos/hooks/useAosFeatureFlags";
import { AOS_FEATURE_FLAG } from "../aos/config/featureFlags";
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
  const { hasPageAccess, isOwner, isAdmin, canImportLeads, hasPermission, canAccessBosModule, canAccessAosModule } =
    usePermissions();
  const { isEnabled: isAosFeatureEnabled } = useAosFeatureFlags();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const financePaths = [
    "/bank-accounts",
    "/expenses",
    "/loans",
    "/reports",
  ];
  const isFinancePath = financePaths.some(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
  );
  const isBosPath =
    location.pathname === "/bos" ||
    location.pathname.startsWith("/bos/");
  const isAosPath =
    location.pathname === "/aos" ||
    location.pathname.startsWith("/aos/");

  const [leadsOpen, setLeadsOpen] = useState(
    () =>
      location.pathname === "/leads" || location.pathname.startsWith("/leads/"),
  );
  const [financeOpen, setFinanceOpen] = useState(() => isFinancePath);
  const [bosOpen, setBosOpen] = useState(() => isBosPath);
  const [aosOpen, setAosOpen] = useState(() => isAosPath);

  useEffect(() => {
    if (location.pathname === "/leads" || location.pathname.startsWith("/leads/")) {
      setLeadsOpen(true);
    }
    if (isFinancePath) {
      setFinanceOpen(true);
    }
    if (isBosPath) {
      setBosOpen(true);
    }
    if (isAosPath) {
      setAosOpen(true);
    }
  }, [location.pathname, isFinancePath, isBosPath, isAosPath]);

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
      to: "/leads/my-assigned",
      icon: <WorkspaceIcon />,
      label: "My workspace",
      page: PAGES.MY_ASSIGNED_LEADS,
    },
    {
      to: "/performance",
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
      label: "Performance",
      page: PAGES.PERFORMANCE,
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

  const canAssignedLeadsHub = hasPageAccess(PAGES.LEADS_ASSIGNED_HUB);

  const financeNavItems = [
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
      to: "/loans",
      icon: (
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      label: "Loans",
      page: PAGES.LOANS,
    },
    {
      to: "/reports",
      icon: (
        <svg
          className="h-5 w-5 shrink-0"
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
      label: "Reports",
      page: PAGES.REPORTS,
    },
  ].filter((item) => hasPageAccess(item.page));

  const financeNavIcon = (
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
        d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
      />
    </svg>
  );

  const financeSubLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg py-2 pl-3 pr-2 text-sm font-medium transition-colors ${
      isActive
        ? "bg-primary-50 text-primary-800 ring-1 ring-primary-500/15 dark:bg-gray-800 dark:text-white dark:ring-primary-400/20"
        : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-800/80 dark:hover:text-white"
    }`;

  const bosNavIcon = (
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
        d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
      />
    </svg>
  );

  const bosSubLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg py-2 pl-3 pr-2 text-sm font-medium transition-colors ${
      isActive
        ? "bg-primary-50 text-primary-800 ring-1 ring-primary-500/15 dark:bg-gray-800 dark:text-white dark:ring-primary-400/20"
        : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-800/80 dark:hover:text-white"
    }`;

  const aosNavIcon = (
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
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );

  const aosSubLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg py-2 pl-3 pr-2 text-sm font-medium transition-colors ${
      isActive
        ? "bg-primary-50 text-primary-800 ring-1 ring-primary-500/15 dark:bg-gray-800 dark:text-white dark:ring-primary-400/20"
        : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-800/80 dark:hover:text-white"
    }`;

  const bosNavItems = BOS_VERTICAL_SLICE_NAV_ITEMS.filter((item) =>
    item.requiredPermissions.some((permission) => hasPermission(permission)),
  );

  const aosNavItems = AOS_NAV_ITEMS.filter((item) =>
    item.requiredPermissions.some((permission) => hasPermission(permission)),
  );

  const leadsNavIcon = (
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
  );

  const leadsSubLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg py-2 pl-3 pr-2 text-sm font-medium transition-colors ${
      isActive
        ? "bg-primary-50 text-primary-800 ring-1 ring-primary-500/15 dark:bg-gray-800 dark:text-white dark:ring-primary-400/20"
        : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-800/80 dark:hover:text-white"
    }`;

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

  /** Keep Leads with CRM/sales flow: after Customers, else after Invoices, else after Dashboard. */
  const leadsMenuAfterTo = navItems.some((i) => i.to === "/customers")
    ? "/customers"
    : navItems.some((i) => i.to === "/invoices")
      ? "/invoices"
      : "/";

  /** Finance group sits after Products when visible, else after Performance or Dashboard. */
  const financeMenuAfterTo = navItems.some((i) => i.to === "/products")
    ? "/products"
    : navItems.some((i) => i.to === "/performance")
      ? "/performance"
      : "/";

  /** Strategy (BOS) group sits after Finance when visible, else after Products or Performance. */
  const bosMenuAfterTo = financeNavItems.length > 0
    ? financeMenuAfterTo
    : navItems.some((i) => i.to === "/products")
      ? "/products"
      : navItems.some((i) => i.to === "/performance")
        ? "/performance"
        : "/";

  /** Delivery (AOS) group sits after Strategy (BOS) in the sidebar. */
  const aosMenuAfterTo = bosMenuAfterTo;

  const financeMenuBlock =
    financeNavItems.length > 0 ? (
      <li className="space-y-0.5">
        <button
          type="button"
          onClick={() => setFinanceOpen((o) => !o)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
            isFinancePath
              ? "text-primary-700 dark:text-primary-300"
              : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-800/80 dark:hover:text-white"
          }`}
          aria-expanded={financeOpen}
        >
          {financeNavIcon}
          <span className="min-w-0 flex-1 truncate">Finance</span>
          <span className="shrink-0 text-xs text-slate-400 dark:text-gray-500" aria-hidden>
            {financeOpen ? "▲" : "▼"}
          </span>
        </button>
        {financeOpen ? (
          <ul className="ml-3 space-y-0.5 border-l border-slate-200/90 pl-2 dark:border-gray-700">
            {financeNavItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={financeSubLinkClass}
                >
                  <span className="shrink-0 opacity-80">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        ) : null}
      </li>
    ) : null;

  const bosMenuBlock =
    canAccessBosModule() && bosNavItems.length > 0 ? (
      <li className="space-y-0.5">
        <button
          type="button"
          onClick={() => setBosOpen((o) => !o)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
            isBosPath
              ? "text-primary-700 dark:text-primary-300"
              : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-800/80 dark:hover:text-white"
          }`}
          aria-expanded={bosOpen}
        >
          {bosNavIcon}
          <span className="min-w-0 flex-1 truncate">{BOS_NAV_GROUP_LABEL}</span>
          <span className="shrink-0 text-xs text-slate-400 dark:text-gray-500" aria-hidden>
            {bosOpen ? "▲" : "▼"}
          </span>
        </button>
        {bosOpen ? (
          <ul className="ml-3 space-y-0.5 border-l border-slate-200/90 pl-2 dark:border-gray-700">
            {bosNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/bos/initiatives"}
                  onClick={() => setIsOpen(false)}
                  className={bosSubLinkClass}
                >
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        ) : null}
      </li>
    ) : null;

  const aosMenuBlock =
    isAosFeatureEnabled(AOS_FEATURE_FLAG.MODULE_ENABLED) &&
    canAccessAosModule() &&
    aosNavItems.length > 0 ? (
      <li className="space-y-0.5">
        <button
          type="button"
          onClick={() => setAosOpen((o) => !o)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
            isAosPath
              ? "text-primary-700 dark:text-primary-300"
              : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-800/80 dark:hover:text-white"
          }`}
          aria-expanded={aosOpen}
        >
          {aosNavIcon}
          <span className="min-w-0 flex-1 truncate">{AOS_NAV_GROUP_LABEL}</span>
          <span className="shrink-0 text-xs text-slate-400 dark:text-gray-500" aria-hidden>
            {aosOpen ? "▲" : "▼"}
          </span>
        </button>
        {aosOpen ? (
          <ul className="ml-3 space-y-0.5 border-l border-slate-200/90 pl-2 dark:border-gray-700">
            {aosNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/aos"}
                  onClick={() => setIsOpen(false)}
                  className={aosSubLinkClass}
                >
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        ) : null}
      </li>
    ) : null;

  const leadsMenuBlock =
    hasPageAccess(PAGES.LEADS) ? (
      <li className="space-y-0.5">
        <button
          type="button"
          onClick={() => setLeadsOpen((o) => !o)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
            location.pathname.startsWith("/leads")
              ? "text-primary-700 dark:text-primary-300"
              : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-gray-300 dark:hover:bg-gray-800/80 dark:hover:text-white"
          }`}
          aria-expanded={leadsOpen}
        >
          {leadsNavIcon}
          <span className="min-w-0 flex-1 truncate">Leads</span>
          <span className="shrink-0 text-xs text-slate-400 dark:text-gray-500" aria-hidden>
            {leadsOpen ? "▲" : "▼"}
          </span>
        </button>
        {leadsOpen ? (
          <ul className="ml-3 space-y-0.5 border-l border-slate-200/90 pl-2 dark:border-gray-700">
            <li>
              <NavLink to="/leads" end onClick={() => setIsOpen(false)} className={leadsSubLinkClass}>
                All leads
              </NavLink>
            </li>
            {canAssignedLeadsHub ? (
              <li>
                <NavLink
                  to="/leads/assigned"
                  onClick={() => setIsOpen(false)}
                  className={leadsSubLinkClass}
                >
                  Assigned leads
                </NavLink>
              </li>
            ) : null}
            {canImportLeads() ? (
              <li>
                <NavLink
                  to="/leads/import"
                  onClick={() => setIsOpen(false)}
                  className={leadsSubLinkClass}
                >
                  Import
                </NavLink>
              </li>
            ) : null}
          </ul>
        ) : null}
      </li>
    ) : null;

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
              <React.Fragment key={item.to}>
                <li>
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
                {leadsMenuBlock && item.to === leadsMenuAfterTo ? leadsMenuBlock : null}
                {financeMenuBlock && item.to === financeMenuAfterTo
                  ? financeMenuBlock
                  : null}
                {bosMenuBlock && item.to === bosMenuAfterTo ? bosMenuBlock : null}
                {aosMenuBlock && item.to === aosMenuAfterTo ? aosMenuBlock : null}
              </React.Fragment>
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
      <div className="hidden lg:block w-64 h-full shrink-0">{sidebarContent}</div>
    </>
  );
};

export default Sidebar;
