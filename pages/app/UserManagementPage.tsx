import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePermissions } from "../../hooks/usePermissions";
import { db, auth as firebaseAuth, Timestamp } from "../../services/firebase";
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

      // Change from onSnapshot to get() to avoid index issues
      const snapshot = await db
        .collection("companyUsers")
        .where("companyId", "==", companyId)
        .get(); // Removed .orderBy("createdAt", "desc") to avoid index requirement

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
      setLoading(false);
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [user, userProfile]);

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

      // Create Firebase user first
      const newUserCredential =
        await firebaseAuth.createUserWithEmailAndPassword(
          createForm.email,
          createForm.password,
        );
      const newFirebaseUser = newUserCredential.user;

      if (!newFirebaseUser) {
        throw new Error("Failed to create user account");
      }

      // Create user profile in users collection
      await db.collection("users").doc(newFirebaseUser.uid).set({
        uid: newFirebaseUser.uid,
        email: createForm.email,
        companyName: userProfile.companyName,
        createdAt: Timestamp.now(),
        invoiceCounter: 0,
        role: createForm.role,
        isOwner: false,
        companyId: companyId,
        permissions: permissions,
        isActive: true,
      });

      // Create company user record
      await db.collection("companyUsers").add({
        uid: newFirebaseUser.uid,
        email: createForm.email,
        displayName: createForm.displayName,
        role: createForm.role,
        permissions,
        isActive: true,
        companyId,
        invitedBy: user.uid,
        createdAt: Timestamp.now(),
      });

      setIsCreateModalOpen(false);
      resetCreateForm();

      alert(`User ${createForm.email} created successfully!`);
    } catch (error: any) {
      setError(error.message);
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

    try {
      await db.collection("companyUsers").doc(userId).delete();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to remove user");
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium">Total Users</h3>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium">Active Users</h3>
          <p className="text-2xl font-bold">
            {users.filter((u) => u.isActive).length}
          </p>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium">Admins</h3>
          <p className="text-2xl font-bold">
            {
              users.filter((u) => u.role === "admin" || u.role === "owner")
                .length
            }
          </p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium">Viewers</h3>
          <p className="text-2xl font-bold">
            {users.filter((u) => u.role === "viewer").length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Team Members ({users.length})
          </h2>
        </div>

        {users.length === 0 ? (
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
                {users.map((user) => (
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
                    <td className="px-6 py-4 flex space-x-2">
                      {canEdit(PAGES.USER_MANAGEMENT) && (
                        <button
                          onClick={() =>
                            toggleUserStatus(user.id, user.isActive)
                          }
                          className={`text-sm px-2 py-1 rounded ${
                            user.isActive
                              ? "text-red-600 hover:text-red-800"
                              : "text-green-600 hover:text-green-800"
                          }`}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                      {canDelete(PAGES.USER_MANAGEMENT) &&
                        user.role !== "owner" && (
                          <button
                            onClick={() => deleteUser(user.id, user.email)}
                            className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded"
                          >
                            Remove
                          </button>
                        )}
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
    </div>
  );
};

export default UserManagementPage;
