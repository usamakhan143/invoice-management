import { db } from "./firebase";
import type { UserProfile } from "../types";

export class RealTimePermissionService {
  private static roleUnsubscribe: (() => void) | null = null;
  private static companyUserUnsubscribe: (() => void) | null = null;

  /** Survives listener detach/re-attach so Dashboard re-runs don’t re-process the same payload. */
  private static lastCompanyUserKeyByUid = new Map<string, string>();
  private static lastRolePermissionsJsonByUid = new Map<string, string>();
  /** Uid currently “owning” the dedupe maps; change clears maps (different user). */
  private static listenerDedupeUid: string | null = null;

  private static detachListenersOnly(): void {
    if (this.roleUnsubscribe) {
      this.roleUnsubscribe();
      this.roleUnsubscribe = null;
    }
    if (this.companyUserUnsubscribe) {
      this.companyUserUnsubscribe();
      this.companyUserUnsubscribe = null;
    }
  }

  /**
   * Set up real-time listeners for permission changes
   */
  static setupPermissionListeners(
    userProfile: UserProfile,
    onPermissionUpdate: (updatedProfile: UserProfile) => void,
  ) {
    // Don't set up listeners for owners - they have all permissions
    if (userProfile.isOwner) {
      this.detachListenersOnly();
      return;
    }

    const companyId = userProfile.companyId;
    if (!companyId) {
      this.detachListenersOnly();
      return;
    }

    const uid = userProfile.uid;
    if (this.listenerDedupeUid !== uid) {
      this.lastCompanyUserKeyByUid.clear();
      this.lastRolePermissionsJsonByUid.clear();
      this.listenerDedupeUid = uid;
    }

    // Re-subscribe without clearing dedupe maps (same uid) — avoids infinite loops when
    // parent effects depend on userProfile and call setup after every setUserProfile.
    this.detachListenersOnly();

    // 1. Listen for changes to company user record
    this.companyUserUnsubscribe = db
      .collection("companyUsers")
      .where("uid", "==", uid)
      .onSnapshot(async (snapshot) => {
        if (snapshot.empty) return;
        const companyUserData = snapshot.docs[0].data();
        const key = JSON.stringify({
          role: companyUserData.role ?? "",
          perms: companyUserData.granularPermissions || [],
        });
        if (this.lastCompanyUserKeyByUid.get(uid) === key) {
          return;
        }
        this.lastCompanyUserKeyByUid.set(uid, key);

        const updatedProfile: UserProfile = {
          ...userProfile,
          role: companyUserData.role,
          granularPermissions: companyUserData.granularPermissions || [],
        };

        try {
          await db.collection("users").doc(uid).update({
            role: companyUserData.role,
            granularPermissions: companyUserData.granularPermissions || [],
          });
        } catch (error) {
          console.error("Error syncing user document:", error);
        }

        onPermissionUpdate(updatedProfile);
      });

    // 2. Listen for changes to the user's assigned role
    if (userProfile.role && userProfile.role !== "custom") {
      this.roleUnsubscribe = db
        .collection("customRoles")
        .where("companyId", "==", companyId)
        .where("name", "==", userProfile.role)
        .onSnapshot(async (snapshot) => {
          if (snapshot.empty) return;
          const roleData = snapshot.docs[0].data();
          const newPermissions = roleData.granularPermissions || [];
          const nextJson = JSON.stringify({
            role: userProfile.role ?? "",
            perms: newPermissions,
          });
          if (this.lastRolePermissionsJsonByUid.get(uid) === nextJson) {
            return;
          }
          this.lastRolePermissionsJsonByUid.set(uid, nextJson);

          const updatedProfile: UserProfile = {
            ...userProfile,
            granularPermissions: newPermissions,
          };

          try {
            await Promise.all([
              db.collection("users").doc(uid).update({
                granularPermissions: newPermissions,
              }),
              db
                .collection("companyUsers")
                .where("uid", "==", uid)
                .get()
                .then((cuSnap) => {
                  if (!cuSnap.empty) {
                    return cuSnap.docs[0].ref.update({
                      granularPermissions: newPermissions,
                    });
                  }
                }),
            ]);
          } catch (error) {
            console.error("Error syncing role permissions:", error);
          }

          onPermissionUpdate(updatedProfile);
        });
    }
  }

  /**
   * Full teardown (e.g. sign-out): detach listeners and drop dedupe state.
   */
  static cleanup(): void {
    this.detachListenersOnly();
    this.listenerDedupeUid = null;
    this.lastCompanyUserKeyByUid.clear();
    this.lastRolePermissionsJsonByUid.clear();
  }
}
