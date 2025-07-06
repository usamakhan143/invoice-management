
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { auth, db } from '../services/firebase';
import type { UserProfile } from '../types';
import type firebase from 'firebase/compat/app';

interface AuthContextType {
    user: firebase.User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<firebase.User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                const userDocRef = db.collection('users').doc(firebaseUser.uid);
                const unsubscribeSnapshot = userDocRef.onSnapshot(doc => {
                    if (doc.exists) {
                        setUserProfile(doc.data() as UserProfile);
                    } else {
                        setUserProfile(null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user profile:", error);
                    setUserProfile(null);
                    setLoading(false);
                });
                // Cleanup snapshot listener on user change
                return () => unsubscribeSnapshot();
            } else {
                setUserProfile(null);
                setLoading(false);
            }
        });

        // Cleanup auth listener on unmount
        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await auth.signOut();
    };

    const value = { user, userProfile, loading, logout };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
