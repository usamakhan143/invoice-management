import React, { Suspense, lazy, useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { usePageTitle } from "./hooks/usePageTitle";
import Spinner from "./components/Spinner";
import NetworkStatus from "./components/NetworkStatus";
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";

// Lazy load pages for better performance
const DashboardPage = lazy(() => import("./pages/app/DashboardPage"));
const InvoicesListPage = lazy(() => import("./pages/app/InvoicesListPage"));
const InvoiceFormPage = lazy(() => import("./pages/app/InvoiceFormPage"));
const CustomersPage = lazy(() => import("./pages/app/CustomersPage"));
const ProductsPage = lazy(() => import("./pages/app/ProductsPage"));
const BankAccountsPage = lazy(() => import("./pages/app/BankAccountsPage"));
const ExpensesPage = lazy(() => import("./pages/app/ExpensesPage"));
const UserManagementPage = lazy(() => import("./pages/app/UserManagementPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const SignUpPage = lazy(() => import("./pages/auth/SignUpPage"));

const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const [showTimeout, setShowTimeout] = React.useState(false);

  // Show timeout message after 10 seconds of loading
  React.useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowTimeout(true);
      }, 10000);
      return () => clearTimeout(timer);
    } else {
      setShowTimeout(false);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Spinner />
          {showTimeout && (
            <div className="mt-4">
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Taking longer than usual...
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  return user ? <Outlet /> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  usePageTitle();

  return (
    <>
      <NetworkStatus />
      <HashRouter>
        <Suspense
          fallback={
            <div className="flex h-screen items-center justify-center">
              <Spinner />
            </div>
          }
        >
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/invoices" element={<InvoicesListPage />} />
                <Route path="/invoices/new" element={<InvoiceFormPage />} />
                <Route
                  path="/invoices/edit/:id"
                  element={<InvoiceFormPage />}
                />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/bank-accounts" element={<BankAccountsPage />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/users" element={<UserManagementPage />} />
              </Route>
            </Route>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </>
  );
};

export default App;
