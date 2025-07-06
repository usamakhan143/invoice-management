import React, { Suspense, lazy } from "react";
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Spinner from "./components/Spinner";
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";

// Lazy load pages for better performance
const DashboardPage = lazy(() => import("./pages/app/DashboardPage"));
const InvoicesListPage = lazy(() => import("./pages/app/InvoicesListPage"));
const InvoiceFormPage = lazy(() => import("./pages/app/InvoiceFormPage"));
const CustomersPage = lazy(() => import("./pages/app/CustomersPage"));
const ProductsPage = lazy(() => import("./pages/app/ProductsPage"));
const BankAccountsPage = lazy(() => import("./pages/app/BankAccountsPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const SignUpPage = lazy(() => import("./pages/auth/SignUpPage"));

const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  return user ? <Outlet /> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
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
              <Route path="/invoices/edit/:id" element={<InvoiceFormPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/bank-accounts" element={<BankAccountsPage />} />
            </Route>
          </Route>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
};

export default App;
