import { db } from "./firebase";
import type { UserProfile } from "../types";

export class RealTimePermissionService {
  private static roleUnsubscribe: (() => void) | null = null;
  private static companyUserUnsubscribe: (() => void) | null = null;

  /**
   * Set up real-time listeners for permission changes
   */
  static setupPermissionListeners(
    userProfile: UserProfile,
    onPermissionUpdate: (updatedProfile: UserProfile) => void
  ) {
    // Clean up existing listeners
    this.cleanup();

    // Don't set up listeners for owners - they have all permissions
    if (userProfile.isOwner) {
      return;
    }

    const companyId = userProfile.companyId;
    if (!companyId) {
      return;
    }

    // 1. Listen for changes to company user record
    this.companyUserUnsubscribe = db
      .collection("companyUsers")
      .where("uid", "==", userProfile.uid)
      .onSnapshot(async (snapshot) => {
        if (!snapshot.empty) {
          const companyUserData = snapshot.docs[0].data();
          
          // Check if role or permissions changed
          if (companyUserData.role !== userProfile.role || 
              JSON.stringify(companyUserData.granularPermissions || []) !== 
              JSON.stringify(userProfile.granularPermissions || [])) {
            
            console.log("Real-time permission update detected");
            
            const updatedProfile = {
              ...userProfile,
              role: companyUserData.role,
              granularPermissions: companyUserData.granularPermissions || [],
            };

            // Update main user document
            try {
              await db.collection("users").doc(userProfile.uid).update({
                role: companyUserData.role,
                granularPermissions: companyUserData.granularPermissions || []
              });
            } catch (error) {
              console.error("Error syncing user document:", error);
            }

            // Notify the auth hook of the change
            onPermissionUpdate(updatedProfile);
          }
        }
      });

    // 2. Listen for changes to the user's assigned role
    if (userProfile.role && userProfile.role !== "custom") {
      this.roleUnsubscribe = db
        .collection("customRoles")
        .where("companyId", "==", companyId)
        .where("name", "==", userProfile.role)
        .onSnapshot(async (snapshot) => {
          if (!snapshot.empty) {
            const roleData = snapshot.docs[0].data();
            const newPermissions = roleData.granularPermissions || [];
            
            // Check if role permissions changed
            if (JSON.stringify(userProfile.granularPermissions || []) !== 
                JSON.stringify(newPermissions)) {
              
              console.log("Role permissions updated in real-time");
              
              const updatedProfile = {
                ...userProfile,
                granularPermissions: newPermissions
              };

              // Update both user documents
              try {
                await Promise.all([
                  db.collection("users").doc(userProfile.uid).update({
                    granularPermissions: newPermissions
                  }),
                  db.collection("companyUsers").where("uid", "==", userProfile.uid).get()
                    .then(snapshot => {
                      if (!snapshot.empty) {
                        return snapshot.docs[0].ref.update({
                          granularPermissions: newPermissions
                        });
                      }
                    })
                ]);
              } catch (error) {
                console.error("Error syncing role permissions:", error);
              }

              // Notify the auth hook of the change
              onPermissionUpdate(updatedProfile);
            }
          }
        });
    }
  }

  /**
   * Clean up all real-time listeners
   */
  static cleanup() {
    if (this.roleUnsubscribe) {
      this.roleUnsubscribe();
      this.roleUnsubscribe = null;
    }
    if (this.companyUserUnsubscribe) {
      this.companyUserUnsubscribe();
      this.companyUserUnsubscribe = null;
    }
  }
}
