import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { auth, db } from "../services/firebase";
import { ActivityLogger } from "../services/activityLogger";
import { PermissionService } from "../services/permissionService";
import { RealTimePermissionService } from "../services/realTimePermissionService";
import { UserMonitoringService } from "../services/userMonitoringService";
import { TokenService } from "../services/tokenService";
import { isEmergencyOfflineMode, offlineServices, mockUserProfile } from "../services/offlineMode";
import type { UserProfile } from "../types";
import type firebase from "firebase/compat/app";

interface AuthContextType {
  user: firebase.User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  setUserProfile: (profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Create unique tab identifier to prevent admin tab from being affected by impersonation
  const [tabId] = useState(() => {
    let existingTabId = sessionStorage.getItem('tabId');
    if (!existingTabId) {
      existingTabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('tabId', existingTabId);
    }
    return existingTabId;
  });

  // Check for impersonation session immediately when component mounts
  useEffect(() => {
    const checkImpersonationOnMount = async () => {
      const impersonationData = localStorage.getItem("impersonationSession");
      const storedToken = localStorage.getItem("userToken");

      if (impersonationData && storedToken?.startsWith("impersonation_")) {

        try {
          const impersonation = JSON.parse(impersonationData);

          // Validate session age
          const sessionAge = Date.now() - impersonation.createdAt;
          const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

          if (sessionAge > maxSessionAge) {
            localStorage.removeItem("impersonationSession");
            localStorage.removeItem("userToken");
            localStorage.removeItem("tokenUserId");
            setLoading(false);
            return;
          }

          // Set target user profile immediately
          const targetProfile = impersonation.targetUserProfile as UserProfile;
          const granularPermissions = await PermissionService.loadUserPermissions(targetProfile);
          targetProfile.granularPermissions = granularPermissions;
          targetProfile.isImpersonating = true;
          targetProfile.originalAdmin = impersonation.originalAdmin;

          setUserProfile(targetProfile);
          setLoading(false);
          return;
        } catch (error) {
          console.error("❌ Mount impersonation failed:", error);
          localStorage.removeItem("impersonationSession");
          localStorage.removeItem("userToken");
          localStorage.removeItem("tokenUserId");
        }
      }
    };

    checkImpersonationOnMount();
  }, []);

  useEffect(() => {
    let userDocUnsubscribe: (() => void) | null = null;
    let companyUserUnsubscribe: (() => void) | null = null;
    let roleUnsubscribe: (() => void) | null = null;

    // Track if we've already processed the current impersonation session to prevent loops
    let currentImpersonationProcessed = false;

    // Listen for storage changes to detect impersonation immediately
    const handleStorageChange = (event?: StorageEvent) => {
      // Only process storage events from other tabs/windows, not our own changes
      if (event && event.storageArea === localStorage && event.key === 'impersonationSession') {
        const impersonationData = localStorage.getItem("impersonationSession");
        const storedToken = localStorage.getItem("userToken");

        if (impersonationData && storedToken?.startsWith("impersonation_")) {
          // New impersonation session detected
          // PROTECT ADMIN TAB: Don't process impersonation if this is marked as admin tab
          const isAdminTab = sessionStorage.getItem('isAdminTab') === 'true';
          const isOnImpersonationPage = window.location.hash.includes('/impersonate');

          // Only process impersonation in these cases:
          // 1. We're on the impersonation page (dedicated impersonation tab)
          // 2. We're NOT an admin tab and NOT currently impersonating
          if (isOnImpersonationPage || (!isAdminTab && !userProfile?.isImpersonating)) {
            const sessionData = JSON.parse(impersonationData);
            const sessionKey = `${sessionData.sessionToken}_${sessionData.createdAt}`;

            if (!currentImpersonationProcessed || sessionKey !== currentImpersonationProcessed) {
              currentImpersonationProcessed = sessionKey;

              // Force a re-check by calling the auth state change handler
              setTimeout(() => {
                handleImpersonationSession();
              }, 100);
            }
          }
        } else if (!impersonationData && !storedToken?.startsWith("impersonation_")) {
          // Impersonation session ended - refresh admin tab if we were tracking impersonation
          const wasImpersonating = currentImpersonationProcessed;
          if (wasImpersonating) {
            currentImpersonationProcessed = false;
            // Auto-refresh to restore admin session
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }
        }
      }
    };

    const handleImpersonationSession = async () => {
      const impersonationData = localStorage.getItem("impersonationSession");
      const storedToken = localStorage.getItem("userToken");

      if (impersonationData && storedToken?.startsWith("impersonation_")) {
        // PROTECT ADMIN TAB: Don't process impersonation if this is marked as admin tab
        const isAdminTab = sessionStorage.getItem('isAdminTab') === 'true';
        const isOnImpersonationPage = window.location.hash.includes('/impersonate');

        // Skip impersonation processing for protected admin tabs
        if (isAdminTab && !isOnImpersonationPage) {
          setLoading(false);
          return;
        }

        try {
          const impersonation = JSON.parse(impersonationData);

          // Mark current session as processed to prevent loops
          const sessionKey = `${impersonation.sessionToken}_${impersonation.createdAt}`;
          currentImpersonationProcessed = sessionKey;

          // Validate session age
          const sessionAge = Date.now() - impersonation.createdAt;
          const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

          if (sessionAge > maxSessionAge) {
            localStorage.removeItem("impersonationSession");
            localStorage.removeItem("userToken");
            localStorage.removeItem("tokenUserId");
            currentImpersonationProcessed = false;
            setUserProfile(null);
            return;
          }

          // Load target user profile
          const targetProfile = impersonation.targetUserProfile as UserProfile;
          const granularPermissions = await PermissionService.loadUserPermissions(targetProfile);
          targetProfile.granularPermissions = granularPermissions;
          targetProfile.isImpersonating = true;
          targetProfile.originalAdmin = impersonation.originalAdmin;

          setUserProfile(targetProfile);
          setLoading(false);
        } catch (error) {
          console.error("❌ Manual impersonation check failed:", error);
          currentImpersonationProcessed = false;
        }
      }
    };

    // Add storage event listener
    window.addEventListener('storage', handleStorageChange);

    // Check for impersonation redirect flag and force reload if needed
    const impersonationRedirect = sessionStorage.getItem('impersonationRedirect');
    if (impersonationRedirect) {
      sessionStorage.removeItem('impersonationRedirect');

      // Force one more reload to ensure auth state is completely fresh
      setTimeout(() => {
        window.location.reload();
      }, 100);
      return () => {}; // Return early cleanup
    }

    // Initial impersonation check is now handled by the mount effect above

    // Check if we're in emergency offline mode
    if (isEmergencyOfflineMode()) {
      setUser(offlineServices.auth.currentUser as any);
      setUserProfile(mockUserProfile as UserProfile);
      setLoading(false);
      return () => {}; // Return empty cleanup function
    }

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      // Clean up previous listeners
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
        userDocUnsubscribe = null;
      }
      if (companyUserUnsubscribe) {
        companyUserUnsubscribe();
        companyUserUnsubscribe = null;
      }
      if (roleUnsubscribe) {
        roleUnsubscribe();
        roleUnsubscribe = null;
      }

      const previousUser = user;
      setUser(firebaseUser);

      // FIRST check for impersonation session regardless of Firebase auth state
      const impersonationData = localStorage.getItem("impersonationSession");
      const storedToken = localStorage.getItem("userToken");


      if (impersonationData && storedToken?.startsWith("impersonation_")) {
        // PROTECT ADMIN TAB: Don't process impersonation if this is marked as admin tab
        const isAdminTab = sessionStorage.getItem('isAdminTab') === 'true';
        const isOnImpersonationPage = window.location.hash.includes('/impersonate');

        // Skip impersonation processing for protected admin tabs
        if (isAdminTab && !isOnImpersonationPage) {
          setLoading(false);
          return;
        }

        try {
          // Handle impersonation session
          const impersonation = JSON.parse(impersonationData);

          // Validate impersonation session is still valid (24 hours max)
          const sessionAge = Date.now() - impersonation.createdAt;
          const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

          if (sessionAge > maxSessionAge) {
            // Session expired, clean up
            localStorage.removeItem("impersonationSession");
            localStorage.removeItem("userToken");
            localStorage.removeItem("tokenUserId");
            setUserProfile(null);
            setLoading(false);
            return;
          }

          // Use the target user profile from impersonation data
          const targetProfile = impersonation.targetUserProfile as UserProfile;

          // Load fresh permissions for the target user
          const granularPermissions = await PermissionService.loadUserPermissions(targetProfile);
          targetProfile.granularPermissions = granularPermissions;

          // Add impersonation flag to the profile
          targetProfile.isImpersonating = true;
          targetProfile.originalAdmin = impersonation.originalAdmin;

          // Mark current session as processed to prevent loops
          const sessionKey = `${impersonation.sessionToken}_${impersonation.createdAt}`;
          currentImpersonationProcessed = sessionKey;

          setUserProfile(targetProfile);
          setLoading(false);
          return;
        } catch (error) {
          console.error("❌ IMPERSONATION - Error processing session:", error);
          // Clean up on error
          localStorage.removeItem("impersonationSession");
          localStorage.removeItem("userToken");
          localStorage.removeItem("tokenUserId");
          currentImpersonationProcessed = false;
          setUserProfile(null);
          setLoading(false);
          return;
        }
      }

      if (firebaseUser) {
        try {
          const storedUserId = localStorage.getItem("tokenUserId");

          if (storedToken && storedUserId && !storedToken.startsWith("impersonation_")) {
            // Regular session - validate token
            const isValidToken = await TokenService.validateToken(firebaseUser);
            if (!isValidToken) {
              await auth.signOut();
              setUserProfile(null);
              setLoading(false);
              return;
            }
          } else {
            // Fresh login - FIRST check if user is allowed to login

            // Check by EMAIL in companyUsers first (more reliable)
            const companyUserQuery = await db
              .collection("companyUsers")
              .where("email", "==", firebaseUser.email)
              .get();

            if (!companyUserQuery.empty) {
              const companyUserData = companyUserQuery.docs[0].data();
              if (companyUserData.isActive === false) {
                await auth.signOut();
                setUserProfile(null);
                setLoading(false);
                return;
              }
            }

            // Also check users collection for deactivation
            const usersByEmailQuery = await db
              .collection("users")
              .where("email", "==", firebaseUser.email)
              .get();

            if (!usersByEmailQuery.empty) {
              const userData = usersByEmailQuery.docs[0].data();
              const isOwner = userData?.isOwner === true;

              if (!isOwner && userData?.isDeactivated === true) {
                await auth.signOut();
                setUserProfile(null);
                setLoading(false);
                return;
              }
            }

            // Only create token if user is allowed to login
            try {
              await TokenService.createUserToken(firebaseUser);
            } catch (error) {
              // Silent token creation error
            }
          }

          const userDocRef = db.collection("users").doc(firebaseUser.uid);
          userDocUnsubscribe = userDocRef.onSnapshot(
            async (doc) => {
              if (doc.exists) {
                const userData = doc.data() as UserProfile;

                // Check if user is deactivated (for both isActive false and isDeactivated true)
                if (userData.isActive === false || userData.isDeactivated === true) {
                  await TokenService.revokeCurrentToken(firebaseUser);
                  await auth.signOut();
                  setUserProfile(null);
                  setLoading(false);
                  return;
                }

                // Check if this user is a company owner (original account)
                if (!userData.companyId && !userData.role) {
                  userData.isOwner = true;
                  userData.companyId = firebaseUser.uid;
                }

                // Load granular permissions from role if needed
                const granularPermissions = await PermissionService.loadUserPermissions(userData);
                if (granularPermissions.length > 0 &&
                    JSON.stringify(userData.granularPermissions || []) !== JSON.stringify(granularPermissions)) {
                  userData.granularPermissions = granularPermissions;
                  // Update the database with loaded permissions
                  await PermissionService.syncUserPermissions(userData.uid, granularPermissions);
                }

                setUserProfile(userData);

                // Log login activity only on actual login (not on refresh)
                // Use a more specific session key with timestamp
                const loginKey = `loginLogged_${firebaseUser.uid}`;
                const lastLoginTime = sessionStorage.getItem(loginKey);
                const currentTime = Date.now();
                const fiveMinutesAgo = currentTime - 5 * 60 * 1000;

                if (
                  !previousUser &&
                  firebaseUser &&
                  (!lastLoginTime ||
                    parseInt(lastLoginTime) < fiveMinutesAgo)
                ) {
                  sessionStorage.setItem(loginKey, currentTime.toString());
                  ActivityLogger.logActivity(
                    firebaseUser,
                    userData,
                    "login",
                    `${userData.displayName || userData.companyName || firebaseUser.email} logged in`,
                  );
                }
              } else {
                // If no document found with Firebase UID, try to find by email
                // This handles users created through admin panel
                if (firebaseUser.email) {
                  const userByEmailQuery = await db
                    .collection("users")
                    .where("email", "==", firebaseUser.email)
                    .get();

                  if (!userByEmailQuery.empty) {
                    const userDoc = userByEmailQuery.docs[0];
                    const userData = userDoc.data() as UserProfile;

                    // Check if user is deactivated
                    if (userData.isActive === false) {
                      await auth.signOut();
                      setUserProfile(null);
                      setLoading(false);
                      return;
                    }

                    // Load granular permissions from role if needed
                    const granularPermissions = await PermissionService.loadUserPermissions(userData);
                    if (granularPermissions.length > 0 &&
                        JSON.stringify(userData.granularPermissions || []) !== JSON.stringify(granularPermissions)) {
                      userData.granularPermissions = granularPermissions;
                      // Update the database with loaded permissions
                      await PermissionService.syncUserPermissions(userData.uid, granularPermissions);
                    }

                    setUserProfile(userData);

                    // Log login activity only on actual login (not on refresh)
                    // Use a more specific session key with timestamp
                    const loginKey = `loginLogged_${firebaseUser.uid}`;
                    const lastLoginTime = sessionStorage.getItem(loginKey);
                    const currentTime = Date.now();
                    const fiveMinutesAgo = currentTime - 5 * 60 * 1000;

                    if (
                      !previousUser &&
                      firebaseUser &&
                      (!lastLoginTime ||
                        parseInt(lastLoginTime) < fiveMinutesAgo)
                    ) {
                      sessionStorage.setItem(loginKey, currentTime.toString());
                      ActivityLogger.logActivity(
                        firebaseUser,
                        userData,
                        "login",
                        `${userData.displayName || userData.companyName || firebaseUser.email} logged in`,
                      );
                    }
                  } else {
                    setUserProfile(null);
                  }
                } else {
                  setUserProfile(null);
                }
              }
              setLoading(false);
            },
            (error) => {
              console.error("Error fetching user profile:", error);

              // Handle specific permission errors
              if (error.code === 'permission-denied') {
                console.warn("Permission denied for user profile. User may need to re-authenticate.");
                // Sign out the user if permission is denied
                auth.signOut().catch(signOutError =>
                  console.error("Error signing out after permission denial:", signOutError)
                );
              }

              // Immediately stop loading on errors to prevent infinite spinner
              setUserProfile(null);
              setLoading(false);
            },
          );
        } catch (error) {
          console.error("Error setting up user listener:", error);

          // If it's a permission error, try to handle gracefully
          if (error.code === 'permission-denied') {
            console.warn("Permission denied for user document. User may need to re-authenticate.");
            // Try to sign out and redirect to login
            try {
              await auth.signOut();
            } catch (signOutError) {
              console.error("Error signing out:", signOutError);
            }
          }

          setUserProfile(null);
          setLoading(false);
        }

        // Start monitoring for real-time user deactivation (but not for impersonation sessions)
        const isImpersonating = localStorage.getItem("impersonationSession");
        if (!isImpersonating) {
          UserMonitoringService.startMonitoring(firebaseUser);
        }

        // Force loading to stop after 1 second to prevent infinite spinner
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      } else {
        // Log logout activity if we had a user before
        if (previousUser && userProfile) {
          ActivityLogger.logActivity(
            previousUser,
            userProfile,
            "logout",
            `${userProfile.displayName || userProfile.companyName || previousUser.email} logged out`,
          );
        }
        // Clear login session tracking
        if (previousUser) {
          sessionStorage.removeItem(`loginLogged_${previousUser.uid}`);
        }
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Cleanup function
    return () => {
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
      // Remove storage event listener
      window.removeEventListener('storage', handleStorageChange);
      // Clean up real-time permission listeners
      RealTimePermissionService.cleanup();
      // Clean up user monitoring service
      UserMonitoringService.cleanup();
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    // Check if this is an impersonation session
    const impersonationData = localStorage.getItem("impersonationSession");

    if (impersonationData) {
      // For impersonation sessions, clean up the session data
      localStorage.removeItem("impersonationSession");
      localStorage.removeItem("userToken");
      localStorage.removeItem("tokenUserId");

      // Trigger storage event to notify admin tab to refresh
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'impersonationSession',
        oldValue: impersonationData,
        newValue: null,
        storageArea: localStorage
      }));

      // Close the tab since this was an impersonation session
      window.close();
      return;
    }

    // Regular logout for normal sessions
    // Log logout activity before signing out
    if (user && userProfile) {
      try {
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "logout",
          `${userProfile.companyName || user.email} logged out`,
        );
      } catch (error) {
        console.error("Failed to log logout activity:", error);
      }
    }

    // Revoke current token before signing out
    if (user) {
      try {
        await TokenService.revokeCurrentToken(user);
      } catch (error) {
        console.error("Failed to revoke token:", error);
      }
      sessionStorage.removeItem(`loginLogged_${user.uid}`);
    }

    await auth.signOut();
  };

  const value = { user, userProfile, loading, logout, setUserProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
