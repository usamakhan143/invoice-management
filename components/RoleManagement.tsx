import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { usePermissions } from "../hooks/usePermissions";
import { db, Timestamp } from "../services/firebase";
import { ActivityLogger } from "../services/activityLogger";
import {
  PERMISSION_GROUPS,
  PERMISSION_CATEGORIES,
  GRANULAR_PERMISSIONS,
  PERMISSION_DESCRIPTIONS
} from "../config/permissions";
import Spinner from "./Spinner";

interface CustomRole {
  id: string;
  name: string;
  description: string;
  granularPermissions: string[]; // New granular permissions array
  companyId: string;
  isDefault: boolean;
  createdAt: any;
  createdBy: string;
  updatedAt?: any;
  updatedBy?: string;
}

interface RoleManagementProps {
  onRoleCreated?: () => void;
  onRoleUpdated?: () => void;
}

const RoleManagement: React.FC<RoleManagementProps> = ({
  onRoleCreated,
  onRoleUpdated,
}) => {
  const { user, userProfile } = useAuth();
  const { canCreateCustomRole, canEditCustomRole, canDeleteCustomRole } = usePermissions();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [error, setError] = useState("");

  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    granularPermissions: [] as string[],
  });

  const loadRoles = async () => {
    if (!user || !userProfile) return;

    setLoading(true);
    try {
      const companyId = userProfile.isOwner ? user.uid : userProfile.companyId;

      if (!companyId) {
        setLoading(false);
        return;
      }

      const rolesSnapshot = await db
        .collection("customRoles")
        .where("companyId", "==", companyId)
        .orderBy("createdAt", "desc")
        .get();

      const rolesData = rolesSnapshot.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
        }) as CustomRole,
      );

      setRoles(rolesData);
    } catch (error) {
      console.error("Error loading roles:", error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, [user, userProfile]);

  const initializePermissions = () => {
    // Return empty array - permissions will be selected individually
    return [];
  };

  const openModal = (role?: CustomRole) => {
    if (role) {
      setEditingRole(role);
      setRoleForm({
        name: role.name,
        description: role.description,
        granularPermissions: role.granularPermissions || [],
      });
    } else {
      setEditingRole(null);
      setRoleForm({
        name: "",
        description: "",
        granularPermissions: [],
      });
    }
    setIsModalOpen(true);
    setError("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    setRoleForm({
      name: "",
      description: "",
      granularPermissions: [],
    });
    setError("");
  };

  const togglePermission = (permission: string) => {
    const updatedPermissions = [...roleForm.granularPermissions];
    const index = updatedPermissions.indexOf(permission);

    if (index > -1) {
      // Permission exists, remove it
      updatedPermissions.splice(index, 1);
    } else {
      // Permission doesn't exist, add it
      updatedPermissions.push(permission);
    }

    setRoleForm({ ...roleForm, granularPermissions: updatedPermissions });
  };

  const handleSaveRole = async () => {
    if (!user || !userProfile) return;

    if (!roleForm.name.trim()) {
      setError("Role name is required");
      return;
    }

    try {
      setError("");
      const companyId = userProfile.isOwner ? user.uid : userProfile.companyId;

      if (!companyId) {
        setError("Company ID not found");
        return;
      }

      const roleData = {
        name: roleForm.name.trim(),
        description: roleForm.description.trim(),
        granularPermissions: roleForm.granularPermissions,
        companyId,
        isDefault: false,
        ...(editingRole
          ? {
              updatedAt: Timestamp.now(),
              updatedBy: userProfile.displayName || userProfile.companyName || user.email,
            }
          : {
              createdAt: Timestamp.now(),
              createdBy: userProfile.displayName || userProfile.companyName || user.email,
            }),
      };

      if (editingRole) {
        // Update existing role
        await db.collection("customRoles").doc(editingRole.id).update(roleData);

        await ActivityLogger.logActivity(
          user,
          userProfile,
          "user_updated",
          `Updated custom role: ${roleForm.name}`,
          {
            entityId: editingRole.id,
            entityType: "role",
            newValue: roleData,
          },
        );

        onRoleUpdated?.();
      } else {
        // Create new role
        await db.collection("customRoles").add(roleData);

        await ActivityLogger.logActivity(
          user,
          userProfile,
          "user_created",
          `Created custom role: ${roleForm.name}`,
          {
            entityType: "role",
            newValue: roleData,
          },
        );

        onRoleCreated?.();
      }

      closeModal();
      loadRoles();
    } catch (error) {
      console.error("Error saving role:", error);
      setError("Failed to save role. Please try again.");
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!user || !userProfile) return;

    if (
      !window.confirm(
        `Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await db.collection("customRoles").doc(roleId).delete();

      await ActivityLogger.logActivity(
        user,
        userProfile,
        "user_deleted",
        `Deleted custom role: ${roleName}`,
        {
          entityId: roleId,
          entityType: "role",
        },
      );

      loadRoles();
    } catch (error) {
      console.error("Error deleting role:", error);
      alert("Failed to delete role. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
          Custom Roles
        </h2>
        <div className="button-group">
          {canCreateCustomRole() && (
            <button
              onClick={() => openModal()}
              className="mobile-btn px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 whitespace-nowrap"
            >
              Create Custom Role
            </button>
          )}
        </div>
      </div>

      {/* Roles List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Role Name
                </th>
                <th scope="col" className="px-6 py-3">
                  Description
                </th>
                <th scope="col" className="px-6 py-3">
                  Permissions Count
                </th>
                <th scope="col" className="px-6 py-3">
                  Created By
                </th>
                <th scope="col" className="px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="text-4xl mb-4">👥</div>
                    <p className="text-gray-600 dark:text-gray-300">
                      No custom roles found. Create your first custom role to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr
                    key={role.id}
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {role.name}
                    </td>
                    <td className="px-6 py-4">
                      {role.description || "No description"}
                    </td>
                    <td className="px-6 py-4">
                      {role.granularPermissions?.length || 0} permissions
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 dark:text-white">
                          {role.createdBy}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {role.createdAt?.toDate?.()?.toLocaleDateString() || ""}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {canEditCustomRole() && (
                          <button
                            onClick={() => openModal(role)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          >
                            Edit
                          </button>
                        )}
                        {canDeleteCustomRole() && !role.isDefault && (
                          <button
                            onClick={() => handleDeleteRole(role.id, role.name)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                          >
                            Delete
                          </button>
                        )}
                        {!canEditCustomRole() && !canDeleteCustomRole() && (
                          <span className="text-gray-400 text-sm">No actions available</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Creation/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editingRole ? "Edit Custom Role" : "Create Custom Role"}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role Name
                </label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, name: e.target.value })
                  }
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter role name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={roleForm.description}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, description: e.target.value })
                  }
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter role description"
                  rows={2}
                />
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                  Permissions
                </h4>
                <div className="space-y-6">
                  {Object.entries(PERMISSION_GROUPS).map(([category, permissions]) => (
                    <div
                      key={category}
                      className="border rounded-lg p-4 dark:border-gray-600"
                    >
                      <h5 className="font-medium text-gray-800 dark:text-white mb-3">
                        {category
                          .replace("-", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())} Permissions
                      </h5>
                      <div className="space-y-2">
                        {permissions.map((permission) => (
                          <label
                            key={permission}
                            className="flex items-start space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={roleForm.granularPermissions.includes(permission)}
                              onChange={() => togglePermission(permission)}
                              className="mt-1 rounded"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {permission.split('_').map(word =>
                                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                ).join(' ')}
                              </span>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {PERMISSION_DESCRIPTIONS[permission] || "No description available"}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                {editingRole ? "Update Role" : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
