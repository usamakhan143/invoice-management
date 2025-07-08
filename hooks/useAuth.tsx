import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { auth, db } from "../services/firebase";
import type { UserProfile } from "../types";
import type firebase from "firebase/compat/app";

interface AuthContextType {
  user: firebase.User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
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

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      // Clean up previous user document listener
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
        userDocUnsubscribe = null;
      }

      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const userDocRef = db.collection("users").doc(firebaseUser.uid);
          userDocUnsubscribe = userDocRef.onSnapshot(
            (doc) => {
              if (doc.exists) {
                const userData = doc.data() as UserProfile;

                // Check if this user is a company owner (original account)
                if (!userData.companyId && !userData.role) {
                  userData.isOwner = true;
                  userData.role = "owner";
                  userData.companyId = firebaseUser.uid;
                }

                setUserProfile(userData);
              } else {
                setUserProfile(null);
              }
              setLoading(false);
            },
            (error) => {
              console.error("Error fetching user profile:", error);
              setUserProfile(null);
              setLoading(false);
            },
          );
        } catch (error) {
          console.error("Error setting up user listener:", error);
          setUserProfile(null);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Cleanup function
    return () => {
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    await auth.signOut();
  };

  const value = { user, userProfile, loading, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
