import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePermissions } from "../../hooks/usePermissions";
import { db } from "../../services/firebase";
import DataBackupManager from "../../components/DataBackupManager";

const IconInvoice = () => (
  <svg className="h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IconUsers = () => (
  <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconCube = () => (
  <svg className="h-6 w-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const IconDatabase = () => (
  <svg className="h-5 w-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
  </svg>
);

const DataManagementPage: React.FC = () => {
  usePageTitle("Data Management");
  const { user, userProfile } = useAuth();
  const {
    canExportBackup,
    canImportBackup,
    canViewBackupHistory,
    isOwner,
    isAdmin,
  } = usePermissions();

  const [counts, setCounts] = useState<{
    invoices: number | null;
    customers: number | null;
    products: number | null;
  }>({ invoices: null, customers: null, products: null });
  const [countsLoading, setCountsLoading] = useState(true);

  useEffect(() => {
    if (!user || !userProfile || (!isOwner && !isAdmin)) {
      setCountsLoading(false);
      return;
    }
    const companyId = userProfile.isOwner ? user.uid : userProfile.companyId;
    if (!companyId) {
      setCountsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setCountsLoading(true);
      try {
        const [invSnap, custSnap, prodSnap] = await Promise.all([
          db.collection("invoices").where("companyId", "==", companyId).get(),
          db.collection("customers").where("companyId", "==", companyId).get(),
          db.collection("products").where("companyId", "==", companyId).get(),
        ]);
        if (!cancelled) {
          setCounts({
            invoices: invSnap.size,
            customers: custSnap.size,
            products: prodSnap.size,
          });
        }
      } catch {
        if (!cancelled) setCounts({ invoices: null, customers: null, products: null });
      } finally {
        if (!cancelled) setCountsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, userProfile, isOwner, isAdmin]);

  const formatCount = (n: number | null) => {
    if (countsLoading) return "…";
    if (n === null) return "—";
    return n.toLocaleString();
  };

  if (!isOwner && !isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
            <svg className="h-7 w-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-9V5a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h4" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Access restricted</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Data management is available to company owners and admins only.
          </p>
        </div>
      </div>
    );
  }

  const collections = [
    { name: "invoices", label: "Invoices", hint: "Line items, totals, payment state" },
    { name: "customers", label: "Customers", hint: "Billing contacts" },
    { name: "products", label: "Products", hint: "Catalog & pricing" },
    { name: "bankAccounts", label: "Bank accounts", hint: "Balances & currency" },
    { name: "expenses", label: "Expenses", hint: "Spend by category" },
    { name: "activities", label: "Activity log", hint: "Audit trail (where enabled)" },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              Administration
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Data management
            </h1>
            <p className="mt-2 max-w-xl text-sm text-gray-600 dark:text-gray-400">
              Export or import company data, review backup history, and see how records are organized in Firestore.
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-900/50">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Company</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
              {userProfile?.companyName || "—"}
            </p>
            <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-500">
              ID: {(userProfile?.isOwner ? user?.uid : userProfile?.companyId) || "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { title: "Invoices", value: formatCount(counts.invoices), icon: <IconInvoice /> },
          { title: "Customers", value: formatCount(counts.customers), icon: <IconUsers /> },
          { title: "Products", value: formatCount(counts.products), icon: <IconCube /> },
        ].map((card) => (
          <div
            key={card.title}
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-700/50">
              {card.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
              <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {(canExportBackup || canImportBackup || canViewBackupHistory) && <DataBackupManager />}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">How your data is stored</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Records are top-level Firestore collections, filtered by your company so data stays isolated.
          </p>
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Collections</h3>
            <ul className="space-y-2">
              {collections.map((c) => (
                <li
                  key={c.name}
                  className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5 dark:border-gray-600 dark:bg-gray-900/40"
                >
                  <IconDatabase />
                  <div className="min-w-0">
                    <code className="text-sm font-semibold text-primary-700 dark:text-primary-300">{c.name}</code>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{c.hint}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-primary-100 bg-primary-50/60 p-4 dark:border-primary-900/40 dark:bg-primary-950/30">
              <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-200">Backup & restore</h3>
              <ul className="mt-2 space-y-2 text-sm text-primary-800/90 dark:text-primary-200/80">
                <li className="flex gap-2">
                  <span className="text-primary-600 dark:text-primary-400">•</span>
                  JSON export includes invoices, customers, products, bank accounts, expenses, and related metadata for your company.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-600 dark:text-primary-400">•</span>
                  Import merges with existing documents; use only trusted files from your own exports.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Your permissions</h3>
              <div className="flex flex-wrap gap-2">
                {canExportBackup && (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    Export
                  </span>
                )}
                {canImportBackup && (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    Import
                  </span>
                )}
                {canViewBackupHistory && (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    History
                  </span>
                )}
                {!canExportBackup && !canImportBackup && !canViewBackupHistory && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">No backup permissions assigned</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
        <div className="flex gap-3">
          <svg className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Schema migrations</p>
            <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/80">
              If you ever need to move from an older data layout, coordinate with your administrator. Routine backups reduce risk before any structural change.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagementPage;
