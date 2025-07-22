import { useAuth } from "./useAuth";
import { PermissionService } from "../services/permissionService";
import { RealTimePermissionService } from "../services/realTimePermissionService";

export const usePermissionRefresh = () => {
  const { user, userProfile, setUserProfile } = useAuth();

  const refreshPermissions = async () => {
    if (!user || !userProfile) return;

    try {
      console.log("Manually refreshing permissions...");
      
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
      
      console.log("Permissions refreshed successfully");
    } catch (error) {
      console.error("Error refreshing permissions:", error);
    }
  };

  const setupRealTimeListeners = () => {
    if (!userProfile) return;
    
    RealTimePermissionService.setupPermissionListeners(
      userProfile,
      (updatedProfile) => {
        console.log("Real-time permission update received");
        setUserProfile(updatedProfile);
      }
    );
  };

  return {
    refreshPermissions,
    setupRealTimeListeners
  };
};
