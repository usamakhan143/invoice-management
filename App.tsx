import React, { Suspense, lazy, useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { usePageTitle } from "./hooks/usePageTitle";
import { enableOfflineSupport, connectToFirebase, checkNetworkConnectivity } from "./services/firebase";
import { isEmergencyOfflineMode, enableEmergencyOfflineMode } from "./services/offlineMode";

import Spinner from "./components/Spinner";
import NetworkStatus from "./components/NetworkStatus";
import ConnectionStatus from "./components/ConnectionStatus";
import OfflineModeIndicator from "./components/OfflineModeIndicator";
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";

// Lazy load pages for better performance
const DashboardPage = lazy(() => import("./pages/app/DashboardPage"));
const InvoicesListPage = lazy(() => import("./pages/app/InvoicesListPage"));
const InvoiceFormPage = lazy(() => import("./pages/app/InvoiceFormPage"));
const CustomersPage = lazy(() => import("./pages/app/CustomersPage"));
const CustomerDetailPage = lazy(() => import("./pages/app/CustomerDetailPage"));
const LeadsPage = lazy(() => import("./pages/app/LeadsPage"));
const LeadImportPage = lazy(() => import("./pages/app/LeadImportPage"));
const CampaignsPage = lazy(() => import("./pages/app/CampaignsPage"));
const LeadDetailPage = lazy(() => import("./pages/app/LeadDetailPage"));
const MyAssignedLeadsPage = lazy(() => import("./pages/app/MyAssignedLeadsPage"));
const AssignedLeadsHubPage = lazy(() => import("./pages/app/AssignedLeadsHubPage"));
const PerformancePage = lazy(() => import("./pages/app/PerformancePage"));
const ProductsPage = lazy(() => import("./pages/app/ProductsPage"));
const BankAccountsPage = lazy(() => import("./pages/app/BankAccountsPage"));
const ExpensesPage = lazy(() => import("./pages/app/ExpensesPage"));
const UserManagementPage = lazy(() => import("./pages/app/UserManagementPage"));
const ActivityPage = lazy(() => import("./pages/app/ActivityPage"));
const CompanyActivityPage = lazy(
  () => import("./pages/app/CompanyActivityPage"),
);
const ProfilePage = lazy(() => import("./pages/app/ProfilePage"));
const DataManagementPage = lazy(() => import("./pages/app/DataManagementPage"));
const SuperAdminDashboard = lazy(() => import("./pages/admin/SuperAdminDashboard"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const SignUpPage = lazy(() => import("./pages/auth/SignUpPage"));
const AutoLoginPage = lazy(() => import("./pages/auth/AutoLoginPage"));
const ImpersonationPage = lazy(() => import("./pages/auth/ImpersonationPage"));


const ProtectedRoute: React.FC = () => {
  const { user, userProfile, loading } = useAuth();
  const [showTimeout, setShowTimeout] = React.useState(false);

  // Show timeout message after 5 seconds, force load after 8 seconds
  React.useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowTimeout(true);
      }, 5000);
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

  // Allow access if either Firebase user exists OR there's an impersonation session
  const isAuthenticated = user || (userProfile?.isImpersonating === true);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  usePageTitle();
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        // Check if we're already in emergency offline mode
        if (isEmergencyOfflineMode()) {
          setFirebaseError('Running in emergency offline mode');
          setFirebaseReady(true);
          return;
        }

        // Check network connectivity first
        const hasNetwork = await checkNetworkConnectivity();
        if (!hasNetwork) {
          setFirebaseError('No network connection detected');
          // Don't auto-enable emergency mode yet - let's see the real error
        }

        // Enable offline support first
        await enableOfflineSupport();

        // Try to connect to Firebase with retries - SHOW REAL ERRORS
        const isConnected = await connectToFirebase();

        if (!isConnected) {
          // Check if it's a permission error by looking at recent console messages
          setTimeout(() => {
            // If error contains permission-denied, show rules helper
            setFirebaseError('Firebase permission error - update Firestore rules');
          }, 1000);
        } else {
          setFirebaseError(null); // Clear any previous errors
        }

        setFirebaseReady(true);
      } catch (error) {
        setFirebaseError(`Firebase initialization failed: ${error}`);
        setFirebaseReady(true);
        // Don't auto-enable emergency mode - let's see the real issue
      }
    };

    initializeFirebase();
  }, []);

  if (!firebaseReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <OfflineModeIndicator />
      <NetworkStatus />
      <ConnectionStatus />
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
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/leads/import" element={<LeadImportPage />} />
                <Route path="/leads/assigned" element={<AssignedLeadsHubPage />} />
                <Route path="/leads/my-assigned" element={<MyAssignedLeadsPage />} />
                <Route path="/performance" element={<PerformancePage />} />
                <Route path="/leads/:id" element={<LeadDetailPage />} />
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/bank-accounts" element={<BankAccountsPage />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/users" element={<UserManagementPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route
                  path="/company-activity"
                  element={<CompanyActivityPage />}
                />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/data-management" element={<DataManagementPage />} />
                <Route path="/super-admin" element={<SuperAdminDashboard />} />
              </Route>
            </Route>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/auto-login" element={<AutoLoginPage />} />
            </Route>
            {/* Impersonate route needs to be outside auth layout */}
            <Route path="/impersonate" element={<ImpersonationPage />} />

          </Routes>
        </Suspense>
      </HashRouter>
    </>
  );
};

export default App;
