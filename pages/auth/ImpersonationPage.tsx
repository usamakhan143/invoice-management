import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { db } from "../../services/firebase";
import { TokenService } from "../../services/tokenService";
import Spinner from "../../components/Spinner";

const ImpersonationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing impersonation...");


  useEffect(() => {
    const processImpersonation = async () => {
      try {
        const sessionToken = searchParams.get("session");

        if (!sessionToken) {
          setStatus("error");
          setMessage("Invalid impersonation link - no session token provided.");
          return;
        }

        setMessage("Verifying impersonation session...");

        // Test mode - if session token is "test", create mock data for testing
        if (sessionToken === "test") {
          const mockSessionData = {
            targetUserId: "test_user_123",
            targetUserEmail: "test@example.com",
            targetUserProfile: {
              uid: "test_user_123",
              email: "test@example.com",
              displayName: "Test User",
              role: "user",
              companyId: "test_company",
              isActive: true,
              isOwner: false,
              tempPassword: "testpass123"
            },
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
            used: false,
            createdBy: "admin_123",
            adminEmail: "admin@example.com"
          };


          // Create impersonation data
          const impersonationData = {
            isImpersonating: true,
            originalAdmin: mockSessionData.adminEmail,
            targetUserProfile: mockSessionData.targetUserProfile,
            sessionToken: sessionToken,
            createdAt: Date.now()
          };


          // Store impersonation data in localStorage
        localStorage.setItem("impersonationSession", JSON.stringify(impersonationData));
        localStorage.setItem("userToken", `impersonation_${sessionToken}`);
        localStorage.setItem("tokenUserId", mockSessionData.targetUserId);

        // Trigger storage event for immediate auth state change
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'impersonationSession',
          newValue: JSON.stringify(impersonationData),
          storageArea: localStorage
        }));

        setStatus("success");
        setMessage("Test impersonation successful! Redirecting...");

        // Navigate to dashboard for test mode
        setTimeout(() => {
          window.location.replace(`${window.location.origin}${window.location.pathname}#/`);
        }, 100);

          return;
        }

        // Get the session data from Firebase for real sessions
        const sessionDoc = await db.collection("impersonationSessions").doc(sessionToken).get();
        
        if (!sessionDoc.exists) {
          setStatus("error");
          setMessage("Invalid or expired impersonation session.");
          return;
        }

        const sessionData = sessionDoc.data();
        
        if (!sessionData) {
          setStatus("error");
          setMessage("Invalid session data.");
          return;
        }

        // Check if session is already used
        if (sessionData.used) {
          setStatus("error");
          setMessage("This impersonation session has already been used.");
          return;
        }

        // Check if session is expired (10 minutes)
        if (sessionData.expiresAt.toMillis() < Date.now()) {
          setStatus("error");
          setMessage("This impersonation session has expired.");
          return;
        }

        setMessage("Setting up user session...");

        // Create a special impersonation token in localStorage
        const impersonationData = {
          isImpersonating: true,
          originalAdmin: sessionData.adminEmail,
          targetUserProfile: sessionData.targetUserProfile,
          sessionToken: sessionToken,
          createdAt: Date.now()
        };


        // Store impersonation data in localStorage
        localStorage.setItem("impersonationSession", JSON.stringify(impersonationData));
        localStorage.setItem("userToken", `impersonation_${sessionToken}`);
        localStorage.setItem("tokenUserId", sessionData.targetUserId);

        // Trigger storage event for immediate auth state change
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'impersonationSession',
          newValue: JSON.stringify(impersonationData),
          storageArea: localStorage
        }));

        // Mark session as used
        await db.collection("impersonationSessions").doc(sessionToken).update({
          used: true,
          usedAt: new Date()
        });

        setStatus("success");
        setMessage("Impersonation successful! Redirecting...");

        // Navigate to dashboard immediately
        setTimeout(() => {
          window.location.replace(`${window.location.origin}${window.location.pathname}#/`);
        }, 100);

      } catch (error: any) {
        setStatus("error");
        setMessage(`Impersonation failed: ${error.message}`);
      }
    };

    processImpersonation();
  }, [searchParams, navigate]);

  const handleRetry = () => {
    window.location.reload();
  };

  const goToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            User Impersonation
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Setting up impersonation session...
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="text-center">
            {status === "loading" && (
              <div className="space-y-4">
                <Spinner />
                <p className="text-gray-600 dark:text-gray-400">{message}</p>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto">
                  <svg
                    className="w-8 h-8 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-green-600 dark:text-green-400 font-medium">
                  {message}
                </p>
                <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md p-3">
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    🎭 You are now impersonating another user. All actions will be performed as that user.
                  </p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center mx-auto">
                  <svg
                    className="w-8 h-8 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <p className="text-red-600 dark:text-red-400 font-medium">
                  {message}
                </p>
                <div className="flex space-x-3 justify-center">
                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Retry
                  </button>
                  <button
                    onClick={goToLogin}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpersonationPage;
