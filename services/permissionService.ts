import { db } from "./firebase";
import { ensurePerformanceHubWithContent } from "../config/permissions";
import { normalizeRestrictedBankAccountIds } from "../utils/bankAccountAccess";

export interface UserAccessSettings {
  granularPermissions: string[];
  restrictedBankAccountIds: string[];
}

export class PermissionService {
  /**
   * Load granular permissions and bank-account restrictions from role (or user profile).
   */
  static async loadUserAccessSettings(
    userProfile: {
      isOwner?: boolean;
      uid?: string;
      companyId?: string;
      role?: string;
      granularPermissions?: string[];
      restrictedBankAccountIds?: string[];
    } | null,
  ): Promise<UserAccessSettings> {
    if (!userProfile) {
      return { granularPermissions: [], restrictedBankAccountIds: [] };
    }

    if (userProfile.isOwner) {
      const { getAllPermissions } = await import("../config/permissions");
      return {
        granularPermissions: getAllPermissions(),
        restrictedBankAccountIds: [],
      };
    }

    if (userProfile.role && userProfile.role !== "custom") {
      try {
        const companyId = (userProfile.companyId ?? "").trim();
        if (companyId) {
          const rolesSnapshot = await db
            .collection("customRoles")
            .where("companyId", "==", companyId)
            .where("name", "==", userProfile.role)
            .get();

          if (!rolesSnapshot.empty) {
            const roleData = rolesSnapshot.docs[0].data();
            return {
              granularPermissions: ensurePerformanceHubWithContent(
                roleData.granularPermissions || [],
              ),
              restrictedBankAccountIds: normalizeRestrictedBankAccountIds(
                roleData.restrictedBankAccountIds,
              ),
            };
          }
        }
      } catch (error) {
        console.error("Error loading role access settings:", error);
      }
    }

    return {
      granularPermissions: ensurePerformanceHubWithContent(
        userProfile.granularPermissions || [],
      ),
      restrictedBankAccountIds: normalizeRestrictedBankAccountIds(
        userProfile.restrictedBankAccountIds,
      ),
    };
  }

  /**
   * Load granular permissions for a user based on their assigned role
   */
  static async loadUserPermissions(userProfile: unknown): Promise<string[]> {
    const settings = await this.loadUserAccessSettings(
      userProfile as Parameters<typeof this.loadUserAccessSettings>[0],
    );
    return settings.granularPermissions;
  }

  /**
   * Sync permissions and bank restrictions to user + companyUsers records.
   */
  static async syncUserAccessSettings(
    userId: string,
    settings: UserAccessSettings,
  ): Promise<void> {
    try {
      await db.collection("users").doc(userId).update({
        granularPermissions: settings.granularPermissions,
        restrictedBankAccountIds: settings.restrictedBankAccountIds,
      });

      const companyUsersSnapshot = await db
        .collection("companyUsers")
        .where("uid", "==", userId)
        .get();

      if (!companyUsersSnapshot.empty) {
        await companyUsersSnapshot.docs[0].ref.update({
          granularPermissions: settings.granularPermissions,
          restrictedBankAccountIds: settings.restrictedBankAccountIds,
        });
      }
    } catch (error) {
      console.error("Error syncing user access settings:", error);
    }
  }

  /** Updates granular permissions only (does not change bank account restrictions). */
  static async syncUserPermissions(
    userId: string,
    granularPermissions: string[],
  ): Promise<void> {
    try {
      await db.collection("users").doc(userId).update({ granularPermissions });

      const companyUsersSnapshot = await db
        .collection("companyUsers")
        .where("uid", "==", userId)
        .get();

      if (!companyUsersSnapshot.empty) {
        await companyUsersSnapshot.docs[0].ref.update({ granularPermissions });
      }
    } catch (error) {
      console.error("Error syncing user permissions:", error);
    }
  }

  /** Load role settings from Firestore and persist to user if changed. */
  static async hydrateUserAccess(
    userData: {
      uid: string;
      isOwner?: boolean;
      companyId?: string;
      role?: string;
      granularPermissions?: string[];
      restrictedBankAccountIds?: string[];
    },
  ): Promise<UserAccessSettings> {
    const access = await this.loadUserAccessSettings(userData);
    const permsChanged =
      JSON.stringify(userData.granularPermissions || []) !==
      JSON.stringify(access.granularPermissions);
    const banksChanged =
      JSON.stringify(userData.restrictedBankAccountIds || []) !==
      JSON.stringify(access.restrictedBankAccountIds);
    if (permsChanged || banksChanged) {
      await this.syncUserAccessSettings(userData.uid, access);
    }
    return access;
  }
}
