import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { TokenService } from "../../services/tokenService";
import { usePageTitle } from "../../hooks/usePageTitle";

const LoginPage: React.FC = () => {
  usePageTitle("Login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetCooldownSeconds, setResetCooldownSeconds] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const navigate = useNavigate();

  const trimmedEmail = useMemo(() => email.trim(), [email]);

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case "auth/user-not-found":
        return "No account found with this email address.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-disabled":
        return "This account has been deactivated. Contact your administrator.";
      case "auth/too-many-requests":
        return "Too many login attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection.";
      default:
        return "Login failed. Please check your email and password.";
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);

      // Wait a moment to let useAuth validation run
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if user is still signed in (wasn't blocked by useAuth)
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError("You cannot log in due to a system restriction. Please contact the administrator.");
        return;
      }

      navigate("/");
    } catch (err: any) {
      const errorMessage = getErrorMessage(err.code);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const targetEmail = trimmedEmail;
    setError("");
    setResetMessage("");

    if (!targetEmail) {
      setError("Please enter your email first, then click Forgot password.");
      return;
    }

    setResetLoading(true);
    try {
      await auth.sendPasswordResetEmail(targetEmail);
      setResetMessage(
        "If an account exists for this email, a password reset link has been sent.",
      );
      setResetCooldownSeconds(30);
    } catch (err: any) {
      switch (err?.code) {
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/too-many-requests":
          setError("Too many reset requests. Please try again later.");
          break;
        case "auth/network-request-failed":
          setError("Network error. Please check your connection.");
          break;
        default:
          setError("Could not send reset email. Please try again.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const switchToResetMode = () => {
    setIsResetMode(true);
    setError("");
    setResetMessage("");
  };

  const switchToLoginMode = () => {
    setIsResetMode(false);
    setError("");
    setResetMessage("");
  };

  useEffect(() => {
    if (resetCooldownSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setResetCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resetCooldownSeconds]);

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
      <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
        {isResetMode ? "Reset your password" : "Log in to your account"}
      </h1>
      <form
        className="space-y-6"
        onSubmit={(e) => {
          if (isResetMode) {
            e.preventDefault();
            void handleForgotPassword();
            return;
          }
          void handleLogin(e);
        }}
      >
        {error && (
          <p className="p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
            {error}
          </p>
        )}
        {resetMessage && (
          <p className="p-3 text-sm text-emerald-700 bg-emerald-100 rounded-lg dark:bg-emerald-200 dark:text-emerald-800">
            {resetMessage}
          </p>
        )}
        <div>
          <label
            htmlFor="email"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Your email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            placeholder="name@company.com"
            required
          />
          {isResetMode ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter your work email to receive a password reset link.
            </p>
          ) : null}
        </div>
        {!isResetMode ? (
          <div>
            <label
              htmlFor="password"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
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
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3-3l6.364 6.364M21 21l-3-3M15 15l-3-3"
                    />
                  </svg>
                ) : (
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={switchToResetMode}
                className="text-xs font-medium text-primary-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="submit"
              disabled={resetLoading || resetCooldownSeconds > 0 || !trimmedEmail}
              className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:opacity-50"
            >
              {resetLoading
                ? "Sending reset link..."
                : resetCooldownSeconds > 0
                  ? `Resend in ${resetCooldownSeconds}s`
                  : "Send reset link"}
            </button>
            <button
              type="button"
              onClick={switchToLoginMode}
              className="w-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:underline"
            >
              Back to login
            </button>
          </div>
        )}
        {!isResetMode ? (
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        ) : null}
      </form>
    </div>
  );
};

export default LoginPage;
