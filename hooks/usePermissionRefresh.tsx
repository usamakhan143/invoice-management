import { useAuth } from "./useAuth";
import { PermissionService } from "../services/permissionService";
import { RealTimePermissionService } from "../services/realTimePermissionService";

export const usePermissionRefresh = () => {
  const { user, userProfile, setUserProfile } = useAuth();

  const refreshPermissions = async () => {
    if (!user || !userProfile) return;

    try {


      const access = await PermissionService.loadUserAccessSettings(userProfile);

      const updatedProfile = {
        ...userProfile,
        granularPermissions: access.granularPermissions,
        restrictedBankAccountIds: access.restrictedBankAccountIds,
      };

      await PermissionService.syncUserAccessSettings(userProfile.uid, access);

      setUserProfile(updatedProfile);


    } catch (error) {
      console.error("Error refreshing permissions:", error);
    }
  };

  const setupRealTimeListeners = () => {
    if (!userProfile) return;

    RealTimePermissionService.setupPermissionListeners(userProfile, (updatedProfile) => {
      setUserProfile((prev) => {
        if (!prev) return updatedProfile;
        const nextRole = updatedProfile.role ?? prev.role;
        const nextPerms = updatedProfile.granularPermissions ?? prev.granularPermissions ?? [];
        const prevPerms = prev.granularPermissions ?? [];
        const nextBanks =
          updatedProfile.restrictedBankAccountIds ?? prev.restrictedBankAccountIds ?? [];
        const prevBanks = prev.restrictedBankAccountIds ?? [];
        if (
          prev.role === nextRole &&
          JSON.stringify(prevPerms) === JSON.stringify(nextPerms) &&
          JSON.stringify(prevBanks) === JSON.stringify(nextBanks)
        ) {
          return prev;
        }
        return {
          ...prev,
          role: nextRole,
          granularPermissions: nextPerms,
          restrictedBankAccountIds: nextBanks,
        };
      });
    });
  };

  return {
    refreshPermissions,
    setupRealTimeListeners
  };
};
