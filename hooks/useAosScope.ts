import { useMemo } from "react";
import { useAuth } from "./useAuth";
import { resolveCompanyIdForUser } from "../services/companyId";
import type { AosActorScope, AosReadScope } from "../aos/application/types";

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

    return {
      readScope: { companyId },
      actorScope: { companyId, actorUserId: user.uid },
      companyId,
      isReady: true,
    };
  }, [user, userProfile]);
}
