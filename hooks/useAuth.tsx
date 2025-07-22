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
          const userDocRef = db.collection("users").doc(firebaseUser.uid);
          userDocUnsubscribe = userDocRef.onSnapshot(
            async (doc) => {
              if (doc.exists) {
                const userData = doc.data() as UserProfile;

                // Check if user is deactivated
                if (userData.isActive === false) {
                  console.log("User is deactivated, logging out...");
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
                      console.log("User is deactivated, logging out...");
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

        // Force loading to stop after 1 second to prevent infinite spinner
        setTimeout(() => {
          console.warn("Auth loading timeout - forcing completion");
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
    // Clear login session tracking
    if (user) {
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
