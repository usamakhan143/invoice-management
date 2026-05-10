import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePermissions } from "../../hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { db, auth as firebaseAuth, Timestamp } from "../../services/firebase";
import firebase from "firebase/compat/app";
import { ActivityLogger } from "../../services/activityLogger";
import { TokenService, type UserToken } from "../../services/tokenService";
import {
  PAGES,
} from "../../config/permissions";
import type { CompanyUser } from "../../types";
import Spinner from "../../components/Spinner";
import RoleManagement from "../../components/RoleManagement";

const UserManagementPage: React.FC = () => {
  usePageTitle("User Management");
  const { user, userProfile } = useAuth();
  const {
    canViewUserManagement,
    canCreateUser,
    canLoginAsUser,
    canEditUser,
    canActivateDeactivateUser,
    canManageUserSessions,
    canViewCustomRoles,
    canCreateCustomRole,
    canEditCustomRole,
    canDeleteCustomRole,
    canBulkDeleteCompanyUsers,
    isOwner,
    isAdmin
  } = usePermissions();
  const navigate = useNavigate();

  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<CompanyUser[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [userFilterTab, setUserFilterTab] = useState<"active" | "deactivated">("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkRemovingUsers, setBulkRemovingUsers] = useState(false);
  const selectAllTeamRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "custom",
  });
  const [customRoles, setCustomRoles] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [sessionModalUser, setSessionModalUser] = useState<CompanyUser | null>(null);
  const [sessionRows, setSessionRows] = useState<UserToken[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingAllSessions, setRevokingAllSessions] = useState(false);
  const currentToken = useMemo(() => localStorage.getItem("userToken"), []);
  const timezoneLabel = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown timezone",
    [],
  );

  // Decrypt password function for Login As functionality
  const decryptPassword = (encryptedPassword: string): string | null => {
    try {
      if (encryptedPassword && encryptedPassword.startsWith("enc_")) {
        const encoded = encryptedPassword.substring(4); // Remove "enc_" prefix
        const decoded = atob(encoded);
        const [password, email] = decoded.split(":");

        // Return password without email verification here since we'll verify in caller
        return password;
      }
      return null;
    } catch (error) {
      console.error("Failed to decrypt password:", error);
      return null;
    }
  };

  // Page access control
  useEffect(() => {
    if (!canViewUserManagement()) {
      navigate("/");
      return;
    }
  }, [canViewUserManagement, navigate]);

  // Edit user states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [editForm, setEditForm] = useState({
    role: "custom",
  });

  // Load custom roles for this company
  const loadCustomRoles = async () => {
    if (!user || !userProfile) return;

    try {
      const companyId = userProfile.isOwner ? user.uid : userProfile.companyId;
      if (!companyId) return;

      const rolesSnapshot = await db
        .collection("customRoles")
        .where("companyId", "==", companyId)
        .get();

      const rolesData = rolesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setCustomRoles(rolesData);
    } catch (error) {
      console.error("Error loading custom roles:", error);
    }
  };

  const loadUsers = async () => {
    if (!user || !userProfile) return;

    setLoading(true);

    try {
      const companyId = userProfile.isOwner ? user.uid : userProfile.companyId;

      if (!companyId) {
        console.error("Company ID not found");
        setLoading(false);
        return;
      }

      // Use onSnapshot for real-time updates
      const unsubscribe = db
        .collection("companyUsers")
        .where("companyId", "==", companyId)
        .onSnapshot(
          (snapshot) => {
            const usersData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as CompanyUser[];

            // Sort manually to avoid Firestore index requirement
            usersData.sort((a, b) => {
              const aTime = a.createdAt?.toDate?.() || new Date();
              const bTime = b.createdAt?.toDate?.() || new Date();
              return bTime.getTime() - aTime.getTime();
            });



            setUsers(usersData);
            setFilteredUsers(usersData);
            setLoading(false);
          },
          (error) => {
            console.error("Error loading users:", error);
            setUsers([]);
            setLoading(false);
          },
        );

      // Return cleanup function
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up users listener:", error);
      setUsers([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      unsubscribe = await loadUsers();
      await loadCustomRoles();
    };

    setupListener();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, userProfile]);

  // Filter users based on search term and status
  useEffect(() => {
    const filtered = users.filter((user) => {
      const matchesSearch = !searchTerm.trim() ||
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = userFilterTab === "active" ? user.isActive : !user.isActive;

      return matchesSearch && matchesStatus;
    });

    setFilteredUsers(filtered);
  }, [searchTerm, users, userFilterTab]);

  const handleCreateUser = async () => {
    if (!user || !userProfile) return;

    try {
      setError("");
      setLoading(true);

      const companyId = userProfile.isOwner ? user.uid : userProfile.companyId;
      if (!companyId) {
        throw new Error("Company ID not found");
      }

      // Check if user already exists
      const existingUser = await db
        .collection("companyUsers")
        .where("email", "==", createForm.email)
        .where("companyId", "==", companyId)
        .get();

      if (!existingUser.empty) {
        throw new Error("User with this email already exists in your company");
      }

      // Get permissions from selected custom role
      let granularPermissions: string[] = [];

      const customRole = customRoles.find(role => role.name === createForm.role);
      if (customRole) {
        granularPermissions = customRole.granularPermissions || [];
      }


      // Helper function for timeout operations
      const withTimeout = (promise: any, timeoutMs: number, operation: string) => {
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
      };

      let secondaryApp: any = null;
      let secondaryAuth: any = null;

      try {

        // 🔥 SOLUTION: Use secondary Firebase app instance with timeout
        secondaryApp = await withTimeout(
          import('firebase/compat/app').then(firebase => {
            return firebase.default.initializeApp({
              apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
              authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
              projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            }, `secondary-${Date.now()}`);
          }),
          10000,
          "Secondary Firebase app creation"
        );

        secondaryAuth = secondaryApp.auth();


        // Create user with timeout
        const newUserCredential = await withTimeout(
          secondaryAuth.createUserWithEmailAndPassword(createForm.email, createForm.password),
          15000,
          "Firebase Auth user creation"
        );

        const newFirebaseUser = newUserCredential.user;

        if (!newFirebaseUser) {
          throw new Error("Failed to create Firebase Auth account");
        }


        // Step 1: Encrypt password for Login As functionality
        const encryptPassword = (password: string): string => {
          // Simple encryption - in production use proper encryption library
          const encoded = btoa(password + ":" + createForm.email);
          return `enc_${encoded}`;
        };

        const encryptedPassword = encryptPassword(createForm.password);

        // Step 2: Create user profile in users collection with timeout
        await withTimeout(
          db.collection("users").doc(newFirebaseUser.uid).set({
            uid: newFirebaseUser.uid,
            email: createForm.email,
            companyName: userProfile.companyName,
            displayName: createForm.displayName,
            createdAt: Timestamp.now(),
            invoiceCounter: 0,
            role: createForm.role,
            isOwner: false,
            companyId: companyId,
            granularPermissions: granularPermissions,
            isActive: true,
            // Store encrypted password for Login As functionality
            tempPassword: encryptedPassword,
          }),
          10000,
          "User profile creation"
        );


        // Step 3: Create company user record with timeout
        await withTimeout(
          db.collection("companyUsers").add({
            uid: newFirebaseUser.uid,
            email: createForm.email,
            displayName: createForm.displayName,
            role: createForm.role,
            granularPermissions: granularPermissions,
            isActive: true,
            companyId,
            invitedBy: user.uid,
            createdAt: Timestamp.now(),
          }),
          10000,
          "Company user record creation"
        );


        // Step 4: Sign out from secondary auth and delete the app with timeout
        await withTimeout(
          Promise.all([
            secondaryAuth.signOut(),
            secondaryApp.delete()
          ]),
          5000,
          "Secondary Firebase app cleanup"
        );


        // Step 5: Log user creation activity with timeout
        await withTimeout(
          ActivityLogger.logActivity(
            user,
            userProfile,
            "user_created",
            `Created new user: ${createForm.displayName} (${createForm.email})`,
            {
              entityId: newFirebaseUser.uid,
              entityType: "user",
              newValue: {
                email: createForm.email,
                displayName: createForm.displayName,
                role: createForm.role,
              },
            },
          ),
          8000,
          "Activity logging"
        );


        // Step 5: Close modal and reset form
        setIsCreateModalOpen(false);
        resetCreateForm();


        // Step 6: Show success message
        alert(
          `User ${createForm.email} created successfully! They can now login normally at /login with their email and password.`,
        );

      } catch (authError) {
        console.error("❌ Auth error:", authError);

        // Enhanced cleanup on error with timeout handling
        if (secondaryAuth && secondaryApp) {
          try {
            await withTimeout(
              Promise.all([
                secondaryAuth.signOut().catch(() => {}), // Silent fail
                secondaryApp.delete().catch(() => {})     // Silent fail
              ]),
              3000,
              "Emergency cleanup"
            );
          } catch (cleanupError) {
            console.error("❌ Emergency cleanup failed:", cleanupError);
            // Continue anyway - don't block user creation failure
          }
        }

        // Provide user-friendly error messages for timeout errors
        if (authError.message && authError.message.includes('timed out')) {
          throw new Error("User creation timed out. Please check your connection and try again.");
        }

        throw authError;
      }

    } catch (error: any) {
      console.error("❌ User creation error:", error);

      // Provide user-friendly error messages
      let errorMessage = "Failed to create user";

      if (error.message && error.message.includes('timed out')) {
        errorMessage = "User creation timed out. Please check your internet connection and try again.";
      } else if (error.message && error.message.includes('network')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message && error.message.includes('permission')) {
        errorMessage = "Permission denied. Please contact your administrator.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      email: "",
      password: "",
      displayName: "",
      role: "custom",
    });
    setError("");
  };

  const handleRoleChange = (role: string) => {
    setCreateForm({ ...createForm, role });
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const targetUser = users.find(u => u.id === userId);

      if (!targetUser) {
        alert("User not found");
        return;
      }

      // If deactivating, delete all tokens first to force immediate logout
      if (!newStatus) {
        try {
          await TokenService.revokeUserTokenByEmail(targetUser.email);
        } catch (error) {
          // Silent error handling
        }
      }

      // Update user status in companyUsers collection
      await db.collection("companyUsers").doc(userId).update({
        isActive: newStatus,
      });

      // Update user document in users collection using the Firebase Auth UID
      if (targetUser.uid) {
        try {
          if (!newStatus) {
            // Deactivating user - set isDeactivated flag
            await db.collection("users").doc(targetUser.uid).update({
              isDeactivated: true,
            });
          } else {
            // Reactivating user - remove isDeactivated flag
            await db.collection("users").doc(targetUser.uid).update({
              isDeactivated: false,
            });
          }
        } catch (userDocError: any) {
          // If user document doesn't exist, create it with the deactivation flag
          if (userDocError.code === 'not-found') {
            await db.collection("users").doc(targetUser.uid).set({
              email: targetUser.email,
              isDeactivated: !newStatus,
            }, { merge: true });
          } else {
            console.error("Error updating user document:", userDocError);
            // Don't fail the entire operation if user document update fails
          }
        }
      }

      // Log activity
      if (user && userProfile) {
        await ActivityLogger.logActivity(
          user,
          userProfile,
          newStatus ? "user_activated" : "user_deactivated",
          `${newStatus ? "Activated" : "Deactivated"} user: ${targetUser.displayName} (${targetUser.email})`,
          {
            entityId: userId,
            entityType: "user",
            newValue: { isActive: newStatus },
          },
        );
      }

      // Refresh user list
      await loadUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Failed to update user status");
    }
  };

  const performRemoveCompanyUser = async (userId: string, userEmail: string) => {
    const userToDelete = users.find((u) => u.id === userId);
    await db.collection("companyUsers").doc(userId).delete();

    if (user && userProfile && userToDelete) {
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "user_deleted",
        `Removed user: ${userToDelete.displayName} (${userEmail})`,
        {
          entityId: userId,
          entityType: "user",
          oldValue: {
            email: userEmail,
            displayName: userToDelete.displayName,
            role: userToDelete.role,
          },
        },
      );
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!canBulkDeleteCompanyUsers()) return;
    if (
      !window.confirm(
        `Are you sure you want to remove ${userEmail} from your company?`,
      )
    ) {
      return;
    }

    try {
      await performRemoveCompanyUser(userId, userEmail);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to remove user");
    }
  };

  const handleBulkRemoveUsers = async () => {
    if (!canBulkDeleteCompanyUsers() || selectedUserIds.length === 0) return;
    const targets = selectedUserIds
      .map((id) => users.find((u) => u.id === id))
      .filter((u): u is CompanyUser => !!u && u.role !== "owner");
    if (targets.length === 0) return;
    const n = targets.length;
    if (
      !window.confirm(
        `Remove ${n} user${n === 1 ? "" : "s"} from your company? They will lose access to this workspace.`,
      )
    ) {
      return;
    }
    setBulkRemovingUsers(true);
    try {
      for (const t of targets) {
        await performRemoveCompanyUser(t.id, t.email);
      }
      setSelectedUserIds([]);
    } catch (error) {
      console.error("Bulk remove users:", error);
      alert("Failed to remove some users.");
    } finally {
      setBulkRemovingUsers(false);
    }
  };

  // Edit user functions
  const openEditModal = (userToEdit: CompanyUser) => {
    setEditingUser(userToEdit);
    setEditForm({
      role: userToEdit.role,
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
    setEditForm({ role: "custom" });
  };

  const handleEditRoleChange = (role: string) => {
    setEditForm({ ...editForm, role });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      // Get permissions from selected custom role
      let granularPermissions: string[] = [];

      const customRole = customRoles.find(role => role.name === editForm.role);
      if (customRole) {
        granularPermissions = customRole.granularPermissions || [];
      }

      // Update company user record
      await db.collection("companyUsers").doc(editingUser.id).update({
        role: editForm.role,
        granularPermissions: granularPermissions,
      });

      // Update user profile in users collection
      await db.collection("users").doc(editingUser.uid).update({
        role: editForm.role,
        granularPermissions: granularPermissions,
      });

      // Log user update activity
      await ActivityLogger.logActivity(
        user!,
        userProfile!,
        "user_updated",
        `Updated user: ${editingUser.displayName} (${editingUser.email})`,
        {
          entityId: editingUser.uid,
          entityType: "user",
          newValue: {
            role: editForm.role,
            granularPermissions: granularPermissions,
          },
        },
      );

      closeEditModal();
      await loadUsers();
      alert("User updated successfully!");
    } catch (error: any) {
      console.error("Error updating user:", error);
      alert("Failed to update user: " + error.message);
    }
  };

  const handleResetUserScreenPin = async (member: CompanyUser) => {
    if (!isOwner || !user || !userProfile) return;
    if (member.role === "owner") return;
    if (member.uid === user.uid) return;
    const confirmed = window.confirm(
      `Reset screen / revenue PIN for ${member.displayName}? They can set a new PIN from their profile.`,
    );
    if (!confirmed) return;
    try {
      await db
        .collection("users")
        .doc(member.uid)
        .update({
          screenPinHash: firebase.firestore.FieldValue.delete(),
          updatedAt: new Date(),
        });
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "user_updated",
        `Reset screen PIN for ${member.displayName} (${member.email})`,
        {
          entityId: member.uid,
          entityType: "user",
          newValue: { screenPinReset: true },
        },
      );
      alert("PIN reset. The user can set a new PIN in Profile.");
      await loadUsers();
    } catch (err: any) {
      console.error(err);
      alert("Could not reset PIN: " + (err?.message || "Unknown error"));
    }
  };

  const handleDirectLogin = async (targetUser: CompanyUser) => {
    try {

      // Check if target user is active
      if (!targetUser.isActive) {
        alert("Cannot login as deactivated user.");
        return;
      }

      // Get target user data from users collection
      const userDoc = await db.collection("users").doc(targetUser.uid).get();
      const userData = userDoc.data();

      if (!userData) {
        alert("User data not found. This user may need to be recreated.");
        return;
      }

      if (!userData.tempPassword) {
        alert("User does not have login credentials. Please create them first.");
        return;
      }

      // Test decrypt functionality
      const decryptedPassword = decryptPassword(userData.tempPassword);
      if (!decryptedPassword) {
        alert("Invalid login credentials. Please contact administrator.");
        return;
      }

      // Create an impersonation session token instead of Firebase auth
      const sessionToken = await createImpersonationSession(targetUser);

      if (sessionToken) {
        // Mark current tab as admin tab (protected from impersonation)
        sessionStorage.setItem('isAdminTab', 'true');

        // Open new tab with the session token
        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        const timestamp = Date.now();
        const loginUrl = `${baseUrl}#/impersonate?session=${sessionToken}&t=${timestamp}`;

        const newTab = window.open(loginUrl, '_blank');
        if (!newTab) {
          alert("Please allow popups for this site to enable user impersonation.");
          return;
        }

        // Log the activity
        await ActivityLogger.logActivity(
          user!,
          userProfile,
          'login',
          `Admin initiated login as user: ${targetUser.email}`
        );
      }

    } catch (error: any) {
      let userMessage = "Unable to login as this user. Please try again.";

      if (error.message?.includes("not authenticated")) {
        userMessage = "Session expired. Please refresh the page and try again.";
      } else if (error.message?.includes("permission")) {
        userMessage = "You don't have permission to perform this action.";
      } else if (error.message?.includes("not found")) {
        userMessage = "User account not found. Please contact support.";
      } else if (error.message?.includes("network") || error.message?.includes("connection")) {
        userMessage = "Network error. Please check your connection and try again.";
      }

      alert(userMessage);
    }
  };

  const formatTokenTs = (ts: any): string => {
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

  const openSessionsModal = async (targetUser: CompanyUser) => {
    setSessionModalUser(targetUser);
    setSessionsLoading(true);
    setSessionRows([]);
    try {
      const rows = await TokenService.getUserActiveSessions(targetUser.uid);
      setSessionRows(rows);
    } catch (e) {
      console.error("Load sessions failed:", e);
      alert("Failed to load active sessions.");
    } finally {
      setSessionsLoading(false);
    }
  };

  const closeSessionsModal = () => {
    setSessionModalUser(null);
    setSessionRows([]);
    setRevokingSessionId(null);
    setRevokingAllSessions(false);
  };

  const refreshSessionsModal = async () => {
    if (!sessionModalUser) return;
    setSessionsLoading(true);
    try {
      const rows = await TokenService.getUserActiveSessions(sessionModalUser.uid);
      setSessionRows(rows);
    } finally {
      setSessionsLoading(false);
    }
  };

  const revokeSession = async (token: UserToken) => {
    if (!token.id || !sessionModalUser || !user || !userProfile) return;
    setRevokingSessionId(token.id);
    try {
      await TokenService.revokeTokenById(token.id);
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "user_updated",
        `Revoked one session for ${sessionModalUser.displayName} (${sessionModalUser.email})`,
        {
          entityId: sessionModalUser.uid,
          entityType: "user_session",
          newValue: { tokenId: token.id },
        },
      );
      await refreshSessionsModal();
    } catch (e) {
      console.error("Revoke session failed:", e);
      alert("Failed to revoke session.");
    } finally {
      setRevokingSessionId(null);
    }
  };

  const revokeAllSessions = async () => {
    if (!sessionModalUser || !user || !userProfile) return;
    if (
      !window.confirm(
        `Revoke all active sessions for ${sessionModalUser.displayName}? They will be logged out on all devices.`,
      )
    ) {
      return;
    }
    setRevokingAllSessions(true);
    try {
      const removed = await TokenService.revokeAllUserTokens(sessionModalUser.uid);
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "user_updated",
        `Revoked all sessions for ${sessionModalUser.displayName} (${sessionModalUser.email})`,
        {
          entityId: sessionModalUser.uid,
          entityType: "user_session",
          newValue: { revokedSessions: removed },
        },
      );
      await refreshSessionsModal();
      alert(
        removed > 0
          ? `${removed} session${removed === 1 ? "" : "s"} revoked.`
          : "No active sessions found.",
      );
    } catch (e) {
      console.error("Revoke all sessions failed:", e);
      alert("Failed to revoke all sessions.");
    } finally {
      setRevokingAllSessions(false);
    }
  };

  // Helper function to create impersonation session
  const createImpersonationSession = async (targetUser: CompanyUser) => {
    try {
      // Verify admin permissions before creating session
      if (!user || !userProfile) {
        throw new Error("User not authenticated");
      }

      if (!isOwner && !isAdmin) {
        throw new Error("Insufficient permissions - admin access required");
      }

      // Clean up expired sessions first
      await cleanupExpiredSessions();

      // Get target user's full profile
      const userDoc = await db.collection("users").doc(targetUser.uid).get();
      const userData = userDoc.data();

      if (!userData) {
        throw new Error("Target user data not found");
      }

      // Decrypt password for session data
      const decryptedPassword = decryptPassword(userData.tempPassword);

      // Verify email matches for security (reconstruct original encrypted data for verification)
      if (userData.tempPassword && userData.tempPassword.startsWith("enc_")) {
        try {
          const encoded = userData.tempPassword.substring(4);
          const decoded = atob(encoded);
          const [, storedEmail] = decoded.split(":");
          if (storedEmail !== targetUser.email) {
            throw new Error("Email verification failed for decrypted password");
          }
        } catch (verifyError) {
          console.error("Password verification failed:", verifyError);
          throw new Error("Invalid login credentials");
        }
      }

      // Create a session token that contains user info without requiring Firebase auth
      const sessionData = {
        targetUserId: targetUser.uid,
        targetUserEmail: targetUser.email,
        targetUserProfile: {
          uid: targetUser.uid,
          email: targetUser.email,
          displayName: userData.displayName || userData.companyName,
          role: userData.role,
          companyId: userData.companyId,
          isActive: targetUser.isActive,
          isOwner: userData.isOwner,
          screenPinHash: userData.screenPinHash,
          tempPassword: decryptedPassword // Store decrypted password for impersonation
        },
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000), // 10 minutes
        used: false,
        createdBy: user?.uid,
        adminEmail: user?.email
      };

      // Store in impersonation sessions collection
      const sessionRef = await db.collection('impersonationSessions').add(sessionData);
      return sessionRef.id;
    } catch (error) {
      console.error("Failed to create impersonation session:", error);
      return null;
    }
  };

  // Clean up expired sessions to prevent database bloat
  const cleanupExpiredSessions = async () => {
    try {
      const expiredSessionsQuery = db
        .collection('impersonationSessions')
        .where('expiresAt', '<=', Timestamp.now());

      const expiredSessions = await expiredSessionsQuery.get();
      const batch = db.batch();

      expiredSessions.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      if (!expiredSessions.empty) {
        await batch.commit();
      }
    } catch (error) {
      console.error("Failed to cleanup expired sessions:", error);
    }
  };

  const allowBulkTeamSelect = canBulkDeleteCompanyUsers();

  const selectableTeamMembers = useMemo(
    () => filteredUsers.filter((u) => u.role !== "owner"),
    [filteredUsers],
  );

  const selectedTeamSet = useMemo(
    () => new Set(selectedUserIds),
    [selectedUserIds],
  );

  const allSelectableTeamSelected =
    allowBulkTeamSelect &&
    selectableTeamMembers.length > 0 &&
    selectableTeamMembers.every((u) => selectedTeamSet.has(u.id));

  useEffect(() => {
    const el = selectAllTeamRef.current;
    if (!el || !allowBulkTeamSelect || selectableTeamMembers.length === 0) {
      if (el) el.indeterminate = false;
      return;
    }
    const onPage = selectableTeamMembers.filter((u) =>
      selectedTeamSet.has(u.id),
    ).length;
    el.indeterminate = onPage > 0 && onPage < selectableTeamMembers.length;
  }, [allowBulkTeamSelect, selectableTeamMembers, selectedTeamSet]);

  const toggleTeamMemberSelected = useCallback((id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleSelectAllTeamMembers = useCallback(() => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      const every =
        selectableTeamMembers.length > 0 &&
        selectableTeamMembers.every((u) => next.has(u.id));
      if (every) {
        selectableTeamMembers.forEach((u) => next.delete(u.id));
      } else {
        selectableTeamMembers.forEach((u) => next.add(u.id));
      }
      return Array.from(next);
    });
  }, [selectableTeamMembers]);

  const clearTeamSelection = useCallback(() => {
    setSelectedUserIds([]);
  }, []);

  if (!canViewUserManagement()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You don't have permission to manage users.
          </p>
        </div>
      </div>
    );
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mobile-p-4 p-4 sm:p-6">
      <div className="page-header mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          User Management
        </h1>
        {activeTab === "users" && (
          <div className="button-group">
            <button
              onClick={() => loadUsers()}
              disabled={loading}
              className="mobile-btn-icon p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={loading ? "Loading..." : "Refresh"}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            {canCreateUser() && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mobile-btn px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap"
              >
                Create User
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("users")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "users"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-primary-600 hover:border-primary-300 dark:text-gray-400 dark:hover:text-primary-300 dark:hover:border-primary-500/60"
            }`}
          >
            Team Members
          </button>
          {canViewCustomRoles() && (
            <button
              onClick={() => setActiveTab("roles")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "roles"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-primary-600 hover:border-primary-300 dark:text-gray-400 dark:hover:text-primary-300 dark:hover:border-primary-500/60"
              }`}
            >
              Roles
            </button>
          )}
        </nav>
      </div>

      {/* Users Tab Content */}
      {activeTab === "users" && (
        <>
          {/* User Status Filter Tabs */}
          <div className="mb-4">
            <div className="flex space-x-4">
              <button
                onClick={() => setUserFilterTab("active")}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  userFilterTab === "active"
                    ? "bg-green-100 text-green-800 border border-green-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Active Users ({users.filter(u => u.isActive).length})
              </button>
              <button
                onClick={() => setUserFilterTab("deactivated")}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  userFilterTab === "deactivated"
                    ? "bg-red-100 text-red-800 border border-red-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Deactivated Users ({users.filter(u => !u.isActive).length})
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-5 w-5"
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
            </button>
          )}
        </div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {searchTerm
            ? `Found ${filteredUsers.length} user${filteredUsers.length !== 1 ? "s" : ""} matching "${searchTerm}"`
            : `Total ${users.length} user${users.length !== 1 ? "s" : ""}`}
        </div>
      </div>

      {/* Stats */}
      <div className="grid mobile-grid-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium">Total Users</h3>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium">Active Users</h3>
          <p className="text-2xl font-bold">
            {filteredUsers.filter((u) => u.isActive).length}
          </p>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium">Admins</h3>
          <p className="text-2xl font-bold">
            {
              filteredUsers.filter(
                (u) => u.role === "admin" || u.role === "owner",
              ).length
            }
          </p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium">Filtered Results</h3>
          <p className="text-2xl font-bold">{filteredUsers.length}</p>
        </div>
      </div>

      {/* Users Table */}
      {allowBulkTeamSelect && selectedUserIds.length > 0 ? (
        <div
          className="mb-3 flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/90 p-3 dark:border-primary-800 dark:bg-primary-950/40 sm:flex-row sm:flex-wrap sm:items-end"
          role="region"
          aria-label="Bulk actions for team members"
        >
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {selectedUserIds.length} user{selectedUserIds.length === 1 ? "" : "s"}{" "}
            selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkRemovingUsers}
              onClick={() => void handleBulkRemoveUsers()}
              className="text-sm px-3 py-1.5 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkRemovingUsers ? "Removing…" : "Remove selected"}
            </button>
            <button
              type="button"
              disabled={bulkRemovingUsers}
              onClick={clearTeamSelection}
              className="text-sm px-2 py-1.5 text-gray-600 hover:underline dark:text-gray-300"
            >
              Clear selection
            </button>
          </div>
        </div>
      ) : null}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Team Members ({filteredUsers.length} of {users.length})
          </h2>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              No team members found.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create First User
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  {allowBulkTeamSelect ? (
                    <th className="w-10 px-2 py-3">
                      <span className="sr-only">Select row</span>
                      <input
                        ref={selectAllTeamRef}
                        type="checkbox"
                        checked={allSelectableTeamSelected}
                        onChange={toggleSelectAllTeamMembers}
                        disabled={selectableTeamMembers.length === 0}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                        aria-label="Select all users in the list (owner excluded)"
                      />
                    </th>
                  ) : null}
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Invited Date</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((member) => (
                  <tr
                    key={member.id}
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    {allowBulkTeamSelect ? (
                      <td className="w-10 px-2 py-4 align-top">
                        <input
                          type="checkbox"
                          checked={selectedTeamSet.has(member.id)}
                          onChange={() => toggleTeamMemberSelected(member.id)}
                          disabled={member.role === "owner"}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-40"
                          aria-label={`Select user ${member.displayName}`}
                        />
                      </td>
                    ) : null}
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {member.displayName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {member.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          member.role === "owner"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100"
                            : member.role === "admin"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                              : member.role === "manager"
                                ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                                : member.role === "editor"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                        }`}
                      >
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          member.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                            : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                        }`}
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {member.createdAt?.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {(canLoginAsUser() || isOwner || isAdmin) && member.isActive && (
                          <button
                            onClick={() => handleDirectLogin(member)}
                            className="inline-flex items-center justify-center w-8 h-8 text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-800 dark:text-green-200 dark:border-green-600 dark:hover:bg-green-700"
                            title="Login as this user"
                            aria-label={`Login as ${member.displayName}`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                              />
                            </svg>
                          </button>
                        )}
                        {isOwner &&
                          member.role !== "owner" &&
                          member.uid !== user?.uid && (
                            <button
                              onClick={() => void handleResetUserScreenPin(member)}
                              className="inline-flex items-center justify-center w-8 h-8 text-amber-800 bg-amber-100 border border-amber-300 rounded-md hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-700 dark:hover:bg-amber-800"
                              title="Reset screen / revenue PIN"
                              aria-label={`Reset screen PIN for ${member.displayName}`}
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                                />
                              </svg>
                            </button>
                          )}
                        {canEditUser() &&
                          member.role !== "owner" && (
                            <button
                              onClick={() => openEditModal(member)}
                              className="inline-flex items-center justify-center w-8 h-8 text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-800 dark:text-blue-200 dark:border-blue-600 dark:hover:bg-blue-700"
                              title="Edit user"
                              aria-label={`Edit ${member.displayName}`}
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                          )}
                        {canActivateDeactivateUser() && member.role !== "owner" && (
                          <button
                            onClick={() =>
                              toggleUserStatus(member.id, member.isActive)
                            }
                            className={`inline-flex items-center justify-center w-8 h-8 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              member.isActive
                                ? "text-red-700 bg-red-100 border-red-300 hover:bg-red-200 focus:ring-red-500 dark:bg-red-800 dark:text-red-200 dark:border-red-600 dark:hover:bg-red-700"
                                : "text-green-700 bg-green-100 border-green-300 hover:bg-green-200 focus:ring-green-500 dark:bg-green-800 dark:text-green-200 dark:border-green-600 dark:hover:bg-green-700"
                            }`}
                            title={member.isActive ? "Deactivate user" : "Activate user"}
                            aria-label={`${member.isActive ? "Deactivate" : "Activate"} ${member.displayName}`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d={
                                  member.isActive
                                    ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636"
                                    : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                }
                              />
                            </svg>
                          </button>
                        )}
                        {canManageUserSessions() && member.role !== "owner" && (
                          <button
                            type="button"
                            onClick={() => void openSessionsModal(member)}
                            className="inline-flex items-center justify-center w-8 h-8 text-indigo-700 bg-indigo-100 border border-indigo-300 rounded-md hover:bg-indigo-200 hover:text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700 dark:hover:bg-indigo-800/70 dark:hover:text-indigo-100"
                            title="Manage sessions"
                            aria-label={`Manage sessions for ${member.displayName}`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9.75 17L6 20.75M6 20.75V17m0 3.75h3.75M14.25 7L18 3.25M18 3.25V7m0-3.75h-3.75M4 8.5A4.5 4.5 0 018.5 4h7A4.5 4.5 0 0120 8.5v7a4.5 4.5 0 01-4.5 4.5h-7A4.5 4.5 0 014 15.5v-7z"
                              />
                            </svg>
                          </button>
                        )}
                        {canBulkDeleteCompanyUsers() && member.role !== "owner" && (
                          <button
                            type="button"
                            onClick={() => void deleteUser(member.id, member.email)}
                            className="inline-flex items-center justify-center w-8 h-8 text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800"
                            title="Remove user"
                            aria-label={`Remove ${member.displayName}`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8"
                              />
                            </svg>
                          </button>
                        )}
                        {!canLoginAsUser() &&
                          !canEditUser() &&
                          !canActivateDeactivateUser() &&
                          !canManageUserSessions() &&
                          !(canBulkDeleteCompanyUsers() && member.role !== "owner") && (
                          <span className="text-gray-400 text-xs">No actions available</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Create New User
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={createForm.displayName}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        displayName: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter password for new user"
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="custom">Select a role...</option>
                  {customRoles.length > 0 && customRoles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name} - {role.description || "Custom role"}
                    </option>
                  ))}
                </select>
                {customRoles.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    No custom roles available. Create a custom role first.
                  </p>
                )}
              </div>


            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={
                  !createForm.email ||
                  !createForm.displayName ||
                  !createForm.password ||
                  createForm.role === "custom" ||
                  loading
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Edit User: {editingUser.displayName}
            </h3>

            <div className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => handleEditRoleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="custom">Select a role...</option>
                  {customRoles.length > 0 && customRoles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name} - {role.description || "Custom role"}
                    </option>
                  ))}
                </select>
              </div>


            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update User
              </button>
            </div>
          </div>
        </div>
      )}
      {sessionModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Active Sessions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {sessionModalUser.displayName} ({sessionModalUser.email})
                </p>
              </div>
              <button
                type="button"
                onClick={closeSessionsModal}
                className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => void refreshSessionsModal()}
                disabled={sessionsLoading}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {sessionsLoading ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => void revokeAllSessions()}
                disabled={revokingAllSessions}
                className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {revokingAllSessions ? "Revoking..." : "Revoke All"}
              </button>
            </div>

            {sessionsLoading ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">Loading sessions...</p>
            ) : sessionRows.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">No active sessions.</p>
            ) : (
              <div className="space-y-3">
                {sessionRows.map((row) => {
                  const isCurrent =
                    sessionModalUser?.uid === user?.uid &&
                    !!currentToken &&
                    row.token === currentToken;
                  return (
                  <div
                    key={row.id || `${row.userId}-${row.token}`}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {row.deviceInfo || "Unknown Device"}
                        </p>
                        {isCurrent ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                            Current device
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {row.userAgent || "Unknown browser"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Location: {getLocationHint(row, isCurrent)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Last active: {formatRelativeTime(row.lastActiveAt)} ({formatTokenTs(row.lastActiveAt)}) • Created: {formatTokenTs(row.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!row.id || revokingSessionId === row.id || isCurrent}
                      onClick={() => void revokeSession(row)}
                      className="px-3 py-1.5 text-xs rounded-md border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
                    >
                      {revokingSessionId === row.id ? "Revoking..." : "Revoke"}
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}

      {/* Roles Tab Content */}
      {activeTab === "roles" && canViewCustomRoles() && (
        <RoleManagement />
      )}
    </div>
  );
};

export default UserManagementPage;
