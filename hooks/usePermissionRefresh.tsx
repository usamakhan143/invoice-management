import { useAuth } from "./useAuth";
import { PermissionService } from "../services/permissionService";
import { RealTimePermissionService } from "../services/realTimePermissionService";

export const usePermissionRefresh = () => {
  const { user, userProfile, setUserProfile } = useAuth();

  const refreshPermissions = async () => {
    if (!user || !userProfile) return;

    try {


      // Load fresh permissions from role
      const granularPermissions = await PermissionService.loadUserPermissions(userProfile);

      // Update user profile
      const updatedProfile = {
        ...userProfile,
        granularPermissions: granularPermissions
      };

      // Sync to database
      await PermissionService.syncUserPermissions(userProfile.uid, granularPermissions);

      // Update local state
      setUserProfile(updatedProfile);


    } catch (error) {
      console.error("Error refreshing permissions:", error);
    }
  };

  const setupRealTimeListeners = () => {
    if (!userProfile) return;

    RealTimePermissionService.setupPermissionListeners(
      userProfile,
      (updatedProfile) => {

        setUserProfile(updatedProfile);
      }
    );
  };

  return {
    refreshPermissions,
    setupRealTimeListeners
  };
};
