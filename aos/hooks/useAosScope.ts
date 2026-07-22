import { useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { resolveCompanyIdForUser } from "../../services/companyId";
import { ALL_AOS_PERMISSION_KEYS } from "../constants/actorScope";
import type { AosActorScope, AosReadScope } from "../application/types";

export function useAosScope(): {
  readScope: AosReadScope | null;
  actorScope: AosActorScope | null;
  companyId: string;
  isReady: boolean;
} {
  const { user, userProfile } = useAuth();

  return useMemo(() => {
    if (!user) {
      return { readScope: null, actorScope: null, companyId: "", isReady: false };
    }

    const companyId = resolveCompanyIdForUser(user, userProfile);
    if (!companyId) {
      return { readScope: null, actorScope: null, companyId: "", isReady: false };
    }

    const isOwner = userProfile?.isOwner === true;
    const permissions = isOwner
      ? ALL_AOS_PERMISSION_KEYS
      : (userProfile?.granularPermissions ?? []);

    return {
      readScope: { companyId },
      actorScope: { companyId, actorUserId: user.uid, permissions, isOwner },
      companyId,
      isReady: true,
    };
  }, [user, userProfile]);
}
