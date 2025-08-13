import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth as firebaseAuth, db } from "../../services/firebase";
import { TokenService } from "../../services/tokenService";
import Spinner from "../../components/Spinner";

const AutoLoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing login...");

  useEffect(() => {
    const processAutoLogin = async () => {
      try {
        const token = searchParams.get("token");
        
        if (!token) {
          setStatus("error");
          setMessage("Invalid login link - no token provided.");
          return;
        }

        setMessage("Verifying login token...");

        // Get the token data from Firebase
        const tokenDoc = await db.collection("oneTimeLoginTokens").doc(token).get();
        
        if (!tokenDoc.exists) {
          setStatus("error");
          setMessage("Invalid or expired login token.");
          return;
        }

        const tokenData = tokenDoc.data();
        
        if (!tokenData) {
          setStatus("error");
          setMessage("Invalid token data.");
          return;
        }

        // Check if token is already used
        if (tokenData.used) {
          setStatus("error");
          setMessage("This login link has already been used.");
          return;
        }

        // Check if token is expired (5 minutes)
        if (tokenData.expiresAt.toMillis() < Date.now()) {
          setStatus("error");
          setMessage("This login link has expired.");
          return;
        }

        setMessage("Authenticating user...");

        // Sign in the user with Firebase
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(
          tokenData.email,
          tokenData.password
        );

        if (userCredential.user) {
          setMessage("Creating user session...");

          // Create a new token for the user session
          await TokenService.createUserToken(userCredential.user);
          
          // Mark token as used
          await db.collection("oneTimeLoginTokens").doc(token).update({
            used: true,
            usedAt: new Date()
          });

          setStatus("success");
          setMessage("Login successful! Redirecting...");

          // Redirect to dashboard after a brief delay
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 1000);
        }

      } catch (error: any) {
        console.error("❌ AUTO-LOGIN ERROR:", error);
        setStatus("error");
        setMessage(`Login failed: ${error.message}`);
      }
    };

    processAutoLogin();
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
            Auto Login
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Automatically signing you in...
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

export default AutoLoginPage;
