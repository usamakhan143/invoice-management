import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  hashScreenPin,
  isValidFourDigitPin,
  verifyScreenPin,
} from "../../utils/screenPin";
import { usePageTitle } from "../../hooks/usePageTitle";
import { auth, db } from "../../services/firebase";
import { ActivityLogger } from "../../services/activityLogger";
import { TokenService, type UserToken } from "../../services/tokenService";
import Spinner from "../../components/Spinner";
import firebase from "firebase/compat/app";

const ProfilePage: React.FC = () => {
  usePageTitle("Profile");
  const { user, userProfile, setUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Profile form state
  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || "",
  );

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessions, setSessions] = useState<UserToken[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const [screenPinCurrent, setScreenPinCurrent] = useState("");
  const [screenPinNew, setScreenPinNew] = useState("");
  const [screenPinConfirm, setScreenPinConfirm] = useState("");
  const [pinSaving, setPinSaving] = useState(false);

  const resolveProfileUserDocId = async (): Promise<string | null> => {
    if (!user) return null;
    let userDocId = user.uid;
    const userDocRef = db.collection("users").doc(user.uid);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists && user.email) {
      const userByEmailQuery = await db
        .collection("users")
        .where("email", "==", user.email)
        .get();
      if (!userByEmailQuery.empty) {
        userDocId = userByEmailQuery.docs[0].id;
      }
    }
    return userDocId;
  };

  const handleScreenPinSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    if (!isValidFourDigitPin(screenPinNew)) {
      setError("New PIN must be exactly 4 digits.");
      setSuccess("");
      return;
    }
    if (screenPinNew !== screenPinConfirm) {
      setError("New PIN and confirmation do not match.");
      setSuccess("");
      return;
    }

    const existingHash = userProfile.screenPinHash;
    if (existingHash) {
      if (!isValidFourDigitPin(screenPinCurrent)) {
        setError("Enter your current 4-digit PIN to change it.");
        setSuccess("");
        return;
      }
      const currentOk = await verifyScreenPin(
        user.uid,
        screenPinCurrent,
        existingHash,
      );
      if (!currentOk) {
        setError("Current PIN is incorrect.");
        setSuccess("");
        return;
      }
    }

    setPinSaving(true);
    setError("");
    setSuccess("");

    try {
      const userDocId = await resolveProfileUserDocId();
      if (!userDocId) {
        setError("Could not find your user record.");
        return;
      }

      const nextHash = await hashScreenPin(user.uid, screenPinNew);
      await db.collection("users").doc(userDocId).update({
        screenPinHash: nextHash,
        updatedAt: new Date(),
      });

      setUserProfile({ ...userProfile, screenPinHash: nextHash });

      await ActivityLogger.logActivity(
        user,
        { ...userProfile, screenPinHash: nextHash },
        "user_updated",
        existingHash ? "Screen / revenue PIN changed" : "Screen / revenue PIN set",
        {
          entityId: user.uid,
          entityType: "security",
          newValue: { screenPinUpdated: true },
        },
      );

      setSuccess(
        existingHash
          ? "PIN updated. Use it to unlock the screen and view revenue."
          : "PIN saved. You can lock the screen from the sidebar and protect revenue on the dashboard.",
      );
      setScreenPinCurrent("");
      setScreenPinNew("");
      setScreenPinConfirm("");
    } catch (err) {
      console.error(err);
      setError("Could not save PIN. Please try again.");
    } finally {
      setPinSaving(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Find and update the correct user document
      let userDocId = user.uid;

      // Check if document exists at user.uid
      const userDocRef = db.collection("users").doc(user.uid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists && user.email) {
        // If no document at user.uid, find by email (for admin-created users)
        const userByEmailQuery = await db
          .collection("users")
          .where("email", "==", user.email)
          .get();

        if (!userByEmailQuery.empty) {
          userDocId = userByEmailQuery.docs[0].id;
        }
      }

      // Update the correct user document
      await db.collection("users").doc(userDocId).update({
        displayName: displayName,
        updatedAt: new Date(),
      });

      // Log profile update activity
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "user_updated",
        `Updated profile: ${displayName}`,
        {
          entityId: user.uid,
          entityType: "profile",
          newValue: { displayName },
        },
      );

      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      setError("Failed to update profile. Please try again.");
      console.error("Profile update error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Re-authenticate user with current password
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email!,
        currentPassword,
      );
      await user.reauthenticateWithCredential(credential);

      // Update password
      await user.updatePassword(newPassword);

      // Log password change activity
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "user_updated",
        "Password changed",
        {
          entityId: user.uid,
          entityType: "profile",
          newValue: { passwordChanged: true },
        },
      );

      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      if (err.code === "auth/wrong-password") {
        setError("Current password is incorrect.");
      } else if (err.code === "auth/weak-password") {
        setError("New password is too weak.");
      } else {
        setError("Failed to change password. Please try again.");
      }
      console.error("Password change error:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentToken = useMemo(() => localStorage.getItem("userToken"), []);
  const timezoneLabel = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown timezone",
    [],
  );

  const loadSessions = async () => {
    if (!user) return;
    setSessionsLoading(true);
    try {
      const rows = await TokenService.getUserActiveSessions(user.uid);
      setSessions(rows);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, [user?.uid]);

  const isCurrentSession = (row: UserToken): boolean => {
    return !!currentToken && row.token === currentToken;
  };

  const formatTs = (ts: any): string => {
    try {
      return ts?.toDate?.().toLocaleString?.() || "—";
    } catch {
      return "—";
    }
  };

  const formatRelativeTime = (ts: any): string => {
    const d = ts?.toDate?.();
    if (!d) return "unknown";
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 60_000) return "just now";
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getLocationHint = (row: UserToken, isCurrent: boolean): string => {
    if (row.ipAddress && row.ipAddress.trim()) return row.ipAddress.trim();
    if (isCurrent) return timezoneLabel;
    return "Location unavailable";
  };

  const handleRevokeSingleSession = async (session: UserToken) => {
    if (!session.id || !user || !userProfile) return;
    if (isCurrentSession(session)) return;
    setRevokingSessionId(session.id);
    setError("");
    setSuccess("");
    try {
      await TokenService.revokeTokenById(session.id);
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "user_updated",
        `Revoked one active session from profile`,
        {
          entityId: user.uid,
          entityType: "security",
          newValue: { revokeSessionId: session.id },
        },
      );
      setSuccess("Session revoked.");
      await loadSessions();
    } catch (err) {
      console.error(err);
      setError("Could not revoke this session.");
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!user || !userProfile) return;
    setRevokingOthers(true);
    setError("");
    setSuccess("");
    try {
      const removed = await TokenService.revokeAllUserTokensExceptCurrent(user);
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "user_updated",
        `Revoked other sessions from profile (${removed})`,
        {
          entityId: user.uid,
          entityType: "security",
          newValue: { revokedOtherSessions: removed },
        },
      );
      setSuccess(
        removed > 0
          ? `${removed} other session${removed === 1 ? "" : "s"} revoked.`
          : "No other sessions found.",
      );
      await loadSessions();
    } catch (err) {
      console.error(err);
      setError("Could not revoke other sessions.");
    } finally {
      setRevokingOthers(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
        Profile Settings
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Profile Information
          </h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                type="email"
                value={userProfile.email}
                disabled
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-600 dark:border-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Email cannot be changed
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Company
              </label>
              <input
                type="text"
                value={userProfile.companyName}
                disabled
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-600 dark:border-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Profile"}
            </button>
          </form>
        </div>

        {/* Password Change */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Change Password
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 block w-full p-2 pr-10 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? (
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
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full p-2 pr-10 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? (
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
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full p-2 pr-10 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
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
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Changing..." : "Change Password"}
            </button>
          </form>
        </div>

        {/* Screen / revenue PIN */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Screen &amp; revenue PIN
          </h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            4-digit code to lock the app without logging out and to reveal
            blurred revenue on the dashboard. Stored securely as a hash.
          </p>
          <form onSubmit={handleScreenPinSave} className="space-y-4 max-w-md">
            {userProfile.screenPinHash ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={screenPinCurrent}
                  onChange={(e) =>
                    setScreenPinCurrent(
                      e.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white tracking-widest"
                  placeholder="••••"
                />
              </div>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {userProfile.screenPinHash ? "New PIN" : "PIN (4 digits)"}
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                value={screenPinNew}
                onChange={(e) =>
                  setScreenPinNew(
                    e.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white tracking-widest"
                placeholder="••••"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                value={screenPinConfirm}
                onChange={(e) =>
                  setScreenPinConfirm(
                    e.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white tracking-widest"
                placeholder="••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={pinSaving || loading}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pinSaving
                ? "Saving…"
                : userProfile.screenPinHash
                  ? "Update PIN"
                  : "Save PIN"}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Active Sessions
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Manage devices where your account is signed in.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadSessions()}
              disabled={sessionsLoading}
              className="px-3 py-2 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {sessionsLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => void handleRevokeOtherSessions()}
              disabled={revokingOthers}
              className="px-3 py-2 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {revokingOthers ? "Revoking..." : "Logout Other Devices"}
            </button>
          </div>
        </div>

        {sessionsLoading ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">No active sessions found.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const current = isCurrentSession(s);
              return (
                <div
                  key={s.id || `${s.userId}-${s.token}`}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {s.deviceInfo || "Unknown Device"}
                      </p>
                      {current ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                          Current session
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {s.userAgent || "Unknown browser"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Location: {getLocationHint(s, current)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Last active: {formatRelativeTime(s.lastActiveAt)} ({formatTs(s.lastActiveAt)}) • Created: {formatTs(s.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRevokeSingleSession(s)}
                    disabled={current || revokingSessionId === s.id}
                    className="px-3 py-1.5 text-xs rounded-md border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
                  >
                    {revokingSessionId === s.id ? "Revoking..." : "Revoke"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
