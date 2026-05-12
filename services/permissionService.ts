import { db } from "./firebase";
import { ensurePerformanceHubWithContent } from "../config/permissions";

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

    /**
     * Custom role document is the source of truth when the user has a named role.
     * If we returned `users.granularPermissions` first, new toggles added in Role Management
     * would never apply until every user was re-saved manually — `users` kept a stale copy.
     */
    if (userProfile.role && userProfile.role !== "custom") {
      try {
        const companyId = userProfile.isOwner
          ? (userProfile.uid ?? "").trim()
          : (userProfile.companyId ?? "").trim();
        if (companyId) {
          const rolesSnapshot = await db
            .collection("customRoles")
            .where("companyId", "==", companyId)
            .where("name", "==", userProfile.role)
            .get();

          if (!rolesSnapshot.empty) {
            const roleData = rolesSnapshot.docs[0].data();
            return ensurePerformanceHubWithContent(roleData.granularPermissions || []);
          }
        }
      } catch (error) {
        console.error("Error loading role permissions:", error);
      }
    }

    if (userProfile.granularPermissions && userProfile.granularPermissions.length > 0) {
      return ensurePerformanceHubWithContent(userProfile.granularPermissions);
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
