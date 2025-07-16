import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePermissions } from "../../hooks/usePermissions";
import { db, auth as firebaseAuth, Timestamp } from "../../services/firebase";
import { ActivityLogger } from "../../services/activityLogger";
import {
  ROLE_PERMISSIONS,
  ROLE_DESCRIPTIONS,
  PAGES,
} from "../../config/permissions";
import type { CompanyUser, UserRole, Permission } from "../../types";
import Spinner from "../../components/Spinner";

const UserManagementPage: React.FC = () => {
  usePageTitle("User Management");
  const { user, userProfile } = useAuth();
  const { isOwner, isAdmin, canCreate, canEdit, canDelete } = usePermissions();

  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<CompanyUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "viewer" as UserRole,
    customPermissions: false,
  });
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(
    [],
  );
  const [error, setError] = useState("");

  // Edit user states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [editForm, setEditForm] = useState({
    role: "viewer" as UserRole,
    customPermissions: false,
  });
  const [editSelectedPermissions, setEditSelectedPermissions] = useState<
    Permission[]
  >([]);

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
    };

    setupListener();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, userProfile]);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

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

      // Get permissions based on role or custom selection
      const permissions = createForm.customPermissions
        ? selectedPermissions
        : ROLE_PERMISSIONS[createForm.role];

      // Generate a unique user ID (in production, this should be done via Firebase Admin SDK)
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create user profile in users collection (without Firebase Auth to avoid logout)
      await db.collection("users").doc(newUserId).set({
        uid: newUserId,
        email: createForm.email,
        companyName: userProfile.companyName,
        displayName: createForm.displayName,
        createdAt: Timestamp.now(),
        invoiceCounter: 0,
        role: createForm.role,
        isOwner: false,
        companyId: companyId,
        permissions: permissions,
        isActive: true,
        // Add password for manual login (in production, use proper hashing)
        tempPassword: createForm.password,
      });

      // Create company user record
      await db.collection("companyUsers").add({
        uid: newUserId,
        email: createForm.email,
        displayName: createForm.displayName,
        role: createForm.role,
        permissions,
        isActive: true,
        companyId,
        invitedBy: user.uid,
        createdAt: Timestamp.now(),
      });

      // Log user creation activity
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "user_created",
        `Created new user: ${createForm.displayName} (${createForm.email})`,
        {
          entityId: newUserId,
          entityType: "user",
          newValue: {
            email: createForm.email,
            displayName: createForm.displayName,
            role: createForm.role,
          },
        },
      );

      setIsCreateModalOpen(false);
      resetCreateForm();

      // Auto refresh data after successful operation
      await loadUsers();

      alert(
        `User ${createForm.email} created successfully! They can now login using the "Login As" button or manually with email: ${createForm.email} and the password you provided.`,
      );
    } catch (error: any) {
      setError(error.message);
      // If error occurred, try to sign back in as admin
      if (user?.email) {
        try {
          const password = prompt(
            "Please enter your password to restore your session:",
          );
          if (password) {
            await firebaseAuth.signInWithEmailAndPassword(user.email, password);
          }
        } catch (authError) {
          console.error("Failed to restore admin session:", authError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      email: "",
      password: "",
      displayName: "",
      role: "viewer",
      customPermissions: false,
    });
    setSelectedPermissions([]);
    setError("");
  };

  const handleRoleChange = (role: UserRole) => {
    setCreateForm({ ...createForm, role });
    if (!createForm.customPermissions) {
      setSelectedPermissions(ROLE_PERMISSIONS[role]);
    }
  };

  const toggleCustomPermissions = () => {
    const newCustom = !createForm.customPermissions;
    setCreateForm({ ...createForm, customPermissions: newCustom });

    if (!newCustom) {
      setSelectedPermissions(ROLE_PERMISSIONS[createForm.role]);
    }
  };

  const updatePermission = (
    pageIndex: number,
    action: keyof Permission["actions"],
    value: boolean,
  ) => {
    const updatedPermissions = [...selectedPermissions];
    if (!updatedPermissions[pageIndex]) {
      updatedPermissions[pageIndex] = {
        page: Object.values(PAGES)[pageIndex],
        actions: {},
      };
    }
    updatedPermissions[pageIndex].actions[action] = value;
    setSelectedPermissions(updatedPermissions);
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await db.collection("companyUsers").doc(userId).update({
        isActive: !currentStatus,
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Failed to update user status");
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (
      !window.confirm(
        `Are you sure you want to remove ${userEmail} from your company?`,
      )
    ) {
      return;
    }

    const userToDelete = users.find((u) => u.id === userId);

    try {
      await db.collection("companyUsers").doc(userId).delete();

      // Log user deletion activity
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

      // Auto refresh data after successful deletion
      await loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to remove user");
    }
  };

  // Edit user functions
  const openEditModal = (userToEdit: CompanyUser) => {
    setEditingUser(userToEdit);
    setEditForm({
      role: userToEdit.role,
      customPermissions:
        userToEdit.permissions &&
        userToEdit.permissions.length > 0 &&
        JSON.stringify(userToEdit.permissions) !==
          JSON.stringify(ROLE_PERMISSIONS[userToEdit.role]),
    });
    setEditSelectedPermissions(
      userToEdit.permissions || ROLE_PERMISSIONS[userToEdit.role],
    );
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
    setEditForm({ role: "viewer", customPermissions: false });
    setEditSelectedPermissions([]);
  };

  const handleEditRoleChange = (role: UserRole) => {
    setEditForm({ ...editForm, role });
    if (!editForm.customPermissions) {
      setEditSelectedPermissions(ROLE_PERMISSIONS[role]);
    }
  };

  const toggleEditCustomPermissions = () => {
    const newCustomPermissions = !editForm.customPermissions;
    setEditForm({ ...editForm, customPermissions: newCustomPermissions });
    if (!newCustomPermissions) {
      setEditSelectedPermissions(ROLE_PERMISSIONS[editForm.role]);
    }
  };

  const updateEditPermission = (
    pageIndex: number,
    action: keyof Permission["actions"],
    value: boolean,
  ) => {
    const newPermissions = [...editSelectedPermissions];
    newPermissions[pageIndex] = {
      ...newPermissions[pageIndex],
      actions: {
        ...newPermissions[pageIndex].actions,
        [action]: value,
      },
    };
    setEditSelectedPermissions(newPermissions);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const permissions = editForm.customPermissions
        ? editSelectedPermissions
        : ROLE_PERMISSIONS[editForm.role];

      // Update company user record
      await db.collection("companyUsers").doc(editingUser.id).update({
        role: editForm.role,
        permissions: permissions,
      });

      // Update user profile in users collection
      await db.collection("users").doc(editingUser.uid).update({
        role: editForm.role,
        permissions: permissions,
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
            permissions: permissions,
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

  const handleDirectLogin = async (targetUser: CompanyUser) => {
    try {
      // Store current admin info
      const currentAdminEmail = user?.email;
      const currentAdminUid = user?.uid;

      // Get user data from users collection
      const userDoc = await db.collection("users").doc(targetUser.uid).get();
      const userData = userDoc.data();

      if (!userData) {
        alert("User data not found. This user may need to be recreated.");
        return;
      }

      // If user has Firebase auth, try to login with Firebase
      if (userData.tempPassword) {
        // This is for users created through our system
        try {
          // Create Firebase user if doesn't exist
          await firebaseAuth.createUserWithEmailAndPassword(
            targetUser.email,
            userData.tempPassword,
          );
        } catch (createError: any) {
          // If user already exists, try to sign in
          if (createError.code === "auth/email-already-in-use") {
            await firebaseAuth.signInWithEmailAndPassword(
              targetUser.email,
              userData.tempPassword,
            );
          } else {
            throw createError;
          }
        }

        // Open dashboard in new tab
        setTimeout(() => {
          window.open(
            `${window.location.origin}${window.location.pathname}#/`,
            "_blank",
          );

          // Restore admin session after a delay
          setTimeout(async () => {
            if (currentAdminEmail) {
              // Get admin user data
              const adminDoc = await db
                .collection("users")
                .doc(currentAdminUid!)
                .get();
              const adminData = adminDoc.data();

              if (adminData?.tempPassword) {
                await firebaseAuth.signInWithEmailAndPassword(
                  currentAdminEmail,
                  adminData.tempPassword,
                );
              }
            }
          }, 2000);
        }, 1000);
      } else {
        // For legacy users, just open login page with pre-filled email
        const loginUrl = `${window.location.origin}${window.location.pathname}#/login?email=${encodeURIComponent(targetUser.email)}`;
        window.open(loginUrl, "_blank");
      }
    } catch (error: any) {
      console.error("Direct login failed:", error);
      alert("Failed to login as user: " + error.message);
    }
  };

  if (!isOwner && !isAdmin) {
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          User Management
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => loadUsers()}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            {loading ? "Loading..." : "Refresh"}
          </button>
          {canCreate(PAGES.USER_MANAGEMENT) && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Create User
            </button>
          )}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Invited Date</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.displayName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === "owner"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100"
                            : user.role === "admin"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                              : user.role === "manager"
                                ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                                : user.role === "editor"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                        }`}
                      >
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                            : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.createdAt?.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDirectLogin(user)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-800 dark:text-green-200 dark:border-green-600 dark:hover:bg-green-700"
                          title="Login as this user"
                        >
                          <svg
                            className="w-3 h-3 mr-1"
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
                          Login As
                        </button>
                        {canEdit(PAGES.USER_MANAGEMENT) &&
                          user.role !== "owner" && (
                            <button
                              onClick={() => openEditModal(user)}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-800 dark:text-blue-200 dark:border-blue-600 dark:hover:bg-blue-700"
                            >
                              <svg
                                className="w-3 h-3 mr-1"
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
                              Edit
                            </button>
                          )}
                        {canEdit(PAGES.USER_MANAGEMENT) && (
                          <button
                            onClick={() =>
                              toggleUserStatus(user.id, user.isActive)
                            }
                            className={`inline-flex items-center px-3 py-1 text-xs font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              user.isActive
                                ? "text-red-700 bg-red-100 border-red-300 hover:bg-red-200 focus:ring-red-500 dark:bg-red-800 dark:text-red-200 dark:border-red-600 dark:hover:bg-red-700"
                                : "text-green-700 bg-green-100 border-green-300 hover:bg-green-200 focus:ring-green-500 dark:bg-green-800 dark:text-green-200 dark:border-green-600 dark:hover:bg-green-700"
                            }`}
                          >
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d={
                                  user.isActive
                                    ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636"
                                    : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                }
                              />
                            </svg>
                            {user.isActive ? "Deactivate" : "Activate"}
                          </button>
                        )}
                        {canDelete(PAGES.USER_MANAGEMENT) &&
                          user.role !== "owner" && (
                            <button
                              onClick={() => deleteUser(user.id, user.email)}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-800 dark:text-red-200 dark:border-red-600 dark:hover:bg-red-700"
                            >
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Remove
                            </button>
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
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {Object.entries(ROLE_DESCRIPTIONS).map(
                    ([role, description]) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)} -{" "}
                        {description}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={createForm.customPermissions}
                    onChange={toggleCustomPermissions}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Custom Permissions (Override role defaults)
                  </span>
                </label>
              </div>

              {createForm.customPermissions && (
                <div className="border rounded-md p-4 dark:border-gray-600">
                  <h4 className="font-medium mb-3 text-gray-800 dark:text-white">
                    Permission Settings
                  </h4>
                  <div className="space-y-3">
                    {Object.values(PAGES).map((page, pageIndex) => (
                      <div
                        key={page}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                          {page.replace("-", " ")}
                        </span>
                        <div className="flex space-x-3">
                          {["view", "create", "edit", "delete"].map(
                            (action) => (
                              <label
                                key={action}
                                className="flex items-center text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    selectedPermissions[pageIndex]?.actions?.[
                                      action as keyof Permission["actions"]
                                    ] || false
                                  }
                                  onChange={(e) =>
                                    updatePermission(
                                      pageIndex,
                                      action as keyof Permission["actions"],
                                      e.target.checked,
                                    )
                                  }
                                  className="mr-1"
                                />
                                {action}
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  onChange={(e) =>
                    handleEditRoleChange(e.target.value as UserRole)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Custom Permissions Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editCustomPermissions"
                  checked={editForm.customPermissions}
                  onChange={toggleEditCustomPermissions}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label
                  htmlFor="editCustomPermissions"
                  className="ml-2 text-sm text-gray-900 dark:text-gray-300"
                >
                  Custom Permissions
                </label>
              </div>

              {/* Custom Permissions Grid */}
              {editForm.customPermissions && (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Page Permissions
                  </h4>
                  <div className="space-y-3">
                    {editSelectedPermissions.map((permission, pageIndex) => (
                      <div
                        key={permission.page}
                        className="border-b border-gray-200 dark:border-gray-600 pb-3"
                      >
                        <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2 capitalize">
                          {permission.page.replace("-", " ")}
                        </h5>
                        <div className="grid grid-cols-5 gap-2">
                          {Object.entries(permission.actions).map(
                            ([action, enabled]) => (
                              <label
                                key={action}
                                className="flex items-center text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={enabled}
                                  onChange={(e) =>
                                    updateEditPermission(
                                      pageIndex,
                                      action as keyof Permission["actions"],
                                      e.target.checked,
                                    )
                                  }
                                  className="h-3 w-3 text-blue-600 border-gray-300 rounded mr-1"
                                />
                                <span className="text-gray-700 dark:text-gray-300 capitalize">
                                  {action}
                                </span>
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
    </div>
  );
};

export default UserManagementPage;
