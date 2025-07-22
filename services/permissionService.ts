import { db } from "./firebase";

export class PermissionService {
  /**
   * Load granular permissions for a user based on their assigned role
   */
  static async loadUserPermissions(userProfile: any): Promise<string[]> {
    if (!userProfile) return [];

    // Owner has all permissions
    if (userProfile.isOwner) {
      // Return all possible permissions for owners
      const { getAllPermissions } = await import("../config/permissions");
      return getAllPermissions();
    }

    // If user already has granular permissions directly, use them
    if (userProfile.granularPermissions && userProfile.granularPermissions.length > 0) {
      return userProfile.granularPermissions;
    }

    // If user has a role assigned, load permissions from the role
    if (userProfile.role && userProfile.role !== "custom") {
      try {
        const companyId = userProfile.isOwner ? userProfile.uid : userProfile.companyId;
        if (!companyId) return [];

        const rolesSnapshot = await db
          .collection("customRoles")
          .where("companyId", "==", companyId)
          .where("name", "==", userProfile.role)
          .get();

        if (!rolesSnapshot.empty) {
          const roleData = rolesSnapshot.docs[0].data();
          return roleData.granularPermissions || [];
        }
      } catch (error) {
        console.error("Error loading role permissions:", error);
      }
    }

    return [];
  }

  /**
   * Sync permissions between user profile and company user record
   */
  static async syncUserPermissions(userId: string, granularPermissions: string[]): Promise<void> {
    try {
      // Update main user record
      await db.collection("users").doc(userId).update({
        granularPermissions: granularPermissions,
      });

      // Find and update company user record
      const companyUsersSnapshot = await db
        .collection("companyUsers")
        .where("uid", "==", userId)
        .get();

      if (!companyUsersSnapshot.empty) {
        const companyUserDoc = companyUsersSnapshot.docs[0];
        await companyUserDoc.ref.update({
          granularPermissions: granularPermissions,
        });
      }
    } catch (error) {
      console.error("Error syncing user permissions:", error);
    }
  }
}
