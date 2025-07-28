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

  useEffect(() => {
    let userDocUnsubscribe: (() => void) | null = null;
    let companyUserUnsubscribe: (() => void) | null = null;
    let roleUnsubscribe: (() => void) | null = null;

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

      if (firebaseUser) {
        try {
          // Check if this is a fresh login (no token exists) or validate existing token
          const storedToken = localStorage.getItem("userToken");
          const storedUserId = localStorage.getItem("tokenUserId");

          if (storedToken && storedUserId) {
            // Existing session - validate token
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
              // Immediately stop loading on errors to prevent infinite spinner
              setUserProfile(null);
              setLoading(false);
            },
          );
        } catch (error) {
          console.error("Error setting up user listener:", error);
          setUserProfile(null);
          setLoading(false);
        }

        // Start monitoring for real-time user deactivation
        UserMonitoringService.startMonitoring(firebaseUser);

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
      // Clean up real-time permission listeners
      RealTimePermissionService.cleanup();
      // Clean up user monitoring service
      UserMonitoringService.cleanup();
      unsubscribe();
    };
  }, []);

  const logout = async () => {
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
